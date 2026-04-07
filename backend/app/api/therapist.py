"""
Therapist API Routes for TheraAI Backend
Endpoints for therapist/psychiatrist dashboards, patient lists, and alerts.

All endpoints require authentication and are restricted to users with the
'therapist', 'psychiatrist', or 'admin' role. (The backend UserRole enum
only defines 'psychiatrist'/'admin'/'patient' today; 'therapist' is accepted
defensively in case it is added later.)
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from ..database import get_database
from ..dependencies.auth import get_current_user
from ..models.user import UserOut

router = APIRouter(prefix="/therapist", tags=["Therapist"])

_ALLOWED_ROLES = {"therapist", "psychiatrist", "admin"}


async def require_therapist(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    role = getattr(current_user, "role", None)
    role_val = role.value if hasattr(role, "value") else role
    if role_val not in _ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Therapist/psychiatrist/admin role required.",
        )
    return current_user


def _safe_str(val) -> str:
    try:
        return str(val) if val is not None else ""
    except Exception:
        return ""


async def _list_assigned_patients(db, therapist_id: str) -> list[dict]:
    """List patients assigned to the therapist; fall back to all patients."""
    try:
        users = db.users
        # Try assigned_therapist_id first, then therapist_id.
        cursor = users.find({
            "role": "patient",
            "$or": [
                {"assigned_therapist_id": therapist_id},
                {"therapist_id": therapist_id},
            ],
        })
        assigned = await cursor.to_list(length=1000)
        if assigned:
            return assigned
        # Fallback: all patients.
        cursor = users.find({"role": "patient"})
        return await cursor.to_list(length=1000)
    except Exception:
        return []


async def _latest_mood_for_user(db, user_id: str) -> Optional[dict]:
    try:
        doc = await db.mood_entries.find_one(
            {"user_id": user_id},
            sort=[("timestamp", -1)],
        )
        return doc
    except Exception:
        return None


async def _upcoming_appointments(db, therapist_id: str, limit: int = 5) -> list[dict]:
    try:
        now = datetime.now(timezone.utc)
        cursor = db.appointments.find({
            "therapist_id": therapist_id,
            "date": {"$gte": now},
        }).sort("date", 1).limit(limit)
        return await cursor.to_list(length=limit)
    except Exception:
        return []


def _format_appointment(appt: dict, patient_name_lookup: dict) -> dict:
    patient_id = _safe_str(appt.get("patient_id") or appt.get("user_id"))
    date_val = appt.get("date") or appt.get("scheduled_at")
    date_str = ""
    time_str = appt.get("time", "")
    if isinstance(date_val, datetime):
        date_str = date_val.strftime("%Y-%m-%d")
        if not time_str:
            time_str = date_val.strftime("%H:%M")
    elif isinstance(date_val, str):
        date_str = date_val
    return {
        "id": _safe_str(appt.get("_id")),
        "patient_id": patient_id,
        "patient_name": patient_name_lookup.get(patient_id, "Patient"),
        "date": date_str,
        "time": time_str,
        "status": appt.get("status", "scheduled"),
    }


@router.get(
    "/dashboard",
    summary="Therapist dashboard summary",
    description="Aggregated counts and upcoming appointments for the therapist.",
)
async def get_dashboard(current_user: UserOut = Depends(require_therapist)) -> dict:
    try:
        db = await get_database()
        therapist_id = str(current_user.id)

        patients = await _list_assigned_patients(db, therapist_id)
        total_patients = len(patients)
        active_patients = sum(1 for p in patients if p.get("is_active", True))

        # Sessions this week.
        sessions_this_week = 0
        try:
            now = datetime.now(timezone.utc)
            week_start = now - timedelta(days=now.weekday())
            week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
            week_end = week_start + timedelta(days=7)
            sessions_this_week = await db.appointments.count_documents({
                "therapist_id": therapist_id,
                "date": {"$gte": week_start, "$lt": week_end},
            })
        except Exception:
            sessions_this_week = 0

        # Pending alerts.
        pending_alerts = 0
        for coll_name in ("crisis_events", "escalations"):
            try:
                pending_alerts += await db[coll_name].count_documents({
                    "therapist_id": therapist_id,
                    "acknowledged": {"$ne": True},
                })
            except Exception:
                continue

        # Upcoming appointments (next 5).
        appts = await _upcoming_appointments(db, therapist_id, limit=5)
        name_lookup = {
            _safe_str(p.get("_id")): p.get("full_name") or p.get("email") or "Patient"
            for p in patients
        }
        upcoming = [_format_appointment(a, name_lookup) for a in appts]

        return {
            "total_patients": total_patients,
            "active_patients": active_patients,
            "sessions_this_week": sessions_this_week,
            "pending_alerts": pending_alerts,
            "upcoming_appointments": upcoming,
        }
    except Exception:
        return {
            "total_patients": 0,
            "active_patients": 0,
            "sessions_this_week": 0,
            "pending_alerts": 0,
            "upcoming_appointments": [],
        }


@router.get(
    "/patients",
    summary="List therapist's patients",
    description="Returns patients assigned to the therapist (falls back to all patients).",
)
async def list_patients(current_user: UserOut = Depends(require_therapist)) -> list[dict]:
    try:
        db = await get_database()
        therapist_id = str(current_user.id)
        patients = await _list_assigned_patients(db, therapist_id)

        results: list[dict] = []
        for p in patients:
            pid = _safe_str(p.get("_id"))
            mood_doc = await _latest_mood_for_user(db, pid)
            current_mood = (mood_doc or {}).get("mood") or "neutral"

            # Last appointment lookup.
            last_appt_str = ""
            try:
                last_appt = await db.appointments.find_one(
                    {"therapist_id": therapist_id, "patient_id": pid},
                    sort=[("date", -1)],
                )
                if last_appt:
                    d = last_appt.get("date")
                    if isinstance(d, datetime):
                        last_appt_str = d.strftime("%Y-%m-%d")
                    elif isinstance(d, str):
                        last_appt_str = d
            except Exception:
                last_appt_str = ""

            results.append({
                "id": pid,
                "name": p.get("full_name") or p.get("email") or "Patient",
                "email": p.get("email", ""),
                "last_appointment": last_appt_str,
                "status": "active" if p.get("is_active", True) else "inactive",
                "current_mood": current_mood,
                "mood_trend": "stable",
            })
        return results
    except Exception:
        return []


async def _ensure_patient_access(db, current_user: UserOut, patient_id: str) -> Optional[dict]:
    """Return the patient doc if the current user may access it, else None."""
    try:
        try:
            poid = ObjectId(patient_id)
        except Exception:
            return None
        pdoc = await db.users.find_one({"_id": poid})
        if not pdoc:
            return None
        role = getattr(current_user, "role", None)
        role_val = role.value if hasattr(role, "value") else role
        if role_val == "admin":
            return pdoc
        tid = str(current_user.id)
        assigned = _safe_str(pdoc.get("assigned_therapist_id") or pdoc.get("therapist_id"))
        if assigned and assigned == tid:
            return pdoc
        # Fallback: if this therapist has any appointment with this patient, allow.
        try:
            appt = await db.appointments.find_one({"therapist_id": tid, "patient_id": patient_id})
            if appt:
                return pdoc
        except Exception:
            pass
        # Final fallback matches _list_assigned_patients fallback behaviour.
        try:
            any_assigned = await db.users.find_one({
                "role": "patient",
                "$or": [
                    {"assigned_therapist_id": tid},
                    {"therapist_id": tid},
                ],
            })
            if not any_assigned:
                return pdoc
        except Exception:
            return None
        return None
    except Exception:
        return None


@router.get(
    "/patients/{patient_id}",
    summary="Get patient profile (therapist view)",
)
async def get_patient_profile(
    patient_id: str,
    current_user: UserOut = Depends(require_therapist),
) -> dict:
    empty = {
        "id": patient_id,
        "name": "",
        "email": "",
        "age": None,
        "gender": None,
        "joined_at": "",
        "total_sessions": 0,
        "current_mood": "neutral",
        "mood_trend": "stable",
        "latest_assessment": None,
    }
    try:
        db = await get_database()
        pdoc = await _ensure_patient_access(db, current_user, patient_id)
        if not pdoc:
            return empty

        therapist_id = str(current_user.id)
        total_sessions = 0
        try:
            total_sessions = await db.appointments.count_documents({
                "therapist_id": therapist_id,
                "patient_id": patient_id,
            })
        except Exception:
            total_sessions = 0

        mood_doc = await _latest_mood_for_user(db, patient_id) or {}
        current_mood = mood_doc.get("mood") or "neutral"

        latest_assessment = None
        try:
            adoc = await db.assessment_results.find_one(
                {"user_id": patient_id}, sort=[("created_at", -1)]
            )
            if adoc:
                created = adoc.get("created_at")
                latest_assessment = {
                    "id": _safe_str(adoc.get("_id")),
                    "name": adoc.get("name", ""),
                    "score": adoc.get("score"),
                    "created_at": created.isoformat() if isinstance(created, datetime) else _safe_str(created),
                }
        except Exception:
            latest_assessment = None

        joined = pdoc.get("created_at") or pdoc.get("joined_at")
        joined_str = joined.isoformat() if isinstance(joined, datetime) else _safe_str(joined)

        return {
            "id": _safe_str(pdoc.get("_id")),
            "name": pdoc.get("full_name") or pdoc.get("email") or "Patient",
            "email": pdoc.get("email", ""),
            "age": pdoc.get("age"),
            "gender": pdoc.get("gender"),
            "joined_at": joined_str,
            "total_sessions": total_sessions,
            "current_mood": current_mood,
            "mood_trend": "stable",
            "latest_assessment": latest_assessment,
        }
    except Exception:
        return empty


@router.get(
    "/patients/{patient_id}/history",
    summary="Get patient appointment history with session notes",
)
async def get_patient_history(
    patient_id: str,
    current_user: UserOut = Depends(require_therapist),
) -> list[dict]:
    try:
        db = await get_database()
        pdoc = await _ensure_patient_access(db, current_user, patient_id)
        if not pdoc:
            return []

        therapist_id = str(current_user.id)
        role = getattr(current_user, "role", None)
        role_val = role.value if hasattr(role, "value") else role

        query: dict = {"patient_id": patient_id}
        if role_val != "admin":
            query["therapist_id"] = therapist_id

        try:
            cursor = db.appointments.find(query).sort("date", -1).limit(500)
            appts = await cursor.to_list(length=500)
        except Exception:
            appts = []

        results: list[dict] = []
        for a in appts:
            appt_id = _safe_str(a.get("_id"))
            date_val = a.get("date")
            if isinstance(date_val, datetime):
                date_str = date_val.isoformat()
            else:
                date_str = _safe_str(date_val)

            note = None
            try:
                ndoc = await db.session_notes.find_one({"appointment_id": appt_id})
                if ndoc:
                    note = {
                        "id": _safe_str(ndoc.get("_id")),
                        "subjective": ndoc.get("subjective", "") or "",
                        "objective": ndoc.get("objective", "") or "",
                        "assessment": ndoc.get("assessment", "") or "",
                        "plan": ndoc.get("plan", "") or "",
                        "prescriptions": ndoc.get("prescriptions", []) or [],
                        "exercises": ndoc.get("exercises", []) or [],
                        "conclusion": ndoc.get("conclusion", "") or "",
                    }
            except Exception:
                note = None

            results.append({
                "appointment_id": appt_id,
                "date": date_str,
                "status": a.get("status", "scheduled"),
                "note": note,
            })
        return results
    except Exception:
        return []


@router.get(
    "/alerts",
    summary="List therapist alerts",
    description="Returns crisis events / escalations for the therapist.",
)
async def list_alerts(current_user: UserOut = Depends(require_therapist)) -> list[dict]:
    try:
        db = await get_database()
        therapist_id = str(current_user.id)

        # Build a patient-name lookup for enrichment.
        patients = await _list_assigned_patients(db, therapist_id)
        name_lookup = {
            _safe_str(p.get("_id")): p.get("full_name") or p.get("email") or "Patient"
            for p in patients
        }

        results: list[dict] = []
        for coll_name in ("crisis_events", "escalations"):
            try:
                cursor = db[coll_name].find({"therapist_id": therapist_id}).sort("created_at", -1).limit(100)
                docs = await cursor.to_list(length=100)
            except Exception:
                docs = []
            for d in docs:
                pid = _safe_str(d.get("patient_id") or d.get("user_id"))
                created = d.get("created_at")
                if isinstance(created, datetime):
                    created_str = created.isoformat()
                else:
                    created_str = _safe_str(created)
                results.append({
                    "id": _safe_str(d.get("_id")),
                    "patient_id": pid,
                    "patient_name": name_lookup.get(pid, "Patient"),
                    "severity": d.get("severity", "medium"),
                    "message": d.get("message") or d.get("reason") or "",
                    "created_at": created_str,
                    "acknowledged": bool(d.get("acknowledged", False)),
                })
        return results
    except Exception:
        return []


@router.post(
    "/alerts/{alert_id}/acknowledge",
    summary="Acknowledge an alert",
    description="Marks a crisis event / escalation as acknowledged.",
)
async def acknowledge_alert(
    alert_id: str,
    current_user: UserOut = Depends(require_therapist),
) -> dict:
    try:
        db = await get_database()
        try:
            oid = ObjectId(alert_id)
        except Exception:
            return {"status": "ok"}

        update = {"$set": {
            "acknowledged": True,
            "acknowledged_at": datetime.now(timezone.utc),
            "acknowledged_by": str(current_user.id),
        }}
        for coll_name in ("crisis_events", "escalations"):
            try:
                res = await db[coll_name].update_one({"_id": oid}, update)
                if res.matched_count:
                    break
            except Exception:
                continue
        return {"status": "ok"}
    except Exception:
        return {"status": "ok"}
