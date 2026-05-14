"""
Admin Dashboard API for TheraAI

All endpoints require the `admin` role.

Routes:
  GET  /admin/dashboard          — platform-wide stats
  GET  /admin/users              — paginated user list with filters
  GET  /admin/users/{id}         — single user detail
  PATCH /admin/users/{id}/status — activate / deactivate a user
  DELETE /admin/users/{id}       — hard-delete a user
  GET  /admin/crisis-events      — recent crisis events (all users)
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from ..database import db_manager
from ..dependencies.rbac import require_admin
from ..models.user import UserOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Response models ──────────────────────────────────────────────────────────

class PlatformStats(BaseModel):
    total_users: int
    total_patients: int
    total_psychiatrists: int
    total_admins: int
    new_users_this_month: int
    total_journal_entries: int
    total_chat_messages: int
    total_appointments: int
    total_assessments_taken: int
    crisis_events_last_30d: int
    monthly_growth_pct: float


class AdminUserOut(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: Optional[str] = None
    last_login: Optional[str] = None
    journal_count: int = 0
    chat_count: int = 0


class AdminUserList(BaseModel):
    users: List[AdminUserOut]
    total: int
    page: int
    page_size: int


class CrisisEventAdminOut(BaseModel):
    id: str
    patient_name: str
    patient_email: str
    severity: str
    message_excerpt: str
    keywords_matched: List[str]
    created_at: str
    therapist_notified: bool


class StatusUpdate(BaseModel):
    is_active: bool


class AdminSubscriptionOut(BaseModel):
    id: str
    full_name: str
    email: str
    subscription_tier: str
    subscription_status: str
    sessions_remaining: int
    sessions_used_total: int
    renews_at: Optional[str] = None
    created_at: Optional[str] = None


class AdminSubscriptionList(BaseModel):
    subscriptions: List[AdminSubscriptionOut]
    total: int
    page: int
    page_size: int


class SessionsUpdate(BaseModel):
    sessions_remaining: int


class AdminAppointmentOut(BaseModel):
    id: str
    patient_name: str
    therapist_name: str
    scheduled_at: Optional[str] = None
    duration_minutes: int = 25
    status: str
    payment_status: str
    session_fee_pkr: int = 0


class AdminAppointmentList(BaseModel):
    appointments: List[AdminAppointmentOut]
    total: int
    page: int
    page_size: int


# ── Helper ────────────────────────────────────────────────────────────────────

def _str_id(doc: dict) -> str:
    return str(doc.get("_id", ""))


def _fmt_dt(val) -> Optional[str]:
    if not val:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    return str(val)[:19]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=PlatformStats)
async def get_admin_dashboard(
    _: UserOut = Depends(require_admin),
):
    """Platform-wide stats for the admin dashboard."""
    try:
        db = db_manager.get_database()
        now = datetime.now(timezone.utc)
        month_ago = now - timedelta(days=30)
        two_months_ago = now - timedelta(days=60)

        # User counts
        total_users = await db.users.count_documents({})
        total_patients = await db.users.count_documents({"role": "patient"})
        total_psychiatrists = await db.users.count_documents({"role": "psychiatrist"})
        total_admins = await db.users.count_documents({"role": "admin"})

        new_this_month = await db.users.count_documents({"created_at": {"$gte": month_ago}})
        new_prev_month = await db.users.count_documents({
            "created_at": {"$gte": two_months_ago, "$lt": month_ago}
        })
        growth_pct = 0.0
        if new_prev_month > 0:
            growth_pct = round((new_this_month - new_prev_month) / new_prev_month * 100, 1)

        # Content counts
        total_journals = await db.journals.count_documents({})
        total_chats = await db.chat_history.count_documents({})
        total_appointments = await db.appointments.count_documents({})
        total_assessments = await db.assessment_results.count_documents({})
        crisis_count = await db.crisis_events.count_documents({"created_at": {"$gte": month_ago}})

        return PlatformStats(
            total_users=total_users,
            total_patients=total_patients,
            total_psychiatrists=total_psychiatrists,
            total_admins=total_admins,
            new_users_this_month=new_this_month,
            total_journal_entries=total_journals,
            total_chat_messages=total_chats,
            total_appointments=total_appointments,
            total_assessments_taken=total_assessments,
            crisis_events_last_30d=crisis_count,
            monthly_growth_pct=growth_pct,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to get admin dashboard stats")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users", response_model=AdminUserList)
async def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    role: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    search: Optional[str] = Query(default=None, description="Search by name or email"),
    _: UserOut = Depends(require_admin),
):
    """Paginated, filterable user list."""
    try:
        db = db_manager.get_database()

        query: dict = {}
        if role:
            query["role"] = role
        if is_active is not None:
            query["is_active"] = is_active
        if search:
            # Escape special regex chars to prevent ReDoS
            import re
            safe_search = re.escape(search)
            query["$or"] = [
                {"full_name": {"$regex": safe_search, "$options": "i"}},
                {"email": {"$regex": safe_search, "$options": "i"}},
            ]

        total = await db.users.count_documents(query)
        skip = (page - 1) * page_size

        docs = await db.users.find(query).sort("created_at", -1).skip(skip).limit(page_size).to_list(length=page_size)

        # Enrich with content counts (batched per-user)
        user_ids = [str(d["_id"]) for d in docs]
        journal_counts = {}
        chat_counts = {}

        # Aggregate journal counts for these users
        pipeline = [
            {"$match": {"user_id": {"$in": user_ids}}},
            {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
        ]
        for rec in await db.journals.aggregate(pipeline).to_list(length=None):
            journal_counts[rec["_id"]] = rec["count"]
        for rec in await db.chat_history.aggregate(pipeline).to_list(length=None):
            chat_counts[rec["_id"]] = rec["count"]

        users_out = [
            AdminUserOut(
                id=str(d["_id"]),
                full_name=d.get("full_name", ""),
                email=d.get("email", ""),
                role=d.get("role", "patient"),
                is_active=d.get("is_active", True),
                created_at=_fmt_dt(d.get("created_at")),
                last_login=_fmt_dt(d.get("last_login")),
                journal_count=journal_counts.get(str(d["_id"]), 0),
                chat_count=chat_counts.get(str(d["_id"]), 0),
            )
            for d in docs
        ]

        return AdminUserList(users=users_out, total=total, page=page, page_size=page_size)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to list users")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/{user_id}", response_model=AdminUserOut)
async def get_user(
    user_id: str,
    _: UserOut = Depends(require_admin),
):
    """Get full detail for a single user."""
    try:
        db = db_manager.get_database()
        doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="User not found")
        uid = str(doc["_id"])
        journal_count = await db.journals.count_documents({"user_id": uid})
        chat_count = await db.chat_history.count_documents({"user_id": uid})
        return AdminUserOut(
            id=uid,
            full_name=doc.get("full_name", ""),
            email=doc.get("email", ""),
            role=doc.get("role", "patient"),
            is_active=doc.get("is_active", True),
            created_at=_fmt_dt(doc.get("created_at")),
            last_login=_fmt_dt(doc.get("last_login")),
            journal_count=journal_count,
            chat_count=chat_count,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/users/{user_id}/status", response_model=AdminUserOut)
async def update_user_status(
    user_id: str,
    body: StatusUpdate,
    _: UserOut = Depends(require_admin),
):
    """Activate or deactivate a user account."""
    try:
        db = db_manager.get_database()
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": body.is_active, "updated_at": datetime.now(timezone.utc)}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return await get_user(user_id, _)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_admin: UserOut = Depends(require_admin),
):
    """Hard-delete a user and their data. Irreversible."""
    if str(current_admin.id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    try:
        db = db_manager.get_database()
        result = await db.users.delete_one({"_id": ObjectId(user_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        # Cascade delete user data
        for collection in ("journals", "moods", "chat_history", "crisis_events",
                           "user_memory", "assessment_results", "user_settings"):
            await db[collection].delete_many({"user_id": user_id})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subscriptions", response_model=AdminSubscriptionList)
async def list_subscriptions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tier: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    _: UserOut = Depends(require_admin),
):
    """Paginated patient subscription list."""
    try:
        db = db_manager.get_database()
        query: dict = {"role": "patient"}
        if tier:
            query["subscription_tier"] = tier
        if status:
            query["subscription_status"] = status
        if search:
            import re
            safe = re.escape(search)
            query["$or"] = [
                {"full_name": {"$regex": safe, "$options": "i"}},
                {"email": {"$regex": safe, "$options": "i"}},
            ]
        total = await db.users.count_documents(query)
        skip = (page - 1) * page_size
        docs = await db.users.find(query).sort("created_at", -1).skip(skip).limit(page_size).to_list(length=page_size)
        return AdminSubscriptionList(
            subscriptions=[
                AdminSubscriptionOut(
                    id=str(d["_id"]),
                    full_name=d.get("full_name", ""),
                    email=d.get("email", ""),
                    subscription_tier=d.get("subscription_tier", "free"),
                    subscription_status=d.get("subscription_status", "inactive"),
                    sessions_remaining=d.get("sessions_remaining", 0),
                    sessions_used_total=d.get("sessions_used_total", 0),
                    renews_at=_fmt_dt(d.get("subscription_renews_at")),
                    created_at=_fmt_dt(d.get("created_at")),
                )
                for d in docs
            ],
            total=total,
            page=page,
            page_size=page_size,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to list subscriptions")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/subscriptions/{user_id}")
async def update_subscription_sessions(
    user_id: str,
    body: SessionsUpdate,
    _: UserOut = Depends(require_admin),
):
    """Admin override: manually set sessions_remaining for a patient."""
    try:
        db = db_manager.get_database()
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"sessions_remaining": body.sessions_remaining, "updated_at": datetime.now(timezone.utc)}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return {"updated": True, "sessions_remaining": body.sessions_remaining}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/appointments", response_model=AdminAppointmentList)
async def list_all_appointments(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: Optional[str] = Query(default=None),
    payment_status: Optional[str] = Query(default=None),
    range: Optional[str] = Query(default=None, description="today|week|month"),
    _: UserOut = Depends(require_admin),
):
    """All platform appointments with filters."""
    try:
        db = db_manager.get_database()
        query: dict = {}
        if status:
            query["status"] = status
        if payment_status:
            query["payment_status"] = payment_status
        if range:
            now = datetime.now(timezone.utc)
            if range == "today":
                date_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif range == "week":
                date_start = now - timedelta(days=7)
            elif range == "month":
                date_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                date_start = None
            if date_start:
                query["scheduled_at"] = {"$gte": date_start}

        total = await db.appointments.count_documents(query)
        skip = (page - 1) * page_size
        docs = await db.appointments.find(query).sort("scheduled_at", -1).skip(skip).limit(page_size).to_list(length=page_size)
        return AdminAppointmentList(
            appointments=[
                AdminAppointmentOut(
                    id=str(d["_id"]),
                    patient_name=d.get("patient_name") or "",
                    therapist_name=d.get("therapist_name") or "",
                    scheduled_at=_fmt_dt(d.get("scheduled_at")),
                    duration_minutes=d.get("duration_minutes", 25),
                    status=d.get("status", "scheduled"),
                    payment_status=d.get("payment_status", "pending"),
                    session_fee_pkr=d.get("session_fee_pkr", 0),
                )
                for d in docs
            ],
            total=total,
            page=page,
            page_size=page_size,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to list appointments")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/crisis-events", response_model=List[CrisisEventAdminOut])
async def list_crisis_events(
    limit: int = Query(default=50, ge=1, le=200),
    severity: Optional[str] = Query(default=None),
    _: UserOut = Depends(require_admin),
):
    """All recent crisis events across the platform (admin view)."""
    try:
        db = db_manager.get_database()
        query: dict = {}
        if severity:
            query["severity"] = severity
        month_ago = datetime.now(timezone.utc) - timedelta(days=30)
        query["created_at"] = {"$gte": month_ago}

        events = await db.crisis_events.find(query).sort("created_at", -1).limit(limit).to_list(length=limit)

        # Batch-fetch patient info
        patient_ids = list({e.get("user_id", "") for e in events if e.get("user_id")})
        patient_map: dict = {}
        try:
            oids = [ObjectId(pid) for pid in patient_ids if ObjectId.is_valid(pid)]
            patients = await db.users.find({"_id": {"$in": oids}}).to_list(length=None)
            for p in patients:
                patient_map[str(p["_id"])] = p
        except Exception:
            pass

        result = []
        for ev in events:
            pid = ev.get("user_id", "")
            patient = patient_map.get(pid, {})
            result.append(CrisisEventAdminOut(
                id=str(ev["_id"]),
                patient_name=patient.get("full_name", "Unknown"),
                patient_email=patient.get("email", ""),
                severity=ev.get("severity", "moderate"),
                message_excerpt=ev.get("message", "")[:200],
                keywords_matched=ev.get("keywords_matched", []),
                created_at=_fmt_dt(ev.get("created_at")) or "",
                therapist_notified=ev.get("therapist_notified", False),
            ))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to list crisis events")
        raise HTTPException(status_code=500, detail=str(e))
