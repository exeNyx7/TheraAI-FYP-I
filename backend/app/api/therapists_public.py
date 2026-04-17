"""
Public therapists directory endpoints.
Auth required (any role can read).
"""

from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from ..database import get_database
from ..dependencies.auth import get_current_user
from ..models.user import UserOut

router = APIRouter(prefix="/therapists", tags=["Therapists"])

_THERAPIST_ROLES = {"therapist", "psychiatrist"}


def _safe_str(val) -> str:
    try:
        return str(val) if val is not None else ""
    except Exception:
        return ""


def _safe_float(val: Any, default: float = 0.0) -> float:
    try:
        return float(val)
    except Exception:
        return default


def _safe_int(val: Any, default: int = 0) -> int:
    try:
        return int(val)
    except Exception:
        return default


def _format_therapist(doc: dict, profile: dict | None = None) -> dict:
    profile = profile or {}
    full_name = doc.get("full_name") or profile.get("full_name") or doc.get("email") or "Therapist"
    specializations = profile.get("specializations") or doc.get("specialties") or []

    return {
        "id": _safe_str(doc.get("_id")),
        "user_id": _safe_str(doc.get("_id")),
        "name": full_name,
        "full_name": full_name,
        "email": doc.get("email", ""),
        "specialties": specializations,
        "specializations": specializations,
        "bio": profile.get("bio") or doc.get("bio") or "",
        "photo_url": doc.get("photo_url") or doc.get("avatar_url") or "",
        "years_experience": _safe_int(profile.get("years_experience"), 0),
        "hourly_rate": _safe_float(profile.get("hourly_rate"), 0.0),
        "currency": profile.get("currency") or "PKR",
        "rating": _safe_float(profile.get("rating"), 0.0),
        "total_reviews": _safe_int(profile.get("total_reviews"), 0),
        "is_accepting_patients": bool(profile.get("is_accepting_patients", True)),
        "availability": profile.get("availability") or {},
        "role": doc.get("role", "therapist"),
    }


def _day_key(day: datetime) -> str:
    return day.strftime("%A").lower()


def _parse_hhmm(value: str) -> tuple[int, int] | None:
    try:
        hour_str, minute_str = value.split(":", 1)
        hour = int(hour_str)
        minute = int(minute_str)
        if hour < 0 or hour > 23 or minute < 0 or minute > 59:
            return None
        return hour, minute
    except Exception:
        return None


def _expand_windows_to_slots(day_start: datetime, windows: list[dict]) -> list[str]:
    slots: list[str] = []
    for window in windows:
        start_raw = _safe_str(window.get("start"))
        end_raw = _safe_str(window.get("end"))
        start_tuple = _parse_hhmm(start_raw)
        end_tuple = _parse_hhmm(end_raw)
        if not start_tuple or not end_tuple:
            continue

        start_dt = day_start.replace(hour=start_tuple[0], minute=start_tuple[1], second=0, microsecond=0)
        end_dt = day_start.replace(hour=end_tuple[0], minute=end_tuple[1], second=0, microsecond=0)
        if end_dt <= start_dt:
            continue

        current = start_dt
        while current < end_dt:
            slots.append(current.strftime("%H:%M"))
            current += timedelta(minutes=60)
    return slots


async def _fetch_therapist_profile_map(db, therapist_ids: list[str]) -> dict[str, dict]:
    if not therapist_ids:
        return {}
    cursor = db.therapist_profiles.find({"user_id": {"$in": therapist_ids}})
    profiles = await cursor.to_list(length=1000)
    return {str(profile.get("user_id")): profile for profile in profiles}


@router.get("", summary="List therapists")
async def list_therapists(current_user: UserOut = Depends(get_current_user)) -> list[dict]:
    try:
        db = await get_database()
        cursor = db.users.find({
            "role": {"$in": list(_THERAPIST_ROLES)},
            "is_active": True,
        })
        docs = await cursor.to_list(length=500)

        therapist_ids = [str(doc.get("_id")) for doc in docs]
        profile_map = await _fetch_therapist_profile_map(db, therapist_ids)

        enriched = []
        for doc in docs:
            therapist_id = _safe_str(doc.get("_id"))
            profile = profile_map.get(therapist_id, {})
            if profile and profile.get("is_accepting_patients") is False:
                continue
            enriched.append(_format_therapist(doc, profile))
        return enriched
    except Exception:
        return []


@router.get("/{therapist_id}", summary="Get therapist details")
async def get_therapist(
    therapist_id: str,
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    try:
        from bson import ObjectId
        db = await get_database()
        try:
            oid = ObjectId(therapist_id)
            doc = await db.users.find_one({"_id": oid})
        except Exception:
            doc = None
        if not doc:
            raise HTTPException(status_code=404, detail="Therapist not found")
        profile = await db.therapist_profiles.find_one({"user_id": _safe_str(doc.get("_id"))})
        return _format_therapist(doc, profile)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Therapist not found")


@router.get("/{therapist_id}/availability", summary="Get therapist availability for a date")
@router.get("/{therapist_id}/slots", summary="Get therapist slots for a date")
async def get_availability(
    therapist_id: str,
    date: str = Query(..., description="YYYY-MM-DD"),
    current_user: UserOut = Depends(get_current_user),
) -> list[dict]:
    try:
        db = await get_database()

        from bson import ObjectId
        try:
            therapist_oid = ObjectId(therapist_id)
        except Exception:
            return []

        therapist = await db.users.find_one({
            "_id": therapist_oid,
            "role": {"$in": list(_THERAPIST_ROLES)},
            "is_active": True,
        })
        if not therapist:
            return []

        profile = await db.therapist_profiles.find_one({"user_id": therapist_id})

        try:
            day_start = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except Exception:
            return []
        day_end = day_start + timedelta(days=1)

        availability = (profile or {}).get("availability") or {}
        windows = availability.get(_day_key(day_start), [])
        candidate_slots = _expand_windows_to_slots(day_start, windows)

        if not candidate_slots:
            return []

        booked_times: set[str] = set()
        try:
            cursor = db.appointments.find({
                "therapist_id": therapist_id,
                "scheduled_at": {"$gte": day_start, "$lt": day_end},
                "status": {"$ne": "cancelled"},
            })
            async for appt in cursor:
                d = appt.get("scheduled_at")
                if isinstance(d, datetime):
                    booked_times.add(d.strftime("%H:%M"))
                elif isinstance(d, str):
                    try:
                        parsed = datetime.fromisoformat(d.replace("Z", "+00:00"))
                        booked_times.add(parsed.strftime("%H:%M"))
                    except Exception:
                        pass
        except Exception:
            booked_times = set()

        slots = []
        for time_str in candidate_slots:
            available = time_str not in booked_times
            slots.append({
                "time": time_str,
                "available": available,
                "start_time": time_str,
                "is_available": available,
            })
        return slots
    except Exception:
        return []
