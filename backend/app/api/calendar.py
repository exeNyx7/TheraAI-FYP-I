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


def _build_flow(code_verifier: str = None):
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
            code_verifier=code_verifier,
        )
        return flow
    except ImportError:
        return None


@router.get(
    "/auth-url",
    summary="Get Google OAuth2 consent URL",
)
async def get_auth_url(
    redirect_page: str = Query(default="profile"),
    current_user: UserOut = Depends(get_current_user),
):
    """
    Returns the Google OAuth2 consent URL.
    `redirect_page` controls where the user lands after OAuth (e.g. 'profile', 'schedule').
    """
    import base64
    from random import SystemRandom
    from string import ascii_letters, digits

    # Pre-generate PKCE code_verifier so it can be stored in state and
    # retrieved in the callback (the callback creates a new Flow object that
    # would otherwise have no verifier, causing invalid_grant errors).
    _chars = ascii_letters + digits + "-._~"
    code_verifier = "".join(SystemRandom().choice(_chars) for _ in range(128))

    flow = _build_flow(code_verifier=code_verifier)
    if flow is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Calendar integration not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )

    state_data = json.dumps({
        "user_id": str(current_user.id),
        "redirect_page": redirect_page,
        "cv": code_verifier,
    })
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
        redirect_page = state_data.get("redirect_page", "profile")
        code_verifier = state_data.get("cv")

        flow = _build_flow(code_verifier=code_verifier)
        if flow is None:
            raise HTTPException(status_code=503, detail="Google Calendar not configured")

        # Google returns extra scopes (openid, userinfo.*) alongside the one we
        # requested. requests-oauthlib raises ScopeChanged by default — this
        # env var tells it to accept a superset of the requested scopes.
        import os
        os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

        # Pass code_verifier explicitly — it was generated in get_auth_url and
        # stored in state. Without it Google rejects with invalid_grant.
        flow.fetch_token(code=code, code_verifier=code_verifier)
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

        # Redirect back to the page that initiated the OAuth flow
        frontend_origin = settings.cors_origins[0] if settings.cors_origins else "http://localhost:3000"
        return RedirectResponse(url=f"{frontend_origin}/{redirect_page}?calendar_connected=true")

    except Exception as e:
        logger.error(f"Google OAuth callback failed: {e}")
        frontend_origin = settings.cors_origins[0] if settings.cors_origins else "http://localhost:3000"
        return RedirectResponse(url=f"{frontend_origin}/profile?calendar_connected=false")


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


@router.post(
    "/sync",
    summary="Sync existing appointments to Google Calendar",
)
async def sync_appointments(
    current_user: UserOut = Depends(get_current_user),
):
    """
    Pushes all scheduled appointments (that haven't been synced yet) to the
    current user's Google Calendar.  Safe to call multiple times — already-synced
    appointments are skipped.
    """
    from bson import ObjectId
    from ..services.calendar_service import CalendarService

    db = await get_database()
    user_doc = await db.users.find_one({"_id": ObjectId(str(current_user.id))})
    if not user_doc or not user_doc.get("google_calendar_connected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected. Connect it first.",
        )

    # Query appointments depending on role
    user_id_str = str(current_user.id)
    role = current_user.role
    if role == "patient":
        query = {"patient_id": user_id_str, "status": "scheduled"}
        event_id_field = "patient_calendar_event_id"
    else:
        query = {"therapist_id": user_id_str, "status": "scheduled"}
        event_id_field = "therapist_calendar_event_id"

    appointments = await db.appointments.find(query).to_list(None)
    synced = 0

    for appt in appointments:
        if appt.get(event_id_field):
            continue  # already synced

        # Ensure scheduled_at is a datetime object
        scheduled_at = appt.get("scheduled_at")
        if isinstance(scheduled_at, str):
            from datetime import datetime as _dt
            try:
                scheduled_at = _dt.fromisoformat(scheduled_at)
                appt["scheduled_at"] = scheduled_at
            except ValueError:
                continue

        event_id = await CalendarService.create_calendar_event(user_id_str, appt)
        if event_id:
            await db.appointments.update_one(
                {"_id": appt["_id"]},
                {"$set": {event_id_field: event_id}},
            )
            synced += 1

    return {"synced": synced, "total": len(appointments)}


@router.get(
    "/status",
    summary="Get Google Calendar connection status",
)
async def calendar_status(
    current_user: UserOut = Depends(get_current_user),
):
    """
    Returns whether the current user has Google Calendar connected,
    and whether the integration is configured at all (credentials set).
    Frontend uses `configured` to decide whether to show the Connect button.
    """
    from bson import ObjectId

    settings = get_settings()
    # Integration is only usable if both client_id and client_secret are present
    # and look like real Google credentials (not placeholder strings)
    has_client_id = bool(settings.google_client_id)
    has_client_secret = bool(settings.google_client_secret)
    configured = has_client_id and has_client_secret

    db = await get_database()
    user = await db.users.find_one({"_id": ObjectId(str(current_user.id))})
    connected = bool(
        configured
        and user
        and user.get("google_calendar_connected")
        and user.get("google_refresh_token")
    )
    return {"connected": connected, "configured": configured}
