"""
Payments API — Freemium model, Stripe sandbox integration
"""
from fastapi import APIRouter, Depends, Query, Request

from ..models.payment import (
    BookSessionRequest,
    BookSessionResponse,
    PlanInfo,
    SubscribeRequest,
    PLAN_DETAILS,
)
from ..models.user import UserOut
from ..services.payment_service import PaymentService
from ..dependencies.auth import get_current_user
from ..dependencies.rbac import require_patient

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/plans", summary="List all subscription plans with PKR pricing")
async def list_plans():
    """Public endpoint — returns all plan options (no auth required)."""
    return {
        "plans": [
            {"tier": tier, **details}
            for tier, details in PLAN_DETAILS.items()
        ]
    }


@router.get("/my-plan", response_model=PlanInfo, summary="Get current user's plan status")
async def get_my_plan(current_user: UserOut = Depends(get_current_user)) -> PlanInfo:
    data = await PaymentService.get_user_plan(str(current_user.id))
    return PlanInfo(**data)


@router.post(
    "/book-session",
    response_model=BookSessionResponse,
    summary="Book a session — free, subscription credit, or Stripe Checkout",
)
async def book_session(
    body: BookSessionRequest,
    current_user: UserOut = Depends(require_patient),
) -> BookSessionResponse:
    result = await PaymentService.book_session(
        user_id=str(current_user.id),
        therapist_id=body.therapist_id,
        scheduled_at=body.scheduled_at,
        duration_minutes=body.duration_minutes,
    )
    return BookSessionResponse(**result)


@router.post(
    "/subscribe",
    summary="Create a Stripe Checkout session for a subscription plan",
)
async def subscribe(
    body: SubscribeRequest,
    current_user: UserOut = Depends(require_patient),
) -> dict:
    return await PaymentService.create_subscription_checkout(
        user_id=str(current_user.id),
        tier=body.tier.value,
    )


@router.get(
    "/verify-session",
    summary="Verify Stripe checkout session after redirect — confirms payment without waiting for webhook",
)
async def verify_payment_session(
    session_id: str = Query(...),
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    try:
        return await PaymentService.verify_session(session_id)
    except Exception as e:
        return {"verified": False, "error": str(e)}


@router.post(
    "/cancel",
    summary="Cancel subscription at end of billing period",
)
async def cancel_subscription(
    current_user: UserOut = Depends(require_patient),
) -> dict:
    return await PaymentService.cancel_subscription(str(current_user.id))


@router.get(
    "/billing-portal",
    summary="Get Stripe Customer Portal URL for billing management",
)
async def get_billing_portal(
    current_user: UserOut = Depends(require_patient),
) -> dict:
    url = await PaymentService.get_billing_portal_url(str(current_user.id))
    return {"url": url}


@router.post(
    "/webhook",
    summary="Stripe webhook handler — verifies signature and processes events",
)
async def stripe_webhook(request: Request) -> dict:
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    return await PaymentService.handle_webhook(payload, sig_header)
