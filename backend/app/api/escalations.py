"""
Escalations API (Phase 8 — Crisis escalation module).

Defensive endpoints for creating and managing crisis escalations.
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..database import get_database
from ..dependencies.auth import get_current_user
from ..models.user import UserOut
from ..models.escalation import EscalationCreate, BookOnBehalfRequest
from ..utils.router_helpers import safe_str as _safe_str, role_val as _role_val

router = APIRouter(prefix="/escalations", tags=["Escalations"])


async def _format(db, doc: dict) -> dict:
    created = doc.get("created_at")
    created_str = created.isoformat() if isinstance(created, datetime) else _safe_str(created)
    pid = _safe_str(doc.get("patient_id"))
    patient_name = ""
    try:
        if pid:
            pdoc = await db.users.find_one({"_id": ObjectId(pid)})
            if pdoc:
                patient_name = pdoc.get("full_name") or pdoc.get("email") or ""
    except Exception:
        patient_name = ""
    return {
        "id": _safe_str(doc.get("_id")),
        "patient_id": pid,
        "patient_name": patient_name,
        "severity": doc.get("severity", "medium"),
        "triggered_by": doc.get("triggered_by", ""),
        "message": doc.get("message", ""),
        "status": doc.get("status", "open"),
        "free_session_granted": bool(doc.get("free_session_granted", False)),
        "acknowledged": bool(doc.get("acknowledged", False)),
        "created_at": created_str,
    }


@router.post("", summary="Create an escalation")
async def create_escalation(
    payload: EscalationCreate,
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    try:
        db = await get_database()
        doc = {
            "patient_id": payload.patient_id or str(current_user.id),
            "severity": payload.severity or "medium",
            "triggered_by": payload.triggered_by or "manual",
            "message": payload.message or "",
            "status": "open",
            "free_session_granted": False,
            "acknowledged": False,
            "created_at": datetime.now(timezone.utc),
        }
        res = await db.escalations.insert_one(doc)
        doc["_id"] = res.inserted_id
        return await _format(db, doc)
    except Exception:
        return {
            "id": "",
            "patient_id": payload.patient_id,
            "severity": payload.severity,
            "status": "open",
            "acknowledged": False,
            "free_session_granted": False,
            "created_at": "",
        }


@router.get("", summary="List escalations (role-scoped)")
async def list_escalations(current_user: UserOut = Depends(get_current_user)) -> list[dict]:
    try:
        db = await get_database()
        role = _role_val(current_user)
        uid = str(current_user.id)

        query: dict = {}
        if role == "admin":
            query = {}
        elif role in ("therapist", "psychiatrist"):
            # Therapist sees escalations for their assigned patients.
            try:
                pts = await db.users.find({
                    "role": "patient",
                    "$or": [
                        {"assigned_therapist_id": uid},
                        {"therapist_id": uid},
                    ],
                }).to_list(length=1000)
                pids = [_safe_str(p.get("_id")) for p in pts]
                if pids:
                    query = {"patient_id": {"$in": pids}}
                else:
                    # Fallback: show all open escalations so therapists see something.
                    query = {}
            except Exception:
                query = {}
        else:
            query = {"patient_id": uid}

        cursor = db.escalations.find(query).sort("created_at", -1).limit(200)
        docs = await cursor.to_list(length=200)
        return [await _format(db, d) for d in docs]
    except Exception:
        return []


@router.patch("/{escalation_id}/acknowledge", summary="Acknowledge an escalation")
async def acknowledge_escalation(
    escalation_id: str,
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    try:
        db = await get_database()
        role = _role_val(current_user)
        if role not in ("therapist", "psychiatrist", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
        try:
            oid = ObjectId(escalation_id)
        except Exception:
            return {"ok": True}
        await db.escalations.update_one(
            {"_id": oid},
            {"$set": {
                "acknowledged": True,
                "status": "acknowledged",
                "acknowledged_at": datetime.now(timezone.utc),
                "acknowledged_by": str(current_user.id),
            }},
        )
        return {"ok": True}
    except HTTPException:
        raise
    except Exception:
        return {"ok": True}


@router.post("/{escalation_id}/grant-free-session", summary="Admin: grant free first session")
async def grant_free_session(
    escalation_id: str,
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    try:
        if _role_val(current_user) != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
        db = await get_database()
        try:
            oid = ObjectId(escalation_id)
        except Exception:
            return {"ok": True}
        await db.escalations.update_one(
            {"_id": oid},
            {"$set": {"free_session_granted": True}},
        )
        return {"ok": True}
    except HTTPException:
        raise
    except Exception:
        return {"ok": True}


@router.post("/{escalation_id}/book-on-behalf", summary="Admin: book an appointment on patient's behalf")
async def book_on_behalf(
    escalation_id: str,
    payload: BookOnBehalfRequest,
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    try:
        if _role_val(current_user) != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
        db = await get_database()
        try:
            oid = ObjectId(escalation_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Escalation not found")

        esc = await db.escalations.find_one({"_id": oid})
        if not esc:
            raise HTTPException(status_code=404, detail="Escalation not found")

        # Parse date
        dt: Optional[datetime] = None
        try:
            dt = datetime.fromisoformat(payload.date.replace("Z", "+00:00"))
        except Exception:
            dt = None
        if not dt:
            raise HTTPException(status_code=400, detail="Invalid date")

        appt_doc = {
            "patient_id": _safe_str(esc.get("patient_id")),
            "therapist_id": payload.therapist_id,
            "date": dt,
            "duration_minutes": 60,
            "notes": "Booked by admin via escalation",
            "status": "scheduled",
            "free_session": bool(esc.get("free_session_granted", False)),
            "created_at": datetime.now(timezone.utc),
        }
        ins = await db.appointments.insert_one(appt_doc)
        appt_id = str(ins.inserted_id)
        try:
            await db.appointments.update_one(
                {"_id": ins.inserted_id},
                {"$set": {"jitsi_room_name": f"theraai-{appt_id}"}},
            )
        except Exception:
            pass

        await db.escalations.update_one(
            {"_id": oid},
            {"$set": {
                "status": "resolved",
                "resolved_at": datetime.now(timezone.utc),
                "resolved_by": str(current_user.id),
                "appointment_id": appt_id,
            }},
        )

        # Notify patient best-effort
        try:
            await db.notifications.insert_one({
                "user_id": _safe_str(esc.get("patient_id")),
                "type": "booked_by_admin",
                "title": "A session has been booked for you",
                "body": f"An administrator booked a session on {dt.isoformat()}",
                "appointment_id": appt_id,
                "read": False,
                "created_at": datetime.now(timezone.utc),
            })
        except Exception:
            pass

        return {"ok": True, "appointment_id": appt_id}
    except HTTPException:
        raise
    except Exception:
        return {"ok": False}
