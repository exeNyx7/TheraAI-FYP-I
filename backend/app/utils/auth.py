"""
Authentication Utilities for TheraAI Backend
Handles password hashing, JWT tokens, and user authentication
"""

from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status
from ..config import get_settings
from ..models.user import TokenData, UserRole

settings = get_settings()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt
    
    Args:
        password (str): Plain text password
        
    Returns:
        str: Hashed password
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash
    
    Args:
        plain_password (str): Plain text password
        hashed_password (str): Hashed password from database
        
    Returns:
        bool: True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    
    Args:
        data (dict): Token payload data
        expires_delta (Optional[timedelta]): Token expiration time
        
    Returns:
        str: JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def decode_token(token: str) -> TokenData:
    """
    Decode and validate a JWT token
    
    Args:
        token (str): JWT token string
        
    Returns:
        TokenData: Decoded token data
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        role: str = payload.get("role")
        exp: float = payload.get("exp")
        
        if user_id is None:
            raise credentials_exception
            
        # Check if token is expired
        if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        token_data = TokenData(
            user_id=user_id,
            email=email, 
            role=role,
            exp=datetime.utcfromtimestamp(exp) if exp else None
        )
        return token_data
        
    except JWTError:
        raise credentials_exception


def create_token_payload(user_id: str, email: str, role: UserRole) -> dict:
    """
    Create token payload dictionary
    
    Args:
        user_id (str): User ID
        email (str): User email
        role (UserRole): User role
        
    Returns:
        dict: Token payload
    """
    return {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": datetime.utcnow(),
        "type": "access_token"
    }


def get_token_expiry_time() -> int:
    """
    Get token expiry time in seconds
    
    Returns:
        int: Expiry time in seconds
    """
    return settings.access_token_expire_minutes * 60


def is_token_expired(token_data: TokenData) -> bool:
    """
    Check if token is expired
    
    Args:
        token_data (TokenData): Token data
        
    Returns:
        bool: True if expired, False otherwise
    """
    if not token_data.exp:
        return False
    return datetime.utcnow() > token_data.exp


def generate_password_reset_token(email: str) -> str:
    """
    Generate a password reset token
    
    Args:
        email (str): User email
        
    Returns:
        str: Password reset token
    """
    expires_delta = timedelta(hours=1)  # Reset token expires in 1 hour
    data = {
        "sub": email,
        "type": "password_reset",
        "iat": datetime.utcnow()
    }
    return create_access_token(data, expires_delta)


def verify_password_reset_token(token: str) -> Optional[str]:
    """
    Verify password reset token and return email
    
    Args:
        token (str): Password reset token
        
    Returns:
        Optional[str]: Email if token is valid, None otherwise
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        exp: float = payload.get("exp")
        
        if email is None or token_type != "password_reset":
            return None
            
        # Check if token is expired
        if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
            return None
            
        return email
        
    except JWTError:
        return None