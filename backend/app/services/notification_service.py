"""
Notification Service for TheraAI
Firebase Cloud Messaging (FCM) push notification sender + in-app DB notifications
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


async def create_notification(
    db,
    user_id: str,
    type: str,
    title: str,
    body: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Write an in-app notification to the notifications collection."""
    try:
        await db.notifications.insert_one({
            "user_id": user_id,
            "type": type,
            "title": title,
            "body": body,
            "read": False,
            "created_at": datetime.now(timezone.utc),
            "metadata": metadata or {},
        })
    except Exception as e:
        logger.error(f"Failed to create notification for user {user_id}: {e}")


class NotificationService:
    """Service for sending push notifications via Firebase Cloud Messaging"""

    _initialized: bool = False

    @classmethod
    def initialize(cls, credentials_path: str):
        """Initialize Firebase Admin SDK"""
        try:
            import firebase_admin
            from firebase_admin import credentials

            if not firebase_admin._apps:
                cred = credentials.Certificate(credentials_path)
                firebase_admin.initialize_app(cred)

            cls._initialized = True
            logger.info("Firebase Admin SDK initialized successfully")
        except ImportError:
            logger.warning("firebase-admin not installed — push notifications disabled. Run: pip install firebase-admin")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")

    @classmethod
    def is_initialized(cls) -> bool:
        return cls._initialized

    @staticmethod
    async def send_to_user(
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
    ) -> bool:
        """Send a push notification to all registered devices of a user."""
        if not NotificationService._initialized:
            logger.debug("FCM not initialized — skipping push notification")
            return False

        try:
            from firebase_admin import messaging
            from ..database import get_database

            db = await get_database()
            tokens_cursor = db.device_tokens.find({"user_id": user_id})
            tokens: List[str] = [doc["token"] async for doc in tokens_cursor]

            if not tokens:
                return False

            # Convert all data values to strings (FCM requirement)
            str_data = {k: str(v) for k, v in (data or {}).items()}

            message = messaging.MulticastMessage(
                notification=messaging.Notification(title=title, body=body),
                data=str_data,
                tokens=tokens,
            )
            response = messaging.send_each_for_multicast(message)

            # Clean up stale tokens
            stale_tokens = [
                tokens[i]
                for i, r in enumerate(response.responses)
                if not r.success and r.exception and "NOT_FOUND" in str(r.exception)
            ]
            if stale_tokens:
                await db.device_tokens.delete_many({"token": {"$in": stale_tokens}})
                logger.info(f"Removed {len(stale_tokens)} stale FCM token(s)")

            success_count = response.success_count
            logger.info(f"Push sent to user {user_id}: {success_count}/{len(tokens)} devices")
            return success_count > 0

        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
            return False

    @staticmethod
    async def send_to_token(
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
    ) -> bool:
        """Send a push notification to a single FCM token."""
        if not NotificationService._initialized:
            return False

        try:
            from firebase_admin import messaging

            str_data = {k: str(v) for k, v in (data or {}).items()}
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=str_data,
                token=token,
            )
            messaging.send(message)
            return True
        except Exception as e:
            logger.error(f"Failed to send push to token: {e}")
            return False
