"""
Google Calendar API Routes for TheraAI
OAuth2 flow to connect/disconnect Google Calendar and trigger syncs
"""

import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from ..models.user import UserOut
from ..dependencies.auth import get_current_user
from ..database import get_database
from ..config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calendar", tags=["Google Calendar"])

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


def _build_flow(state: str = ""):
    """Build a Google OAuth2 flow. Returns None if google libs not installed."""
    try:
        from google_auth_oauthlib.flow import Flow

        settings = get_settings()
        if not settings.google_client_id or not settings.google_client_secret:
            return None

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.google_redirect_uri],
                }
            },
            scopes=SCOPES,
            redirect_uri=settings.google_redirect_uri,
        )
        return flow
    except ImportError:
        return None


@router.get(
    "/auth-url",
    summary="Get Google OAuth2 consent URL",
)
async def get_auth_url(
    current_user: UserOut = Depends(get_current_user),
):
    """Returns the Google OAuth2 consent URL. Open it in a browser to connect Google Calendar."""
    flow = _build_flow()
    if flow is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Calendar integration not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )

    # Encode user_id in state param (simple encoding — not cryptographically signed)
    state_data = json.dumps({"user_id": str(current_user.id)})
    import base64
    state = base64.urlsafe_b64encode(state_data.encode()).decode()

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
    )

    return {"auth_url": auth_url}


@router.get(
    "/callback",
    summary="Google OAuth2 callback",
    include_in_schema=False,
)
async def oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
):
    """
    Google redirects here after OAuth consent.
    Exchanges the code for tokens and stores the refresh_token on the user.
    Then redirects back to the frontend settings page.
    """
    settings = get_settings()

    try:
        import base64
        from bson import ObjectId

        state_data = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
        user_id = state_data.get("user_id")

        flow = _build_flow(state=state)
        if flow is None:
            raise HTTPException(status_code=503, detail="Google Calendar not configured")

        flow.fetch_token(code=code)
        refresh_token = flow.credentials.refresh_token

        if refresh_token:
            db = await get_database()
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    "google_refresh_token": refresh_token,
                    "google_calendar_connected": True,
                    "updated_at": datetime.now(timezone.utc),
                }},
            )

        # Redirect to frontend settings page with success flag
        frontend_origin = settings.cors_origins[0] if settings.cors_origins else "http://localhost:5173"
        return RedirectResponse(url=f"{frontend_origin}/settings?calendar_connected=true")

    except Exception as e:
        logger.error(f"Google OAuth callback failed: {e}")
        frontend_origin = settings.cors_origins[0] if settings.cors_origins else "http://localhost:5173"
        return RedirectResponse(url=f"{frontend_origin}/settings?calendar_connected=false")


@router.post(
    "/disconnect",
    summary="Disconnect Google Calendar",
)
async def disconnect_calendar(
    current_user: UserOut = Depends(get_current_user),
):
    """Remove stored Google refresh token and disconnect calendar sync."""
    from bson import ObjectId

    db = await get_database()
    await db.users.update_one(
        {"_id": ObjectId(str(current_user.id))},
        {"$unset": {"google_refresh_token": ""}, "$set": {"google_calendar_connected": False}},
    )
    return {"message": "Google Calendar disconnected"}


@router.get(
    "/status",
    summary="Get Google Calendar connection status",
)
async def calendar_status(
    current_user: UserOut = Depends(get_current_user),
):
    """Returns whether the current user has Google Calendar connected."""
    from bson import ObjectId

    db = await get_database()
    user = await db.users.find_one({"_id": ObjectId(str(current_user.id))})
    connected = bool(user and user.get("google_calendar_connected") and user.get("google_refresh_token"))
    return {"connected": connected}
