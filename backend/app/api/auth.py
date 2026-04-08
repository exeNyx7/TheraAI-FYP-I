"""
Authentication API Routes for TheraAI Backend
Handles user registration, login, and authentication endpoints
"""

from datetime import timedelta
import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from ..models.user import UserIn, UserLogin, UserOut, Token, PasswordChange, UserProfileUpdate
from ..services.user_service import UserService
from ..utils.auth import create_access_token, create_token_payload, get_token_expiry_time, verify_password, hash_password
from ..dependencies.auth import get_current_user, security
from ..dependencies.rate_limit import limiter
from fastapi import Request
from ..config import get_settings

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/signup",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Register a new user account and return a JWT token for immediate login"
)
@limiter.limit("5/minute")
async def signup(request: Request, user_data: UserIn) -> Token:
    """
    Register a new user account and auto-login.

    Returns the same Token shape as /login so the frontend can authenticate
    the user immediately after registration without a separate login step.
    """
    try:
        import asyncio
        user = await UserService.create_user(user_data)

        # Fire-and-forget welcome email (patient only) when email is enabled.
        if user.role == "patient" and settings.mail_enabled and not os.getenv("PYTEST_CURRENT_TEST"):
            from ..services.email_service import EmailService
            asyncio.create_task(EmailService.send_welcome_email(
                to_email=user.email,
                full_name=user.full_name or "User",
            ))

        # Issue a JWT so the frontend can auto-login
        token_payload = create_token_payload(
            user_id=str(user.id),
            email=user.email,
            role=user.role,
        )
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data=token_payload,
            expires_delta=access_token_expires,
        )

        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=get_token_expiry_time(),
            user=UserOut(**user.model_dump()),
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.exception("Failed to create user")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again."
        )


@router.post(
    "/login",
    response_model=Token,
    summary="User login", 
    description="Authenticate user and return JWT access token"
)
@limiter.limit("10/minute")
async def login(request: Request, login_data: UserLogin) -> Token:
    """
    Authenticate user and return JWT token
    
    - **email**: User's email address
    - **password**: User's password
    
    Returns JWT access token with user information
    """
    # Authenticate user
    user = await UserService.authenticate_user(login_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    token_payload = create_token_payload(
        user_id=str(user.id),
        email=user.email,
        role=user.role
    )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data=token_payload,
        expires_delta=access_token_expires
    )
    
    # Convert user to UserOut for response
    user_out = UserOut(**user.model_dump())
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=get_token_expiry_time(),
        user=user_out
    )


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current user",
    description="Get current authenticated user information"
)
async def get_current_user_info(
    current_user: UserOut = Depends(get_current_user)
) -> UserOut:
    """
    Get current authenticated user information
    
    Requires valid JWT token in Authorization header
    Returns current user data
    """
    return current_user


@router.put(
    "/me",
    response_model=UserOut,
    summary="Update current user",
    description="Update current authenticated user information"
)
async def update_current_user(
    update_data: UserProfileUpdate,
    current_user: UserOut = Depends(get_current_user)
) -> UserOut:
    """
    Update current authenticated user information
    
    Requires valid JWT token in Authorization header
    """
    from ..models.user import UserUpdate
    
    # Convert UserProfileUpdate to UserUpdate
    update_dict = update_data.model_dump(exclude_unset=True)
    internal_update_data = UserUpdate(**update_dict)
    
    updated_user = await UserService.update_user(str(current_user.id), internal_update_data)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )
    
    return updated_user


@router.post(
    "/change-password",
    summary="Change password",
    description="Change current user's password"
)
async def change_password(
    password_data: PasswordChange,
    current_user: UserOut = Depends(get_current_user)
):
    """
    Change current user's password
    
    - **current_password**: Current password for verification
    - **new_password**: New password (must meet strength requirements)
    - **confirm_password**: New password confirmation
    
    Requires valid JWT token in Authorization header
    """
    from bson import ObjectId
    from ..database import get_users_collection
    from datetime import datetime, timezone
    
    users_collection = await get_users_collection()
    user_doc = await users_collection.find_one({"_id": ObjectId(str(current_user.id))})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    if not verify_password(password_data.current_password, user_doc["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = hash_password(password_data.new_password)
    await users_collection.update_one(
        {"_id": ObjectId(str(current_user.id))},
        {"$set": {"hashed_password": new_hash, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Password changed successfully"}


@router.post(
    "/refresh",
    response_model=Token,
    summary="Refresh access token",
    description="Refresh JWT access token"
)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Token:
    """
    Refresh JWT access token
    
    Requires valid JWT token in Authorization header
    Returns new JWT access token
    """
    # Get current user to validate token
    from ..utils.auth import decode_token
    
    try:
        token_data = decode_token(credentials.credentials)
        user = await UserService.get_user_by_id(token_data.user_id)
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token or inactive user"
            )
        
        # Create new access token
        token_payload = create_token_payload(
            user_id=str(user.id),
            email=user.email,
            role=user.role
        )
        
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data=token_payload,
            expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=get_token_expiry_time(),
            user=user
        )
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh token"
        )


@router.post(
    "/logout",
    summary="User logout",
    description="Logout current user (client should discard token)"
)
async def logout(
    current_user: UserOut = Depends(get_current_user)
):
    """
    Logout current user
    
    Note: JWT tokens are stateless, so this endpoint mainly serves as a confirmation.
    The client should discard the token to complete the logout process.
    
    Requires valid JWT token in Authorization header
    """
    return {
        "message": f"User {current_user.email} logged out successfully",
        "note": "Please discard your access token"
    }


@router.delete(
    "/account",
    summary="Delete account",
    description="Permanently deactivate and delete the current user's account and all associated data"
)
async def delete_account(
    current_user: UserOut = Depends(get_current_user)
):
    """
    Delete the current user's account.
    Removes user data and deactivates the account.
    Requires valid JWT token in Authorization header.
    """
    from ..database import get_database
    from bson import ObjectId
    from datetime import datetime, timezone

    uid = ObjectId(str(current_user.id))
    db = await get_database()

    # Hard-delete all user-owned data across collections
    collections_to_clean = [
        "chat_history", "journal_entries", "mood_entries",
        "appointments", "assessment_results", "notifications",
    ]
    for col in collections_to_clean:
        try:
            await db[col].delete_many({"user_id": str(current_user.id)})
        except Exception:
            pass  # best-effort cleanup

    # Hard-delete the user document itself
    users_collection = await get_users_collection()
    await users_collection.delete_one({"_id": uid})

    return {"message": "Account deleted successfully"}


# ─── Password Reset Flow ──────────────────────────────────────────────────────

@router.post("/forgot-password", summary="Request a password reset OTP")
async def forgot_password(payload: dict):
    """
    Send a 6-digit OTP to the user's email if the address is registered.
    Always returns the same message to prevent email enumeration.
    """
    import secrets
    import hashlib
    from datetime import datetime, timezone, timedelta
    from ..database import get_database
    from ..services.email_service import EmailService

    email = payload.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    db = await get_database()
    user_doc = await db.users.find_one({"email": email})

    # Always return success-like message (no email enumeration)
    MSG = {"message": "If that email is registered, an OTP has been sent."}

    if not user_doc:
        return MSG

    # Generate OTP and store hashed copy
    otp = str(secrets.randbelow(900000) + 100000)  # 100000–999999
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    await db.password_reset_otps.update_one(
        {"email": email},
        {"$set": {"email": email, "otp_hash": otp_hash, "expires_at": expires_at, "used": False}},
        upsert=True,
    )

    import asyncio
    asyncio.create_task(EmailService.send_otp_email(to_email=email, otp=otp))

    return MSG


@router.post("/verify-otp", summary="Verify the password reset OTP")
async def verify_otp(payload: dict):
    """
    Validate the OTP and return a short-lived reset token (10 min JWT).
    """
    import hashlib
    from datetime import datetime, timezone, timedelta
    from ..database import get_database

    email = payload.get("email", "").strip().lower()
    otp   = payload.get("otp", "").strip()

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required")

    db = await get_database()
    record = await db.password_reset_otps.find_one({"email": email})

    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Check expiry
    expires_at = record.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    # Check used
    if record.get("used"):
        raise HTTPException(status_code=400, detail="OTP has already been used.")

    # Verify hash
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    if otp_hash != record.get("otp_hash"):
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check and try again.")

    # Mark as used
    await db.password_reset_otps.update_one({"email": email}, {"$set": {"used": True}})

    # Issue a short-lived reset token (email as sub, 10 min)
    reset_token = create_access_token(
        data={"sub": email, "purpose": "password_reset"},
        expires_delta=timedelta(minutes=10),
    )

    return {"reset_token": reset_token, "email": email}


@router.post("/reset-password", summary="Reset password using a valid reset token")
async def reset_password(payload: dict):
    """
    Set a new password given a valid reset_token returned by /verify-otp.
    """
    from jose import JWTError, jwt
    from ..database import get_database

    reset_token   = payload.get("reset_token", "")
    new_password  = payload.get("new_password", "")
    confirm_password = payload.get("confirm_password", "")

    if not reset_token or not new_password:
        raise HTTPException(status_code=400, detail="reset_token and new_password are required")

    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    # Validate password strength
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not any(c.isupper() for c in new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not any(c.islower() for c in new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    if not any(c.isdigit() for c in new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one digit")

    # Verify the reset token
    try:
        payload_data = jwt.decode(
            reset_token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        email = payload_data.get("sub")
        purpose = payload_data.get("purpose")
        if not email or purpose != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid reset token")
    except JWTError:
        raise HTTPException(status_code=400, detail="Reset token is invalid or expired")

    # Update password
    db = await get_database()
    hashed = hash_password(new_password)
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"hashed_password": hashed}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Password reset successfully. You can now log in with your new password."}


# Health check for auth service
@router.get(
    "/health",
    summary="Authentication service health check",
    description="Check if authentication service is working"
)
async def auth_health_check():
    """Check authentication service health"""
    return {
        "service": "authentication",
        "status": "healthy",
        "features": {
            "signup": "enabled",
            "login": "enabled", 
            "jwt_auth": "enabled",
            "role_based_access": "enabled"
        }
    }