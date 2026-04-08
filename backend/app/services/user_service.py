"""
User Service Layer for TheraAI Authentication System
Handles all user-related business logic and database operations
"""

from typing import Optional, List
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from bson import ObjectId

from ..database import get_users_collection
from ..models.user import UserIn, UserInDB, UserOut, UserUpdate, UserLogin, UserRole
from ..utils.auth import hash_password, verify_password
from ..config import get_settings

settings = get_settings()


class UserService:
    """Service class for user operations"""
    
    @staticmethod
    async def create_user(user_data: UserIn) -> UserOut:
        """
        Create a new user in the database
        
        Args:
            user_data (UserIn): User input data
            
        Returns:
            UserOut: Created user data
            
        Raises:
            HTTPException: If email already exists or creation fails
        """
        users_collection = await get_users_collection()
        
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        
        # Create user document
        hashed_password = hash_password(user_data.password)
        user_doc = UserInDB(
            email=user_data.email,
            full_name=user_data.full_name,
            role=user_data.role,
            hashed_password=hashed_password,
            is_active=user_data.is_active
        )
        
        try:
            # Insert user into database
            result = await users_collection.insert_one(user_doc.model_dump(by_alias=True, exclude={"id"}))
            
            # Get the created user
            created_user = await users_collection.find_one({"_id": result.inserted_id})
            if not created_user:
                # Fallback for mocked DB clients that don't emulate read-after-write.
                created_user = user_doc.model_dump(by_alias=True, exclude={"id", "hashed_password"})
                created_user["_id"] = result.inserted_id
            
            return UserOut.from_doc(created_user)
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user: {str(e)}"
            )
    
    @staticmethod
    async def authenticate_user(login_data: UserLogin) -> Optional[UserInDB]:
        """
        Authenticate user with email and password
        
        Args:
            login_data (UserLogin): Login credentials
            
        Returns:
            Optional[UserInDB]: User data if authentication successful, None otherwise
        """
        users_collection = await get_users_collection()
        
        # Find user by email
        user_doc = await users_collection.find_one({"email": login_data.email})
        if not user_doc:
            return None
        
        user = UserInDB.from_doc(user_doc)
        
        # Check if account is locked
        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            return None
        
        # Verify password
        if not verify_password(login_data.password, user.hashed_password):
            # Increment failed login attempts
            await UserService._increment_login_attempts(user.id)
            return None
        
        # Reset login attempts and update last login
        await UserService._reset_login_attempts(user.id)
        await UserService._update_last_login(user.id)
        
        return user
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[UserOut]:
        """
        Get user by ID
        
        Args:
            user_id (str): User ID
            
        Returns:
            Optional[UserOut]: User data if found, None otherwise
        """
        users_collection = await get_users_collection()
        
        try:
            user_doc = await users_collection.find_one({"_id": ObjectId(user_id)})
            if user_doc:
                return UserOut.from_doc(user_doc)
            return None
            
        except Exception:
            return None
    
    @staticmethod
    async def get_user_by_email(email: str) -> Optional[UserOut]:
        """
        Get user by email
        
        Args:
            email (str): User email
            
        Returns:
            Optional[UserOut]: User data if found, None otherwise
        """
        users_collection = await get_users_collection()
        
        user_doc = await users_collection.find_one({"email": email})
        if user_doc:
            return UserOut.from_doc(user_doc)
        return None
    
    @staticmethod
    async def update_user(user_id: str, user_data: UserUpdate) -> Optional[UserOut]:
        """
        Update user information
        
        Args:
            user_id (str): User ID
            user_data (UserUpdate): Updated user data
            
        Returns:
            Optional[UserOut]: Updated user data if successful, None otherwise
        """
        users_collection = await get_users_collection()
        
        try:
            # Prepare update data
            update_data = user_data.model_dump(exclude_unset=True)
            if update_data:
                update_data["updated_at"] = datetime.now(timezone.utc)
                
                # Update user
                result = await users_collection.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": update_data}
                )
                
                if result.modified_count > 0:
                    # Get updated user
                    updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})
                    if updated_user:
                        return UserOut.from_doc(updated_user)
            
            return None
            
        except Exception:
            return None
    
    @staticmethod
    async def delete_user(user_id: str) -> bool:
        """
        Delete user by ID (soft delete - set is_active to False)
        
        Args:
            user_id (str): User ID
            
        Returns:
            bool: True if successful, False otherwise
        """
        users_collection = await get_users_collection()
        
        try:
            result = await users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
            )
            return result.modified_count > 0
            
        except Exception:
            return False
    
    @staticmethod
    async def get_users_by_role(role: UserRole, skip: int = 0, limit: int = 100) -> List[UserOut]:
        """
        Get users by role with pagination
        
        Args:
            role (UserRole): User role
            skip (int): Number of documents to skip
            limit (int): Maximum number of documents to return
            
        Returns:
            List[UserOut]: List of users
        """
        users_collection = await get_users_collection()
        
        cursor = users_collection.find(
            {"role": role, "is_active": True}
        ).skip(skip).limit(limit).sort("created_at", -1)
        
        users = []
        async for user_doc in cursor:
            users.append(UserOut.from_doc(user_doc))
        
        return users
    
    @staticmethod
    async def get_all_users(skip: int = 0, limit: int = 100, include_inactive: bool = False) -> List[UserOut]:
        """
        Get all users with pagination
        
        Args:
            skip (int): Number of documents to skip
            limit (int): Maximum number of documents to return
            include_inactive (bool): Include inactive users
            
        Returns:
            List[UserOut]: List of users
        """
        users_collection = await get_users_collection()
        
        filter_query = {} if include_inactive else {"is_active": True}
        
        cursor = users_collection.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
        
        users = []
        async for user_doc in cursor:
            users.append(UserOut.from_doc(user_doc))
        
        return users
    
    @staticmethod
    async def count_users_by_role(role: Optional[UserRole] = None) -> int:
        """
        Count users by role
        
        Args:
            role (Optional[UserRole]): User role filter
            
        Returns:
            int: Number of users
        """
        users_collection = await get_users_collection()
        
        filter_query = {"is_active": True}
        if role:
            filter_query["role"] = role
        
        return await users_collection.count_documents(filter_query)
    
    @staticmethod
    async def _increment_login_attempts(user_id: ObjectId):
        """Increment failed login attempts and lock account if necessary"""
        users_collection = await get_users_collection()
        
        # Get current attempts
        user_doc = await users_collection.find_one({"_id": user_id})
        if user_doc:
            attempts = user_doc.get("login_attempts", 0) + 1
            update_data = {"login_attempts": attempts}
            
            # Lock account after 5 failed attempts for 15 minutes
            if attempts >= 5:
                update_data["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
            
            await users_collection.update_one(
                {"_id": user_id},
                {"$set": update_data}
            )
    
    @staticmethod
    async def _reset_login_attempts(user_id: ObjectId):
        """Reset failed login attempts"""
        users_collection = await get_users_collection()
        
        await users_collection.update_one(
            {"_id": user_id},
            {"$set": {"login_attempts": 0, "locked_until": None}}
        )
    
    @staticmethod
    async def _update_last_login(user_id: ObjectId):
        """Update user's last login timestamp"""
        users_collection = await get_users_collection()
        
        await users_collection.update_one(
            {"_id": user_id},
            {"$set": {"last_login": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}}
        )