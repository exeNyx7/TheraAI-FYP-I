"""
Authentication Dependencies for TheraAI Backend
Provides dependency injection for protected routes
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from ..utils.auth import decode_token
from ..services.user_service import UserService
from ..models.user import UserOut, TokenData, UserRole
from cachetools import TTLCache

# HTTP Bearer token security scheme
security = HTTPBearer()

# Cache for user lookups to reduce database load
_user_cache = TTLCache(maxsize=1024, ttl=60)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserOut:
    """
    Dependency to get current authenticated user
    
    Args:
        credentials: HTTP Authorization credentials
        
    Returns:
        UserOut: Current user data
        
    Raises:
        HTTPException: If authentication fails
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode token
        token_data: TokenData = decode_token(credentials.credentials)
        
        # Check cache first
        if token_data.user_id in _user_cache:
            user = _user_cache[token_data.user_id]
        else:
            # Get user from database
            user = await UserService.get_user_by_id(token_data.user_id)
            if user:
                _user_cache[token_data.user_id] = user
                
        if user is None:
            raise credentials_exception
            
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Inactive user account",
            )
            
        return user
        
    except HTTPException:
        raise
    except Exception:
        raise credentials_exception


async def get_current_active_user(
    current_user: UserOut = Depends(get_current_user)
) -> UserOut:
    """
    Dependency to get current active user (alias for get_current_user)
    
    Args:
        current_user: Current user from get_current_user dependency
        
    Returns:
        UserOut: Current active user data
    """
    return current_user


def require_role(required_role: UserRole):
    """
    Dependency factory to require specific user role
    
    Args:
        required_role: Required user role
        
    Returns:
        Dependency function that checks user role
    """
    async def role_checker(current_user: UserOut = Depends(get_current_user)) -> UserOut:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}"
            )
        return current_user
    
    return role_checker


def require_roles(allowed_roles: list[UserRole]):
    """
    Dependency factory to require one of multiple user roles
    
    Args:
        allowed_roles: List of allowed user roles
        
    Returns:
        Dependency function that checks user role
    """
    async def roles_checker(current_user: UserOut = Depends(get_current_user)) -> UserOut:
        if current_user.role not in allowed_roles:
            roles_str = ", ".join(allowed_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {roles_str}"
            )
        return current_user
    
    return roles_checker


# Role-specific dependencies
async def get_current_admin(
    current_user: UserOut = Depends(require_role("admin"))
) -> UserOut:
    """Dependency to get current admin user"""
    return current_user


async def get_current_psychiatrist(
    current_user: UserOut = Depends(require_role("psychiatrist"))
) -> UserOut:
    """Dependency to get current psychiatrist user"""
    return current_user


async def get_current_patient(
    current_user: UserOut = Depends(require_role("patient"))
) -> UserOut:
    """Dependency to get current patient user"""
    return current_user


async def get_current_staff(
    current_user: UserOut = Depends(require_roles(["admin", "psychiatrist"]))
) -> UserOut:
    """Dependency to get current staff user (admin or psychiatrist)"""
    return current_user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[UserOut]:
    """
    Dependency to optionally get current user (doesn't raise error if no token)
    
    Args:
        credentials: Optional HTTP Authorization credentials
        
    Returns:
        Optional[UserOut]: Current user data if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    try:
        # Decode token
        token_data: TokenData = decode_token(credentials.credentials)
        
        # Get user from database
        user = await UserService.get_user_by_id(token_data.user_id)
        if user and user.is_active:
            return user
            
    except Exception:
        pass
    
    return None