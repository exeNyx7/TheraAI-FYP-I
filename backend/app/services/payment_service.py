"""
Payment Service for TheraAI Freemium Model
Handles Stripe integration, subscription management, and session booking logic.

Booking priority:
  1. Free intro (15 min, patient's first-ever session)
  2. Subscription sessions remaining → deduct 1
  3. Pay-per-session via Stripe Checkout
"""
import asyncio
import json
import logging
import random
import string
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import HTTPException, status
from bson import ObjectId

from ..database import get_database
from ..config import get_settings

logger = logging.getLogger(__name__)

# Per-session base rates (PKR) keyed by therapist email — fallback for seeded accounts
_THERAPIST_RATE_BY_EMAIL = {
    "dr.ayesha.khan@theraai.com": 2800,
    "dr.bilal.chaudhry@theraai.com": 2500,
    "dr.usman.sheikh@theraai.com": 2200,
    "dr.sana.mirza@theraai.com": 1800,
}

DURATION_MULTIPLIERS = {15: 1.0, 25: 1.6, 30: 2.0}

PLAN_SESSION_COUNTS = {"starter": 2, "professional": 4, "intensive": 8}

PLAN_PRICE_ENV = {
    "starter": "stripe_price_starter",
    "professional": "stripe_price_professional",
    "intensive": "stripe_price_intensive",
}


def _require_stripe():
    """Return the configured stripe module or raise 503."""
    try:
        import stripe as _stripe
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe library not installed. Run: pip install stripe>=9.0.0",
        )
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe not configured. Set STRIPE_SECRET_KEY in your .env file.",
        )
    _stripe.api_key = settings.stripe_secret_key
    return _stripe


class PaymentService:

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def get_user_plan(user_id: str) -> dict:
        db = await get_database()
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "tier": user.get("subscription_tier", "free"),
            "status": user.get("subscription_status", "inactive"),
            "sessions_remaining": user.get("sessions_remaining", 0),
            "sessions_used_total": user.get("sessions_used_total", 0),
            "renews_at": user.get("subscription_renews_at"),
            "free_intro_used": user.get("free_intro_used", False),
        }

    @staticmethod
    async def get_therapist_base_rate(therapist_id: str) -> int:
        """Return the base session rate (PKR) for the given therapist."""
        db = await get_database()
        therapist = await db.users.find_one({"_id": ObjectId(therapist_id)})
        if therapist:
            email = therapist.get("email", "")
            if email in _THERAPIST_RATE_BY_EMAIL:
                return _THERAPIST_RATE_BY_EMAIL[email]
        profile = await db.therapist_profiles.find_one({"user_id": therapist_id})
        if profile and profile.get("hourly_rate"):
            return int(profile["hourly_rate"])
        return 2500  # sensible default

    @staticmethod
    def calculate_fee(base_rate: int, duration_minutes: int) -> int:
        multiplier = DURATION_MULTIPLIERS.get(duration_minutes, 1.6)
        return int(base_rate * multiplier)

    # ------------------------------------------------------------------
    # Core booking logic
    # ------------------------------------------------------------------

    @staticmethod
    async def book_session(
        user_id: str,
        therapist_id: str,
        scheduled_at: datetime,
        duration_minutes: int,
    ) -> dict:
        if duration_minutes not in DURATION_MULTIPLIERS:
            raise HTTPException(status_code=400, detail="duration_minutes must be 15, 25, or 30")

        db = await get_database()
        settings = get_settings()

        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        therapist = await db.users.find_one({
            "_id": ObjectId(therapist_id),
            "role": {"$in": ["psychiatrist", "therapist"]},
        })
        if not therapist:
            raise HTTPException(status_code=404, detail="Therapist not found")

        # Past booking guard — must be at least 1 hour from now
        if scheduled_at <= datetime.now(timezone.utc) + timedelta(hours=1):
            raise HTTPException(
                status_code=400,
                detail="Appointment must be booked at least 1 hour in advance.",
            )

        end_time = scheduled_at + timedelta(minutes=duration_minutes)

        # Therapist conflict check
        therapist_conflict = await db.appointments.find_one({
            "therapist_id": therapist_id,
            "status": {"$in": ["scheduled", "confirmed"]},
            "scheduled_at": {
                "$lt": end_time,
                "$gte": scheduled_at - timedelta(minutes=30),
            },
        })
        if therapist_conflict:
            raise HTTPException(status_code=409, detail="This time slot is not available.")

        # Patient double-booking check
        patient_conflict = await db.appointments.find_one({
            "patient_id": user_id,
            "status": {"$in": ["scheduled", "confirmed"]},
            "scheduled_at": {
                "$lt": end_time,
                "$gte": scheduled_at - timedelta(minutes=30),
            },
        })
        if patient_conflict:
            raise HTTPException(status_code=409, detail="You already have an appointment at this time.")

        base_rate = await PaymentService.get_therapist_base_rate(therapist_id)
        fee = PaymentService.calculate_fee(base_rate, duration_minutes)
        therapist_name = therapist.get("full_name", "Therapist")
        free_intro_used = user.get("free_intro_used", False)
        sessions_remaining = user.get("sessions_remaining", 0)

        # --- Case 1: Free intro ---
        if not free_intro_used and duration_minutes == 15:
            appt_id = await PaymentService._insert_appointment(
                db, user_id, therapist_id, scheduled_at, duration_minutes,
                payment_status="free", session_fee_pkr=0,
                patient_name=user.get("full_name"), therapist_name=therapist_name,
            )
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"free_intro_used": True}},
            )
            from .notification_service import create_notification
            await create_notification(
                db, user_id, "appointment_booked",
                "Free Intro Session Booked",
                f"Your 15-min intro session with {therapist_name} has been confirmed.",
                {"appointment_id": appt_id},
            )
            return {
                "confirmed": True,
                "appointment_id": appt_id,
                "message": "Free intro session booked!",
            }

        # --- Case 2: Subscription credit ---
        if sessions_remaining > 0:
            appt_id = await PaymentService._insert_appointment(
                db, user_id, therapist_id, scheduled_at, duration_minutes,
                payment_status="subscription_deducted", session_fee_pkr=0,
                patient_name=user.get("full_name"), therapist_name=therapist_name,
            )
            new_remaining = sessions_remaining - 1
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$inc": {"sessions_remaining": -1, "sessions_used_total": 1}},
            )
            from .notification_service import create_notification
            await create_notification(
                db, user_id, "appointment_booked",
                "Session Booked",
                f"Session with {therapist_name} confirmed. {new_remaining} subscription session(s) remaining.",
                {"appointment_id": appt_id, "sessions_remaining": new_remaining},
            )
            return {
                "confirmed": True,
                "appointment_id": appt_id,
                "message": f"Booked using subscription. {new_remaining} session(s) remaining.",
            }

        # --- Case 3: Stripe pay-per-session ---
        stripe = _require_stripe()

        appt_id = await PaymentService._insert_appointment(
            db, user_id, therapist_id, scheduled_at, duration_minutes,
            payment_status="pending", session_fee_pkr=fee,
            patient_name=user.get("full_name"), therapist_name=therapist_name,
        )

        customer_id = await PaymentService._get_or_create_customer(db, user_id, user, stripe)
        frontend_url = settings.frontend_url

        checkout = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "pkr",
                    # Stripe unit for PKR is paisa (1/100 PKR)
                    "unit_amount": fee * 100,
                    "product_data": {
                        "name": f"Therapy Session — {therapist_name} ({duration_minutes} min)",
                    },
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=(
                f"{frontend_url}/appointments"
                f"?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
            ),
            cancel_url=f"{frontend_url}/book/{therapist_id}?payment=cancelled",
            metadata={
                "type": "per_session",
                "user_id": user_id,
                "appointment_id": appt_id,
            },
        )

        await db.appointments.update_one(
            {"_id": ObjectId(appt_id)},
            {"$set": {"stripe_session_id": checkout.id}},
        )

        return {
            "confirmed": False,
            "checkout_url": checkout.url,
            "appointment_id": appt_id,
        }

    # ------------------------------------------------------------------
    # Subscription checkout
    # ------------------------------------------------------------------

    @staticmethod
    async def create_subscription_checkout(user_id: str, tier: str) -> dict:
        price_env_attr = PLAN_PRICE_ENV.get(tier)
        if not price_env_attr:
            raise HTTPException(status_code=400, detail=f"Invalid tier: {tier}")

        settings = get_settings()
        price_id = getattr(settings, price_env_attr, None)
        if not price_id:
            raise HTTPException(
                status_code=503,
                detail=f"Price ID not configured for {tier} plan. Set {price_env_attr.upper()} in .env.",
            )

        stripe = _require_stripe()
        db = await get_database()
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        customer_id = await PaymentService._get_or_create_customer(db, user_id, user, stripe)
        frontend_url = settings.frontend_url

        checkout = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=(
                f"{frontend_url}/subscription"
                f"?subscribed=true&session_id={{CHECKOUT_SESSION_ID}}"
            ),
            cancel_url=f"{frontend_url}/subscription?cancelled=true",
            metadata={"type": "subscription", "user_id": user_id, "tier": tier},
        )

        return {"checkout_url": checkout.url}

    # ------------------------------------------------------------------
    # Webhook handler
    # ------------------------------------------------------------------

    @staticmethod
    async def handle_webhook(payload: bytes, sig_header: Optional[str]) -> dict:
        settings = get_settings()

        if settings.stripe_webhook_secret and sig_header:
            stripe = _require_stripe()
            try:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, settings.stripe_webhook_secret
                )
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid webhook signature")
            event_type = event["type"]
            obj = event["data"]["object"]
        else:
            # Dev mode: parse without signature verification
            try:
                data = json.loads(payload)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid JSON payload")
            event_type = data.get("type", "")
            obj = data.get("data", {}).get("object", {})

        db = await get_database()

        try:
            await PaymentService._process_webhook_event(event_type, obj, db, settings)
        except Exception:
            logger.exception("Webhook processing error for event '%s'", event_type)
            # Always return 200 — Stripe must not retry due to our internal errors

        return {"received": True}

    @staticmethod
    async def _process_webhook_event(event_type: str, obj: dict, db, settings) -> None:
        """Internal: process a single webhook event. Exceptions bubble up to handle_webhook."""
        from .notification_service import create_notification
        from .email_service import EmailService

        if event_type == "checkout.session.completed":
            meta = obj.get("metadata", {})
            session_type = meta.get("type")

            if session_type == "per_session":
                appt_id = meta.get("appointment_id")
                uid = meta.get("user_id")
                if appt_id and ObjectId.is_valid(appt_id):
                    await db.appointments.update_one(
                        {"_id": ObjectId(appt_id)},
                        {"$set": {"payment_status": "paid"}},
                    )
                if uid:
                    await create_notification(
                        db, uid, "payment_confirmed",
                        "Payment Confirmed",
                        "Your therapy session payment has been confirmed.",
                        {"appointment_id": appt_id},
                    )
                if settings.mail_enabled and uid and appt_id and ObjectId.is_valid(appt_id):
                    patient_doc = await db.users.find_one({"_id": ObjectId(uid)})
                    appt_doc = await db.appointments.find_one({"_id": ObjectId(appt_id)})
                    if patient_doc and appt_doc:
                        await EmailService.send_payment_receipt(
                            to_email=patient_doc.get("email", ""),
                            patient_name=patient_doc.get("full_name", "there"),
                            therapist_name=appt_doc.get("therapist_name", "Therapist"),
                            amount_pkr=appt_doc.get("session_fee_pkr", 0),
                            session_date=appt_doc.get("scheduled_at"),
                        )

            elif session_type == "subscription":
                uid = meta.get("user_id")
                tier = meta.get("tier")
                if uid and tier:
                    sessions = PLAN_SESSION_COUNTS.get(tier, 0)
                    await db.users.update_one(
                        {"_id": ObjectId(uid)},
                        {"$set": {
                            "subscription_tier": tier,
                            "subscription_status": "active",
                            "sessions_remaining": sessions,
                        }},
                    )
                    await create_notification(
                        db, uid, "subscription_activated",
                        "Subscription Activated!",
                        f"Your {tier.title()} plan is now active. You have {sessions} session(s) available.",
                        {"tier": tier, "sessions": sessions},
                    )
                    if settings.mail_enabled:
                        patient_doc = await db.users.find_one({"_id": ObjectId(uid)})
                        if patient_doc:
                            await EmailService.send_subscription_welcome(
                                to_email=patient_doc.get("email", ""),
                                patient_name=patient_doc.get("full_name", "there"),
                                plan_name=tier.title(),
                                sessions_count=sessions,
                                renewal_date=None,
                            )

        elif event_type == "customer.subscription.updated":
            customer_id = obj.get("customer")
            new_status = obj.get("status", "active")
            user = await db.users.find_one({"stripe_customer_id": customer_id})
            if user:
                tier = user.get("subscription_tier", "free")
                sessions = PLAN_SESSION_COUNTS.get(tier, 0)
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"subscription_status": new_status, "sessions_remaining": sessions}},
                )

        elif event_type == "customer.subscription.deleted":
            customer_id = obj.get("customer")
            user = await db.users.find_one({"stripe_customer_id": customer_id})
            if user:
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {
                        "subscription_tier": "free",
                        "subscription_status": "inactive",
                        "sessions_remaining": 0,
                    }},
                )

    # ------------------------------------------------------------------
    # Session verification (called directly from frontend after redirect)
    # ------------------------------------------------------------------

    @staticmethod
    async def verify_session(session_id: str) -> dict:
        """
        Verify a Stripe checkout session after the user returns from Stripe.
        Updates DB immediately — acts as a reliable fallback if the webhook fires late.
        """
        stripe = _require_stripe()
        db = await get_database()

        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status != "paid":
            return {"verified": False, "payment_status": session.payment_status}

        meta = session.metadata or {}
        session_type = meta.get("type")

        if session_type == "per_session":
            appt_id = meta.get("appointment_id")
            uid = meta.get("user_id")
            if appt_id and ObjectId.is_valid(appt_id):
                await db.appointments.update_one(
                    {"_id": ObjectId(appt_id)},
                    {"$set": {"payment_status": "paid"}},
                )
            if uid:
                from .notification_service import create_notification
                await create_notification(
                    db, uid, "payment_confirmed",
                    "Payment Confirmed",
                    "Your therapy session payment has been confirmed.",
                    {"appointment_id": appt_id},
                )
            return {"verified": True, "type": "per_session", "appointment_id": appt_id}

        if session_type == "subscription":
            uid = meta.get("user_id")
            tier = meta.get("tier")
            if uid and tier:
                sessions = PLAN_SESSION_COUNTS.get(tier, 0)
                await db.users.update_one(
                    {"_id": ObjectId(uid)},
                    {"$set": {
                        "subscription_tier": tier,
                        "subscription_status": "active",
                        "sessions_remaining": sessions,
                    }},
                )
                from .notification_service import create_notification
                await create_notification(
                    db, uid, "subscription_activated",
                    "Subscription Activated!",
                    f"Your {tier.title()} plan is now active. You have {sessions} session(s) available.",
                    {"tier": tier, "sessions": sessions},
                )
                return {"verified": True, "type": "subscription", "tier": tier, "sessions": sessions}

        return {"verified": True, "type": session_type}

    # ------------------------------------------------------------------
    # Subscription management
    # ------------------------------------------------------------------

    @staticmethod
    async def cancel_subscription(user_id: str) -> dict:
        """Cancel the user's active Stripe subscription at period end."""
        db = await get_database()
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not user.get("stripe_customer_id"):
            raise HTTPException(status_code=404, detail="No active subscription found.")

        stripe = _require_stripe()
        subscriptions = stripe.Subscription.list(
            customer=user["stripe_customer_id"], status="active", limit=1
        )
        if not subscriptions.data:
            raise HTTPException(status_code=404, detail="No active subscription found.")

        sub = subscriptions.data[0]
        stripe.Subscription.modify(sub.id, cancel_at_period_end=True)

        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"subscription_status": "cancelling"}},
        )
        return {
            "message": "Subscription will cancel at end of billing period.",
            "cancel_at": sub.current_period_end,
        }

    @staticmethod
    async def get_billing_portal_url(user_id: str) -> str:
        """Create a Stripe Customer Portal session URL."""
        db = await get_database()
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not user.get("stripe_customer_id"):
            raise HTTPException(status_code=404, detail="No billing account found.")

        stripe = _require_stripe()
        settings = get_settings()
        session = stripe.billing_portal.Session.create(
            customer=user["stripe_customer_id"],
            return_url=f"{settings.frontend_url}/subscription",
        )
        return session.url

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def _insert_appointment(
        db,
        patient_id: str,
        therapist_id: str,
        scheduled_at: datetime,
        duration_minutes: int,
        payment_status: str,
        session_fee_pkr: int,
        patient_name: Optional[str] = None,
        therapist_name: Optional[str] = None,
    ) -> str:
        room = "theraai-" + "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
        doc = {
            "patient_id": patient_id,
            "therapist_id": therapist_id,
            "scheduled_at": scheduled_at,
            "duration_minutes": duration_minutes,
            "type": "video",
            "status": "scheduled",
            "notes": None,
            "jitsi_room_name": room,
            "reminder_sent": False,
            "payment_status": payment_status,
            "session_fee_pkr": session_fee_pkr,
            "stripe_session_id": None,
            "patient_name": patient_name,
            "therapist_name": therapist_name,
            "created_at": datetime.now(timezone.utc),
            "updated_at": None,
        }
        result = await db.appointments.insert_one(doc)
        return str(result.inserted_id)

    @staticmethod
    async def _get_or_create_customer(db, user_id: str, user: dict, stripe) -> str:
        existing = user.get("stripe_customer_id")
        if existing:
            return existing
        customer = stripe.Customer.create(
            email=user.get("email"),
            name=user.get("full_name"),
            metadata={"user_id": user_id},
        )
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"stripe_customer_id": customer.id}},
        )
        return customer.id
