"""
Appointments API.
Patients can create; patients/therapists/admin can read their own/assigned/all.
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from ..database import get_database
from ..dependencies.auth import get_current_user
from ..models.user import UserOut
from ..models.appointment import AppointmentCreate
from ..services.scheduler_service import schedule_appointment_reminders
from ..services.email_service import EmailService
import logging

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def _safe_str(val) -> str:
    try:
        return str(val) if val is not None else ""
    except Exception:
        return ""


def _role_val(user: UserOut) -> str:
    role = getattr(user, "role", None)
    return role.value if hasattr(role, "value") else (role or "")


def _parse_dt(val) -> Optional[datetime]:
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


async def _format_appointment(db, doc: dict) -> dict:
    appt_id = _safe_str(doc.get("_id"))
    date_val = doc.get("date")
    dt = _parse_dt(date_val)
    date_str = dt.isoformat() if dt else _safe_str(date_val)

    therapist_name = ""
    patient_name = ""
    try:
        tid = doc.get("therapist_id")
        if tid:
            try:
                tdoc = await db.users.find_one({"_id": ObjectId(tid)})
                if tdoc:
                    therapist_name = tdoc.get("full_name") or tdoc.get("email") or ""
            except Exception:
                pass
        pid = doc.get("patient_id")
        if pid:
            try:
                pdoc = await db.users.find_one({"_id": ObjectId(pid)})
                if pdoc:
                    patient_name = pdoc.get("full_name") or pdoc.get("email") or ""
            except Exception:
                pass
    except Exception:
        pass

    created = doc.get("created_at")
    if isinstance(created, datetime):
        created_str = created.isoformat()
    else:
        created_str = _safe_str(created)

    return {
        "id": appt_id,
        "patient_id": _safe_str(doc.get("patient_id")),
        "therapist_id": _safe_str(doc.get("therapist_id")),
        "date": date_str,
        "duration_minutes": doc.get("duration_minutes", 60),
        "notes": doc.get("notes", ""),
        "status": doc.get("status", "scheduled"),
        "jitsi_room_name": doc.get("jitsi_room_name", f"theraai-{appt_id}"),
        "created_at": created_str,
        "therapist_name": therapist_name,
        "patient_name": patient_name,
    }


@router.post("", summary="Create an appointment")
async def create_appointment(
    payload: AppointmentCreate,
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    try:
        db = await get_database()
        dt = _parse_dt(payload.date)
        if not dt:
            raise HTTPException(status_code=400, detail="Invalid date format")

        doc = {
            "patient_id": str(current_user.id),
            "therapist_id": payload.therapist_id,
            "date": dt,
            "duration_minutes": payload.duration_minutes or 60,
            "notes": payload.notes or "",
            "status": "scheduled",
            "created_at": datetime.now(timezone.utc),
        }
        result = await db.appointments.insert_one(doc)
        appt_id = str(result.inserted_id)
        jitsi_room = f"theraai-{appt_id}"
        await db.appointments.update_one(
            {"_id": result.inserted_id},
            {"$set": {"jitsi_room_name": jitsi_room}},
        )
        doc["_id"] = result.inserted_id
        doc["jitsi_room_name"] = jitsi_room

        # Notifications — best effort; never fail the booking
        try:
            patient_id = str(current_user.id)
            therapist_id = payload.therapist_id
            therapist_doc = None
            patient_doc = None
            try:
                therapist_doc = await db.users.find_one({"_id": ObjectId(therapist_id)})
            except Exception:
                pass
            try:
                patient_doc = await db.users.find_one({"_id": ObjectId(patient_id)})
            except Exception:
                pass
            patient_name = (patient_doc or {}).get("full_name") or (patient_doc or {}).get("email") or ""
            therapist_name = (therapist_doc or {}).get("full_name") or (therapist_doc or {}).get("email") or ""
            appt_date_str = dt.isoformat()

            # Immediate booking_confirmed notifications
            confirm_title = "Booking confirmed"
            confirm_body = f"Session with {therapist_name} on {appt_date_str}"
            try:
                await db.notifications.insert_many([
                    {
                        "user_id": patient_id,
                        "type": "booking_confirmed",
                        "title": confirm_title,
                        "body": confirm_body,
                        "appointment_id": appt_id,
                        "read": False,
                        "created_at": datetime.now(timezone.utc),
                    },
                    {
                        "user_id": therapist_id,
                        "type": "booking_confirmed",
                        "title": "New appointment booked",
                        "body": f"Session with {patient_name} on {appt_date_str}",
                        "appointment_id": appt_id,
                        "read": False,
                        "created_at": datetime.now(timezone.utc),
                    },
                ])
            except Exception as _e:
                _logger.error(f"booking notification insert failed: {_e}")

            # Booking confirmation emails
            try:
                p_email = (patient_doc or {}).get("email")
                t_email = (therapist_doc or {}).get("email")
                room_url = f"/waiting-room/{appt_id}"
                if p_email:
                    await EmailService.send_booking_confirmation(
                        p_email, patient_name, therapist_name, appt_date_str, room_url
                    )
                if t_email:
                    await EmailService.send_booking_confirmation(
                        t_email, therapist_name, patient_name, appt_date_str, room_url
                    )
            except Exception as _e:
                _logger.error(f"booking confirmation email failed: {_e}")

            # Schedule reminders
            try:
                schedule_appointment_reminders(
                    appointment_id=appt_id,
                    scheduled_at=dt,
                    patient_id=patient_id,
                    therapist_id=therapist_id,
                )
            except Exception as _e:
                _logger.error(f"schedule reminders failed: {_e}")
        except Exception as _e:
            _logger.error(f"post-booking notifications block failed: {_e}")

        return await _format_appointment(db, doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create appointment: {str(e)}")


@router.get("", summary="List appointments for current user")
async def list_appointments(current_user: UserOut = Depends(get_current_user)) -> list[dict]:
    try:
        db = await get_database()
        role = _role_val(current_user)
        uid = str(current_user.id)

        if role == "admin":
            query = {}
        elif role in ("therapist", "psychiatrist"):
            query = {"therapist_id": uid}
        else:
            query = {"patient_id": uid}

        cursor = db.appointments.find(query).sort("date", 1)
        docs = await cursor.to_list(length=500)
        return [await _format_appointment(db, d) for d in docs]
    except Exception:
        return []


@router.get("/{appointment_id}", summary="Get an appointment")
async def get_appointment(
    appointment_id: str,
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    try:
        db = await get_database()
        try:
            oid = ObjectId(appointment_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Appointment not found")
        doc = await db.appointments.find_one({"_id": oid})
        if not doc:
            raise HTTPException(status_code=404, detail="Appointment not found")

        role = _role_val(current_user)
        uid = str(current_user.id)
        if role != "admin":
            if role in ("therapist", "psychiatrist"):
                if _safe_str(doc.get("therapist_id")) != uid:
                    raise HTTPException(status_code=403, detail="Forbidden")
            else:
                if _safe_str(doc.get("patient_id")) != uid:
                    raise HTTPException(status_code=403, detail="Forbidden")
        return await _format_appointment(db, doc)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Appointment not found")


@router.get("/{appointment_id}/patient-summary", summary="Therapist patient summary filtered by sharing prefs")
async def get_patient_summary(
    appointment_id: str,
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    empty = {
        "mood": None,
        "emotions": [],
        "demographics": None,
        "journal": [],
        "assessments": [],
        "shared": {
            "mood": False,
            "emotions": False,
            "demographics": False,
            "journal": False,
            "assessments": False,
        },
    }
    try:
        db = await get_database()
        role = _role_val(current_user)
        if role not in ("therapist", "psychiatrist", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden")

        try:
            oid = ObjectId(appointment_id)
        except Exception:
            return empty
        appt = await db.appointments.find_one({"_id": oid})
        if not appt:
            return empty
        if role != "admin" and _safe_str(appt.get("therapist_id")) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Forbidden")

        patient_id = _safe_str(appt.get("patient_id"))
        prefs = await db.sharing_preferences.find_one({
            "appointment_id": appointment_id,
            "patient_id": patient_id,
        }) or {}

        share_mood = bool(prefs.get("share_mood", False))
        share_emotions = bool(prefs.get("share_emotions", False))
        share_demographics = bool(prefs.get("share_demographics", False))
        share_journal = bool(prefs.get("share_journal", False))
        share_assessments = bool(prefs.get("share_assessments", False))

        result = {
            "mood": None,
            "emotions": [],
            "demographics": None,
            "journal": [],
            "assessments": [],
            "shared": {
                "mood": share_mood,
                "emotions": share_emotions,
                "demographics": share_demographics,
                "journal": share_journal,
                "assessments": share_assessments,
            },
        }

        if share_mood:
            try:
                mood_doc = await db.mood_entries.find_one(
                    {"user_id": patient_id},
                    sort=[("created_at", -1)],
                )
                if mood_doc:
                    result["mood"] = {
                        "mood": mood_doc.get("mood"),
                        "score": mood_doc.get("score"),
                        "note": mood_doc.get("note", ""),
                        "created_at": (
                            mood_doc.get("created_at").isoformat()
                            if isinstance(mood_doc.get("created_at"), datetime)
                            else _safe_str(mood_doc.get("created_at"))
                        ),
                    }
            except Exception:
                pass

        if share_emotions:
            try:
                cursor = db.journals.find({"user_id": patient_id}).sort("created_at", -1).limit(5)
                recent = await cursor.to_list(length=5)
                emotions = []
                for j in recent:
                    emo = j.get("emotions") or j.get("sentiment") or []
                    if isinstance(emo, list):
                        emotions.extend(emo)
                    elif emo:
                        emotions.append(emo)
                result["emotions"] = emotions[:10]
            except Exception:
                pass

        if share_demographics:
            try:
                pdoc = await db.users.find_one({"_id": ObjectId(patient_id)})
                if pdoc:
                    result["demographics"] = {
                        "age": pdoc.get("age"),
                        "gender": pdoc.get("gender"),
                        "full_name": pdoc.get("full_name"),
                    }
            except Exception:
                pass

        if share_journal:
            try:
                cursor = db.journals.find({"user_id": patient_id}).sort("created_at", -1).limit(5)
                entries = await cursor.to_list(length=5)
                result["journal"] = [
                    {
                        "id": _safe_str(e.get("_id")),
                        "title": e.get("title", ""),
                        "content": (e.get("content") or "")[:500],
                        "created_at": (
                            e.get("created_at").isoformat()
                            if isinstance(e.get("created_at"), datetime)
                            else _safe_str(e.get("created_at"))
                        ),
                    }
                    for e in entries
                ]
            except Exception:
                pass

        if share_assessments:
            try:
                cursor = db.assessment_results.find({"user_id": patient_id}).sort("created_at", -1).limit(5)
                res = await cursor.to_list(length=5)
                result["assessments"] = [
                    {
                        "id": _safe_str(r.get("_id")),
                        "name": r.get("name", ""),
                        "score": r.get("score"),
                        "created_at": (
                            r.get("created_at").isoformat()
                            if isinstance(r.get("created_at"), datetime)
                            else _safe_str(r.get("created_at"))
                        ),
                    }
                    for r in res
                ]
            except Exception:
                pass

        return result
    except HTTPException:
        raise
    except Exception:
        return empty


@router.patch("/{appointment_id}/cancel", summary="Cancel an appointment")
async def cancel_appointment(
    appointment_id: str,
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    try:
        db = await get_database()
        try:
            oid = ObjectId(appointment_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Appointment not found")
        doc = await db.appointments.find_one({"_id": oid})
        if not doc:
            raise HTTPException(status_code=404, detail="Appointment not found")

        role = _role_val(current_user)
        uid = str(current_user.id)
        if role != "admin":
            if role in ("therapist", "psychiatrist"):
                if _safe_str(doc.get("therapist_id")) != uid:
                    raise HTTPException(status_code=403, detail="Forbidden")
            else:
                if _safe_str(doc.get("patient_id")) != uid:
                    raise HTTPException(status_code=403, detail="Forbidden")

        await db.appointments.update_one(
            {"_id": oid},
            {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}},
        )
        doc = await db.appointments.find_one({"_id": oid})
        return await _format_appointment(db, doc)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to cancel appointment")
