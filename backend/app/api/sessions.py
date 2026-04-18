"""
Sessions History API for TheraAI patients.
GET /sessions/history — returns the logged-in patient's full therapy history.
Patients can only see their own data (enforced via current_user).
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends

from ..database import get_database
from ..dependencies.auth import get_current_user
from ..models.user import UserOut

router = APIRouter(prefix="/sessions", tags=["Sessions"])


def _fmt(dt) -> Optional[str]:
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt) if dt is not None else None


def _build_note_detail(note: dict) -> dict:
    return {
        "subjective":    note.get("subjective", "") or "",
        "objective":     note.get("objective", "") or "",
        "assessment":    note.get("assessment", "") or "",
        "plan":          note.get("plan", "") or "",
        "prescriptions": note.get("prescriptions", []) or [],
        "exercises":     note.get("exercises", []) or [],
        "conclusion":    note.get("conclusion", "") or "",
    }


@router.get("/history", summary="Get patient session history")
async def get_session_history(
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    """
    Returns the authenticated patient's complete therapy history:
    - All appointments (newest first)
    - Next upcoming scheduled appointment
    - Therapist-written session note summaries (read-only for patients)
    - Total completed session count
    """
    db = await get_database()
    patient_id = str(current_user.id)

    # ── 1. Fetch all patient appointments ────────────────────────────────────
    appts = (
        await db.appointments
        .find({"patient_id": patient_id})
        .sort("scheduled_at", -1)
        .to_list(length=500)
    )

    if not appts:
        return {"appointments": [], "total_sessions": 0, "next_appointment": None}

    # ── 2. Batch-fetch therapist display names ────────────────────────────────
    therapist_ids = list({a.get("therapist_id") for a in appts if a.get("therapist_id")})
    therapist_names: dict[str, str] = {}
    if therapist_ids:
        valid_oids = [ObjectId(t) for t in therapist_ids if ObjectId.is_valid(t)]
        async for t in db.users.find({"_id": {"$in": valid_oids}}):
            therapist_names[str(t["_id"])] = (
                t.get("full_name") or t.get("email") or "Your Therapist"
            )

    # ── 3. Batch-fetch session notes keyed by appointment_id ─────────────────
    appt_id_strs = [str(a["_id"]) for a in appts]
    notes_map: dict[str, dict] = {}
    async for note in db.session_notes.find(
        {"appointment_id": {"$in": appt_id_strs}}
    ).sort("created_at", -1):
        aid = note.get("appointment_id")
        # Keep the most-recent note per appointment (cursor already newest-first)
        if aid and aid not in notes_map:
            notes_map[aid] = note

    # ── 4. Determine next upcoming appointment ────────────────────────────────
    now = datetime.now(timezone.utc)
    next_appt = None
    for a in reversed(appts):            # reversed → chronological order
        if a.get("status") == "scheduled":
            scheduled = a.get("scheduled_at")
            if isinstance(scheduled, datetime) and scheduled.replace(tzinfo=timezone.utc) >= now:
                tid = a.get("therapist_id", "")
                next_appt = {
                    "id":               str(a["_id"]),
                    "therapist_id":     tid,
                    "therapist_name":   therapist_names.get(tid, "Your Therapist"),
                    "scheduled_at":     _fmt(scheduled),
                    "duration_minutes": a.get("duration_minutes", 50),
                    "type":             a.get("type", "video"),
                    "jitsi_room_name":  a.get("jitsi_room_name"),
                }
                break

    # ── 5. Build appointment list ─────────────────────────────────────────────
    appointments = []
    for a in appts:
        appt_id_str = str(a["_id"])
        tid         = a.get("therapist_id", "")
        appt_status = a.get("status", "scheduled")
        note        = notes_map.get(appt_id_str)

        appointments.append({
            "id":               appt_id_str,
            "therapist_id":     tid,
            "therapist_name":   therapist_names.get(tid, "Your Therapist"),
            "scheduled_at":     _fmt(a.get("scheduled_at")),
            "duration_minutes": a.get("duration_minutes", 50),
            "type":             a.get("type", "video"),
            "status":           appt_status,
            "had_notes":        note is not None,
            "note_detail":      _build_note_detail(note) if note else None,
            "patient_rating":   a.get("patient_rating"),
            "patient_comment":  a.get("patient_comment"),
        })

    total_sessions = sum(1 for a in appointments if a["status"] == "completed")

    return {
        "appointments":    appointments,
        "total_sessions":  total_sessions,
        "next_appointment": next_appt,
    }
