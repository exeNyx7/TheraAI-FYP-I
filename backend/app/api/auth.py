"""
Authentication API Routes for TheraAI Backend
Handles user registration, login, and authentication endpoints
"""

from datetime import timedelta
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
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Register a new user account with email, password, and role"
)
@limiter.limit("5/minute")
async def signup(request: Request, user_data: UserIn) -> UserOut:
    """
    Register a new user account
    
    - **email**: Valid email address (must be unique)
    - **password**: Strong password (min 8 chars, must contain uppercase, lowercase, digit)
    - **confirm_password**: Password confirmation (must match password)
    - **full_name**: User's full name
    - **role**: User role (patient, psychiatrist, admin) - defaults to patient
    - **is_active**: Account status - defaults to True
    
    Returns the created user data (without password)
    """
    try:
        import asyncio
        user = await UserService.create_user(user_data)
        # Fire-and-forget welcome email (patient only)
        if user.role == "patient":
            from ..services.email_service import EmailService
            asyncio.create_task(EmailService.send_welcome_email(
                to_email=user.email,
                full_name=user.full_name or "User",
            ))
        return user
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
    user_out = UserOut(**user.dict())
    
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