"""
Notifications API Routes for TheraAI
Device token registration for FCM push notifications
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status

from ..models.user import UserOut
from ..models.device_token import DeviceTokenRegister
from ..dependencies.auth import get_current_user
from ..database import get_database

router = APIRouter(prefix="/notifications", tags=["Notifications"])


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
