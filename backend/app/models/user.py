"""
User Models and Schemas for TheraAI Authentication System
"""

from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from typing import Optional, List, Literal, Annotated
from datetime import datetime, timezone
from bson import ObjectId
from enum import Enum


# User role enumeration  
class UserRole(str, Enum):
    PATIENT = "patient"
    PSYCHIATRIST = "psychiatrist" 
    ADMIN = "admin"


# Custom ObjectId type for MongoDB
def validate_object_id(value: str) -> str:
    """Validate ObjectId string format"""
    if not ObjectId.is_valid(value):
        raise ValueError('Invalid ObjectId format')
    return value


# Type alias for ObjectId validation
PyObjectId = Annotated[str, Field(description="MongoDB ObjectId")]


class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non_binary"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class UserBase(BaseModel):
    """Base user model with common fields"""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    role: UserRole = Field(default=UserRole.PATIENT, description="User role in the system")
    is_active: bool = Field(default=True, description="User account status")

    # Demographics (all optional — collected after signup on Profile page)
    age: Optional[int] = Field(default=None, ge=13, le=120, description="User age")
    gender: Optional[GenderEnum] = Field(default=None, description="User gender")
    profession: Optional[str] = Field(default=None, max_length=100, description="User profession")
    location: Optional[str] = Field(default=None, max_length=150, description="City / region")
    bio: Optional[str] = Field(default=None, max_length=500, description="Short personal bio")
    phone: Optional[str] = Field(default=None, max_length=20, description="Phone number")
    emergency_contact: Optional[str] = Field(default=None, max_length=200, description="Emergency contact name + phone")
    avatar_url: Optional[str] = Field(default=None, description="Profile picture URL")
    preferred_language: Optional[str] = Field(default="en", max_length=10, description="ISO 639-1 language code")

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v):
        if not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip()


class UserIn(UserBase):
    """User input schema for registration"""
    password: str = Field(..., min_length=8, max_length=128, description="User password")
    confirm_password: str = Field(..., description="Password confirmation")
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v
    
    @field_validator("confirm_password")
    @classmethod
    def validate_passwords_match(cls, v, info):
        # This will be handled by model_validator instead
        return v
    
    def __init__(self, **data):
        # Validate passwords match before initialization
        if 'password' in data and 'confirm_password' in data:
            if data['password'] != data['confirm_password']:
                raise ValueError('Passwords do not match')
        super().__init__(**data)


class UserLogin(BaseModel):
    """User login schema"""
    email: EmailStr
    password: str = Field(..., min_length=1, description="User password")


class UserOut(UserBase):
    """User output schema (safe for API responses)"""
    id: Optional[str] = Field(default=None, alias="_id")
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    google_calendar_connected: bool = Field(default=False)
    
    @classmethod
    def from_doc(cls, doc: dict):
        """Create UserOut from MongoDB document"""
        if doc and '_id' in doc:
            doc['id'] = str(doc['_id'])
            del doc['_id']
        return cls(**doc)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda v: v.isoformat()}
    )


class UserInDB(UserBase):
    """User database model with hashed password"""
    id: Optional[str] = Field(default=None, alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None
    login_attempts: int = Field(default=0, description="Failed login attempts counter")
    locked_until: Optional[datetime] = None
    # Google Calendar integration
    google_refresh_token: Optional[str] = Field(default=None, description="Google OAuth2 refresh token")
    google_calendar_connected: bool = Field(default=False, description="Whether Google Calendar is connected")
    
    @classmethod
    def from_doc(cls, doc: dict):
        """Create UserInDB from MongoDB document"""
        if doc and '_id' in doc:
            doc['id'] = str(doc['_id'])
            del doc['_id']
        return cls(**doc)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda v: v.isoformat()}
    )


class UserUpdate(BaseModel):
    """User update schema (internal — accepts all mutable fields)"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    is_active: Optional[bool] = None
    age: Optional[int] = Field(None, ge=13, le=120)
    gender: Optional[GenderEnum] = None
    profession: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=150)
    bio: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=20)
    emergency_contact: Optional[str] = Field(None, max_length=200)
    avatar_url: Optional[str] = None
    preferred_language: Optional[str] = Field(None, max_length=10)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip() if v else v


class UserProfileUpdate(BaseModel):
    """User profile update schema (frontend — all demographic fields)"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    age: Optional[int] = Field(None, ge=13, le=120)
    gender: Optional[GenderEnum] = None
    profession: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=150)
    bio: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=20)
    emergency_contact: Optional[str] = Field(None, max_length=200)
    preferred_language: Optional[str] = Field(None, max_length=10)


class Token(BaseModel):
    """JWT token response schema"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Token expiration time in seconds")
    user: UserOut


class TokenData(BaseModel):
    """Token payload data"""
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None
    exp: Optional[datetime] = None


class PasswordChange(BaseModel):
    """Password change schema"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: str = Field(..., description="New password confirmation")
    
    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v
    
    @field_validator("confirm_password")
    @classmethod  
    def validate_passwords_match(cls, v, info):
        return v
    
    def __init__(self, **data):
        # Validate passwords match before initialization  
        if 'new_password' in data and 'confirm_password' in data:
            if data['new_password'] != data['confirm_password']:
                raise ValueError('Passwords do not match')
        super().__init__(**data)