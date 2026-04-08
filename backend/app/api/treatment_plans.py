"""
Treatment Plan API Routes for TheraAI Backend
CRUD endpoints scoped to the authenticated therapist (admin can see all).
Defensive: never raises a 500 for predictable failures.
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..database import get_database
from ..models.user import UserOut
from ..models.treatment_plan import (
    TreatmentPlanCreate,
    TreatmentPlanUpdate,
)
from ..dependencies.rbac import require_therapist

router = APIRouter(prefix="/treatment-plans", tags=["Treatment Plans"])


def _is_admin(user: UserOut) -> bool:
    role = getattr(user, "role", None)
    role_val = role.value if hasattr(role, "value") else role
    return role_val == "admin"


def _safe_str(val) -> str:
    try:
        return str(val) if val is not None else ""
    except Exception:
        return ""


def _serialize(doc: dict) -> dict:
    if not doc:
        return {}
    return {
        "id": _safe_str(doc.get("_id")),
        "therapist_id": _safe_str(doc.get("therapist_id")),
        "patient_id": _safe_str(doc.get("patient_id")),
        "title": doc.get("title", ""),
        "goals": doc.get("goals", []) or [],
        "interventions": doc.get("interventions", []) or [],
        "status": doc.get("status", "active"),
        "created_at": doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
        "updated_at": doc.get("updated_at").isoformat() if isinstance(doc.get("updated_at"), datetime) else doc.get("updated_at"),
    }


def _scope_filter(current_user: UserOut) -> dict:
    if _is_admin(current_user):
        return {}
    return {"therapist_id": str(current_user.id)}


@router.post("", summary="Create treatment plan")
async def create_treatment_plan(
    payload: TreatmentPlanCreate,
    current_user: UserOut = Depends(require_therapist),
) -> dict:
    try:
        db = await get_database()
        now = datetime.now(timezone.utc)
        doc = {
            "therapist_id": str(current_user.id),
            "patient_id": payload.patient_id,
            "title": payload.title,
            "goals": payload.goals or [],
            "interventions": payload.interventions or [],
            "status": payload.status or "active",
            "created_at": now,
            "updated_at": now,
        }
        res = await db.treatment_plans.insert_one(doc)
        doc["_id"] = res.inserted_id
        return _serialize(doc)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create treatment plan",
        )


@router.get("", summary="List treatment plans")
async def list_treatment_plans(
    patient_id: Optional[str] = Query(default=None),
    current_user: UserOut = Depends(require_therapist),
) -> list[dict]:
    try:
        db = await get_database()
        query = _scope_filter(current_user)
        if patient_id:
            query["patient_id"] = patient_id
        cursor = db.treatment_plans.find(query).sort("created_at", -1).limit(500)
        docs = await cursor.to_list(length=500)
        return [_serialize(d) for d in docs]
    except Exception:
        return []


@router.get("/{plan_id}", summary="Get treatment plan")
async def get_treatment_plan(
    plan_id: str,
    current_user: UserOut = Depends(require_therapist),
) -> dict:
    try:
        db = await get_database()
        try:
            oid = ObjectId(plan_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Treatment plan not found")
        query = {"_id": oid, **_scope_filter(current_user)}
        doc = await db.treatment_plans.find_one(query)
        if not doc:
            raise HTTPException(status_code=404, detail="Treatment plan not found")
        return _serialize(doc)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Treatment plan not found")


@router.put("/{plan_id}", summary="Update treatment plan")
async def update_treatment_plan(
    plan_id: str,
    payload: TreatmentPlanUpdate,
    current_user: UserOut = Depends(require_therapist),
) -> dict:
    try:
        db = await get_database()
        try:
            oid = ObjectId(plan_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Treatment plan not found")

        updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
        updates["updated_at"] = datetime.now(timezone.utc)

        query = {"_id": oid, **_scope_filter(current_user)}
        res = await db.treatment_plans.update_one(query, {"$set": updates})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Treatment plan not found")
        doc = await db.treatment_plans.find_one({"_id": oid})
        return _serialize(doc)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to update treatment plan")


@router.delete("/{plan_id}", summary="Delete treatment plan")
async def delete_treatment_plan(
    plan_id: str,
    current_user: UserOut = Depends(require_therapist),
) -> dict:
    try:
        db = await get_database()
        try:
            oid = ObjectId(plan_id)
        except Exception:
            return {"status": "ok"}
        query = {"_id": oid, **_scope_filter(current_user)}
        await db.treatment_plans.delete_one(query)
        return {"status": "ok"}
    except Exception:
        return {"status": "ok"}
