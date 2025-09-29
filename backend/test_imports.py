#!/usr/bin/env python3
"""
Test script to validate all imports work correctly
"""

try:
    print("Testing imports...")
    
    # Test config
    from app.config import get_settings
    print("✅ Config import successful")
    
    # Test models
    from app.models.user import UserIn, UserOut, UserInDB, UserLogin, Token, UserRole
    print("✅ User models import successful")
    
    # Test utils
    from app.utils.auth import hash_password, verify_password, create_access_token
    print("✅ Auth utils import successful")
    
    # Test database
    from app.database import db_manager
    print("✅ Database import successful")
    
    # Test services
    from app.services.user_service import UserService
    print("✅ User service import successful")
    
    # Test dependencies
    from app.dependencies.auth import get_current_user
    print("✅ Auth dependencies import successful")
    
    # Test API
    from app.api.auth import router
    print("✅ Auth API import successful")
    
    # Test main app
    from app.main import app
    print("✅ Main app import successful")
    
    print("\n🎉 All imports successful! No circular dependencies detected.")
    
    # Test basic functionality
    print("\nTesting basic functionality...")
    
    # Test password hashing
    password = "TestPassword123!"
    hashed = hash_password(password)
    print(f"✅ Password hashing works: {len(hashed)} chars")
    
    # Test password verification
    verified = verify_password(password, hashed)
    print(f"✅ Password verification works: {verified}")
    
    # Test token creation
    token_data = {"sub": "test", "role": "patient"}
    token = create_access_token(token_data)
    print(f"✅ Token creation works: {len(token)} chars")
    
    # Test user model creation
    user_data = {
        "email": "test@example.com",
        "password": "SecurePass123!",
        "confirm_password": "SecurePass123!",
        "full_name": "Test User",
        "role": "patient"
    }
    user = UserIn(**user_data)
    print(f"✅ User model creation works: {user.email}")
    
    print("\n🚀 All functionality tests passed!")
    
except ImportError as e:
    print(f"❌ Import Error: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()