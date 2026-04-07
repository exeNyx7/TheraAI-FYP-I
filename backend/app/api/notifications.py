"""
Notifications API.
Lightweight read/mark-read endpoints backed by the `notifications` collection.
"""

from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..database import get_database
from ..dependencies.auth import get_current_user
from ..models.user import UserOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _fmt(doc: dict) -> dict:
    try:
        created = doc.get("created_at")
        if isinstance(created, datetime):
            created_str = created.isoformat()
        else:
            created_str = str(created) if created is not None else ""
        return {
            "id": str(doc.get("_id", "")),
            "type": doc.get("type", ""),
            "title": doc.get("title", ""),
            "body": doc.get("body", ""),
            "appointment_id": doc.get("appointment_id"),
            "read": bool(doc.get("read", False)),
            "created_at": created_str,
        }
    except Exception:
        return {}


@router.get("/unread", summary="List unread notifications for current user")
async def list_unread(current_user: UserOut = Depends(get_current_user)) -> list[dict]:
    try:
        db = await get_database()
        cursor = (
            db.notifications
            .find({"user_id": str(current_user.id), "read": False})
            .sort("created_at", -1)
            .limit(50)
        )
        docs = await cursor.to_list(length=50)
        return [_fmt(d) for d in docs if d]
    except Exception:
        return []


@router.post("/{notification_id}/read", summary="Mark notification as read")
async def mark_read(
    notification_id: str,
    current_user: UserOut = Depends(get_current_user),
) -> dict:
    try:
        db = await get_database()
        try:
            oid = ObjectId(notification_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Notification not found")
        res = await db.notifications.update_one(
            {"_id": oid, "user_id": str(current_user.id)},
            {"$set": {"read": True, "read_at": datetime.utcnow()}},
        )
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to mark notification read")
