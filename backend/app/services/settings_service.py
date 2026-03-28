"""
Settings Service for TheraAI
Handles server-side persistence of user preferences in the user_settings collection.
All updates use upsert so the document is auto-created on first save.
"""

from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from ..database import get_database
from ..models.settings import UserSettingsOut, UserSettingsUpdate, NotificationPreferences, PrivacyPreferences


class SettingsService:

    @staticmethod
    async def get_settings(user_id: str) -> UserSettingsOut:
        """
        Retrieve settings for a user.
        Returns defaults if no document exists yet (lazy initialisation).
        """
        db = await get_database()
        doc = await db.user_settings.find_one({"user_id": user_id})

        if doc is None:
            # Return default settings without writing — write happens on first PUT
            return UserSettingsOut(
                user_id=user_id,
                theme="system",
                notifications=NotificationPreferences(),
                privacy=PrivacyPreferences(),
                updated_at=None,
            )

        return UserSettingsOut(
            user_id=doc["user_id"],
            theme=doc.get("theme", "system"),
            notifications=NotificationPreferences(**doc.get("notifications", {})),
            privacy=PrivacyPreferences(**doc.get("privacy", {})),
            updated_at=doc.get("updated_at"),
        )

    @staticmethod
    async def upsert_settings(user_id: str, data: UserSettingsUpdate) -> UserSettingsOut:
        """
        Partially update (or create) settings for a user.
        Only fields present in the request body are changed.
        """
        db = await get_database()

        # Fetch existing so we can merge rather than overwrite
        existing = await db.user_settings.find_one({"user_id": user_id})

        current_theme = existing.get("theme", "system") if existing else "system"
        current_notifications = existing.get("notifications", {}) if existing else {}
        current_privacy = existing.get("privacy", {}) if existing else {}

        # Merge top-level optional fields
        new_theme = data.theme if data.theme is not None else current_theme

        # Merge notifications sub-document
        if data.notifications is not None:
            merged_notifications = {
                **NotificationPreferences().model_dump(),
                **current_notifications,
                **data.notifications.model_dump(exclude_none=True),
            }
        else:
            merged_notifications = current_notifications or NotificationPreferences().model_dump()

        # Merge privacy sub-document
        if data.privacy is not None:
            merged_privacy = {
                **PrivacyPreferences().model_dump(),
                **current_privacy,
                **data.privacy.model_dump(exclude_none=True),
            }
        else:
            merged_privacy = current_privacy or PrivacyPreferences().model_dump()

        now = datetime.now(timezone.utc)

        await db.user_settings.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "user_id": user_id,
                    "theme": new_theme,
                    "notifications": merged_notifications,
                    "privacy": merged_privacy,
                    "updated_at": now,
                }
            },
            upsert=True,
        )

        return UserSettingsOut(
            user_id=user_id,
            theme=new_theme,
            notifications=NotificationPreferences(**merged_notifications),
            privacy=PrivacyPreferences(**merged_privacy),
            updated_at=now,
        )

    @staticmethod
    async def delete_account(user_id: str) -> None:
        """
        Hard-delete a user account and all associated data.
        Collections wiped: user_settings, journals, moods, chat_history,
        conversations, assessment_results.
        The user document in `users` is deleted last.
        """
        db = await get_database()

        await db.user_settings.delete_one({"user_id": user_id})
        await db.journals.delete_many({"user_id": user_id})
        await db.moods.delete_many({"user_id": user_id})
        await db.chat_history.delete_many({"user_id": user_id})
        await db.conversations.delete_many({"user_id": user_id})
        await db.assessment_results.delete_many({"user_id": user_id})
        await db.users.delete_one({"_id": ObjectId(user_id)})
