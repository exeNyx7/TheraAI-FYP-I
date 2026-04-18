"""Sharing preferences API.

Patients submit (or update) what they agree to share for a given appointment.
Therapist or the patient themselves can read preferences.
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..database import get_database
from ..dependencies.auth import get_current_user
from ..models.user import UserOut
from ..models.sharing_preference import SharingPreferenceCreate
from ..utils.router_helpers import safe_str as _safe_str, role_val as _role_val

router = APIRouter(prefix="/sharing-preferences", tags=["Sharing Preferences"])


def _format(doc: dict) -> dict:
    if not doc:
        return {}
    created = doc.get("created_at")
    created_str = created.isoformat() if isinstance(created, datetime) else _safe_str(created)
    return {
        "id": _safe_str(doc.get("_id")),
        "patient_id": _safe_str(doc.get("patient_id")),
        "appointment_id": _safe_str(doc.get("appointment_id")),
        "share_mood": bool(doc.get("share_mood", True)),
        "share_emotions": bool(doc.get("share_emotions", True)),
        "share_demographics": bool(doc.get("share_demographics", False)),
        "share_journal": bool(doc.get("share_journal", False)),
        "share_assessments": bool(doc.get("share_assessments", False)),
        "created_at": created_str,
    }


@router.post("", summary="Create/update sharing preference for an appointment")
async def upsert_sharing_preference(
    payload: SharingPreferenceCreate,
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    try:
        db = await get_database()
        patient_id = str(current_user.id)
        now = datetime.now(timezone.utc)
        filter_q = {"appointment_id": payload.appointment_id, "patient_id": patient_id}
        update = {
            "$set": {
                "appointment_id": payload.appointment_id,
                "patient_id": patient_id,
                "share_mood": bool(payload.share_mood),
                "share_emotions": bool(payload.share_emotions),
                "share_demographics": bool(payload.share_demographics),
                "share_journal": bool(payload.share_journal),
                "share_assessments": bool(payload.share_assessments),
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        }
        await db.sharing_preferences.update_one(filter_q, update, upsert=True)
        doc = await db.sharing_preferences.find_one(filter_q)
        return _format(doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save sharing preference: {str(e)}")


@router.get("/{appointment_id}", summary="Get sharing preference for appointment")
async def get_sharing_preference(
    appointment_id: str,
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    try:
        db = await get_database()
        # Verify appointment exists and user can access it.
        try:
            oid = ObjectId(appointment_id)
        except Exception:
            return {}
        appt = await db.appointments.find_one({"_id": oid})
        if not appt:
            return {}
        uid = str(current_user.id)
        role = _role_val(current_user)
        if role != "admin":
            if role in ("therapist", "psychiatrist"):
                if _safe_str(appt.get("therapist_id")) != uid:
                    raise HTTPException(status_code=403, detail="Forbidden")
            else:
                if _safe_str(appt.get("patient_id")) != uid:
                    raise HTTPException(status_code=403, detail="Forbidden")
        doc = await db.sharing_preferences.find_one({
            "appointment_id": appointment_id,
            "patient_id": _safe_str(appt.get("patient_id")),
        })
        return _format(doc) if doc else {}
    except HTTPException:
        raise
    except Exception:
        return {}
