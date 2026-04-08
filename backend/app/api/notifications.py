"""
Notifications API Routes for TheraAI
Device token registration for FCM push notifications
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from ..models.user import UserOut
from ..models.device_token import DeviceTokenRegister
from ..dependencies.auth import get_current_user
from ..database import get_database

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _serialize_notification(doc: dict) -> dict:
    created_at = doc.get("created_at")
    read_at = doc.get("read_at")
    return {
        "id": str(doc.get("_id")),
        "type": doc.get("type"),
        "title": doc.get("title"),
        "body": doc.get("body"),
        "appointment_id": doc.get("appointment_id"),
        "read": bool(doc.get("read", False)),
        "created_at": created_at.isoformat() if created_at else None,
        "read_at": read_at.isoformat() if read_at else None,
    }


@router.post(
    "/register-device",
    status_code=status.HTTP_200_OK,
    summary="Register a device for push notifications",
)
async def register_device(
    payload: DeviceTokenRegister,
    current_user: UserOut = Depends(get_current_user),
):
    """Register or update an FCM device token for the authenticated user."""
    db = await get_database()
    user_id = str(current_user.id)
    now = datetime.now(timezone.utc)

    # Upsert: same user+token → update timestamp; new → insert
    await db.device_tokens.update_one(
        {"user_id": user_id, "token": payload.token},
        {
            "$set": {
                "user_id": user_id,
                "token": payload.token,
                "device_type": payload.device_type,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    return {"message": "Device registered successfully"}


@router.delete(
    "/unregister-device",
    status_code=status.HTTP_200_OK,
    summary="Unregister a device token",
)
async def unregister_device(
    payload: DeviceTokenRegister,
    current_user: UserOut = Depends(get_current_user),
):
    """Remove an FCM device token (e.g. on logout)."""
    db = await get_database()
    await db.device_tokens.delete_one({
        "user_id": str(current_user.id),
        "token": payload.token,
    })
    return {"message": "Device unregistered successfully"}


@router.get(
    "/unread",
    status_code=status.HTTP_200_OK,
    summary="Get unread notifications",
)
async def get_unread_notifications(
    current_user: UserOut = Depends(get_current_user),
):
    """Return unread in-app notifications for the authenticated user."""
    db = await get_database()
    user_id = str(current_user.id)

    cursor = (
        db.notifications
        .find({"user_id": user_id, "read": {"$ne": True}})
        .sort("created_at", -1)
        .limit(50)
    )

    unread = []
    async for doc in cursor:
        unread.append(_serialize_notification(doc))

    return unread


@router.post(
    "/{notification_id}/read",
    status_code=status.HTTP_200_OK,
    summary="Mark notification as read",
)
async def mark_notification_read(
    notification_id: str,
    current_user: UserOut = Depends(get_current_user),
):
    """Mark a single notification as read for the authenticated user."""
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid notification id")

    db = await get_database()
    user_id = str(current_user.id)
    now = datetime.now(timezone.utc)

    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": user_id},
        {"$set": {"read": True, "read_at": now, "updated_at": now}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    return {"message": "Notification marked as read"}
