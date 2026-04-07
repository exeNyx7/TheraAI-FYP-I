"""
Public therapists directory endpoints.
Auth required (any role can read).
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

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


def _format_therapist(doc: dict) -> dict:
    return {
        "id": _safe_str(doc.get("_id")),
        "name": doc.get("full_name") or doc.get("email") or "Therapist",
        "email": doc.get("email", ""),
        "specialties": doc.get("specialties") or [],
        "bio": doc.get("bio", ""),
        "photo_url": doc.get("photo_url", ""),
        "hourly_rate": doc.get("hourly_rate", 0),
        "rating": doc.get("rating", 0),
        "role": doc.get("role", "therapist"),
    }


@router.get("", summary="List therapists")
async def list_therapists(current_user: UserOut = Depends(get_current_user)) -> list[dict]:
    try:
        db = await get_database()
        cursor = db.users.find({"role": {"$in": list(_THERAPIST_ROLES)}})
        docs = await cursor.to_list(length=500)
        return [_format_therapist(d) for d in docs]
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
        return _format_therapist(doc)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Therapist not found")


@router.get("/{therapist_id}/availability", summary="Get therapist availability for a date")
async def get_availability(
    therapist_id: str,
    date: str = Query(..., description="YYYY-MM-DD"),
    current_user: UserOut = Depends(get_current_user),
) -> list[dict]:
    try:
        db = await get_database()
        try:
            day_start = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except Exception:
            return []
        day_end = day_start + timedelta(days=1)

        booked_times: set[str] = set()
        try:
            cursor = db.appointments.find({
                "therapist_id": therapist_id,
                "date": {"$gte": day_start, "$lt": day_end},
                "status": {"$ne": "cancelled"},
            })
            async for appt in cursor:
                d = appt.get("date")
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
        for hour in range(9, 17):
            time_str = f"{hour:02d}:00"
            slots.append({
                "time": time_str,
                "available": time_str not in booked_times,
            })
        return slots
    except Exception:
        return []
