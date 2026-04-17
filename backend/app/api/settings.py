"""
Settings API Router for TheraAI
Persists user preferences (theme, notifications, privacy) server-side.

Endpoints:
    GET  /settings        — fetch current user's settings
    PUT  /settings        — partial update of settings
    DELETE /settings/account — delete account + all associated data
"""

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies.auth import get_current_user
from ..models.user import UserOut
from ..models.settings import UserSettingsOut, UserSettingsUpdate
from ..services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get(
    "",
    response_model=UserSettingsOut,
    summary="Get user settings",
    description="Retrieve the current user's persisted preferences. Returns defaults if not yet configured.",
)
async def get_settings(
    current_user: UserOut = Depends(get_current_user),
) -> UserSettingsOut:
    return await SettingsService.get_settings(current_user.id)


@router.put(
    "",
    response_model=UserSettingsOut,
    summary="Update user settings",
    description="Partially update preferences. Only send the fields you want to change.",
)
async def update_settings(
    data: UserSettingsUpdate,
    current_user: UserOut = Depends(get_current_user),
) -> UserSettingsOut:
    return await SettingsService.upsert_settings(current_user.id, data)


@router.delete(
    "/account",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete account",
    description="Permanently deletes the user account and all associated data. Irreversible.",
)
async def delete_account(
    current_user: UserOut = Depends(get_current_user),
) -> None:
    await SettingsService.delete_account(current_user.id)
