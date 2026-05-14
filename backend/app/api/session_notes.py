"""
Session Note API Routes for TheraAI Backend
Scoped to the authenticated therapist (admin can see all). Defensive.
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..database import get_database
from ..models.user import UserOut
from ..models.session_note import SessionNoteCreate, SessionNoteUpdate
from ..dependencies.rbac import require_therapist
from ..utils.router_helpers import safe_str as _safe_str, is_admin as _is_admin, therapist_scope_filter as _scope_filter

router = APIRouter(prefix="/session-notes", tags=["Session Notes"])


def _serialize(doc: dict) -> dict:
    if not doc:
        return {}
    return {
        "id": _safe_str(doc.get("_id")),
        "therapist_id": _safe_str(doc.get("therapist_id")),
        "appointment_id": _safe_str(doc.get("appointment_id")),
        "patient_id": _safe_str(doc.get("patient_id")),
        "subjective": doc.get("subjective", "") or "",
        "objective": doc.get("objective", "") or "",
        "assessment": doc.get("assessment", "") or "",
        "plan": doc.get("plan", "") or "",
        "prescriptions": doc.get("prescriptions", []) or [],
        "exercises": doc.get("exercises", []) or [],
        "conclusion": doc.get("conclusion", "") or "",
        "created_at": doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
        "updated_at": doc.get("updated_at").isoformat() if isinstance(doc.get("updated_at"), datetime) else doc.get("updated_at"),
    }


@router.post("", summary="Create session note")
async def create_session_note(
    payload: SessionNoteCreate,
    current_user: UserOut = Depends(require_therapist),
) -> dict:
    try:
        db = await get_database()
        now = datetime.now(timezone.utc)
        doc = {
            "therapist_id": str(current_user.id),
            "appointment_id": payload.appointment_id,
            "patient_id": payload.patient_id,
            "subjective": payload.subjective or "",
            "objective": payload.objective or "",
            "assessment": payload.assessment or "",
            "plan": payload.plan or "",
            "prescriptions": payload.prescriptions or [],
            "exercises": payload.exercises or [],
            "conclusion": payload.conclusion or "",
            "created_at": now,
            "updated_at": now,
        }
        res = await db.session_notes.insert_one(doc)
        doc["_id"] = res.inserted_id

        # Notify patient that session notes are available
        if payload.patient_id:
            try:
                import asyncio
                from ..services.notification_service import create_notification
                therapist_name = current_user.full_name or "Your therapist"
                asyncio.create_task(create_notification(
                    db, payload.patient_id, "session_notes_added",
                    "Session Notes Available",
                    f"{therapist_name} has added notes from your recent session.",
                    {"appointment_id": payload.appointment_id},
                ))
            except Exception:
                pass

        return _serialize(doc)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create session note",
        )


@router.get("", summary="List session notes")
async def list_session_notes(
    patient_id: Optional[str] = Query(default=None),
    appointment_id: Optional[str] = Query(default=None),
    current_user: UserOut = Depends(require_therapist),
) -> list[dict]:
    try:
        db = await get_database()
        query = _scope_filter(current_user)
        if patient_id:
            query["patient_id"] = patient_id
        if appointment_id:
            query["appointment_id"] = appointment_id
        cursor = db.session_notes.find(query).sort("created_at", -1).limit(500)
        docs = await cursor.to_list(length=500)
        return [_serialize(d) for d in docs]
    except Exception:
        return []


@router.get("/{note_id}", summary="Get session note")
async def get_session_note(
    note_id: str,
    current_user: UserOut = Depends(require_therapist),
) -> dict:
    try:
        db = await get_database()
        try:
            oid = ObjectId(note_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Session note not found")
        query = {"_id": oid, **_scope_filter(current_user)}
        doc = await db.session_notes.find_one(query)
        if not doc:
            raise HTTPException(status_code=404, detail="Session note not found")
        return _serialize(doc)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Session note not found")


@router.put("/{note_id}", summary="Update session note")
async def update_session_note(
    note_id: str,
    payload: SessionNoteUpdate,
    current_user: UserOut = Depends(require_therapist),
) -> dict:
    try:
        db = await get_database()
        try:
            oid = ObjectId(note_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Session note not found")

        updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
        updates["updated_at"] = datetime.now(timezone.utc)

        query = {"_id": oid, **_scope_filter(current_user)}
        res = await db.session_notes.update_one(query, {"$set": updates})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Session note not found")
        doc = await db.session_notes.find_one({"_id": oid})
        return _serialize(doc)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to update session note")
