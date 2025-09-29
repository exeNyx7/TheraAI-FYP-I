"""
Unit tests for authentication system - FIXED VERSION
Tests user models, auth utilities, services, and API endpoints
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi import HTTPException
from bson import ObjectId

# Import the app and dependencies
from app.main import app
from app.models.user import UserIn, UserOut, UserInDB, UserRole
from app.utils.auth import (
    hash_password, 
    verify_password, 
    create_access_token, 
    decode_token
)
from app.services.user_service import UserService

# Test client for API testing
client = TestClient(app)


class TestUserModels:
    """Test user data models and validation"""
    
    def test_user_in_model_valid(self):
        """Test valid UserIn model creation"""
        user_data = {
            "email": "test@example.com",
            "password": "SecurePass123!",
            "confirm_password": "SecurePass123!",
            "full_name": "Test User",
            "role": "patient"
        }
        user = UserIn(**user_data)
        assert user.email == "test@example.com"
        assert user.role == UserRole.PATIENT
    
    def test_user_in_model_invalid_email(self):
        """Test UserIn model with invalid email"""
        with pytest.raises(ValueError):
            UserIn(
                email="invalid-email",
                password="SecurePass123!",
                confirm_password="SecurePass123!",
                full_name="Test User",
                role="patient"
            )
    
    def test_user_in_model_weak_password(self):
        """Test UserIn model with weak password"""
        with pytest.raises(ValueError):
            UserIn(
                email="test@example.com",
                password="123",  # Too short
                confirm_password="123",
                full_name="Test User",
                role="patient"
            )
    
    def test_user_out_model(self):
        """Test UserOut model excludes password"""
        user_data = {
            "id": "507f1f77bcf86cd799439011",
            "email": "test@example.com",
            "full_name": "Test User",
            "role": "patient",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        user = UserOut(**user_data)
        assert user.email == "test@example.com"
        assert not hasattr(user, 'password')
    
    def test_user_role_enum(self):
        """Test UserRole enum values"""
        assert UserRole.PATIENT == "patient"
        assert UserRole.PSYCHIATRIST == "psychiatrist"
        assert UserRole.ADMIN == "admin"


class TestAuthUtils:
    """Test authentication utilities"""
    
    def test_hash_password(self):
        """Test password hashing"""
        password = "TestPassword123!"
        hashed = hash_password(password)
        
        assert hashed != password
        assert len(hashed) > 0
        assert hashed.startswith("$2b$")
    
    def test_verify_password(self):
        """Test password verification"""
        password = "TestPassword123!"
        hashed = hash_password(password)
        
        # Correct password should verify
        assert verify_password(password, hashed) is True
        
        # Wrong password should not verify
        assert verify_password("WrongPassword", hashed) is False
    
    def test_create_access_token(self):
        """Test JWT token creation"""
        data = {"sub": "user123", "role": "patient"}
        token = create_access_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        assert "." in token  # JWT format has dots
    
    def test_create_access_token_with_expiry(self):
        """Test JWT token creation with custom expiry"""
        data = {"sub": "user123", "email": "test@example.com"}
        expires_delta = timedelta(minutes=15)
        token = create_access_token(data, expires_delta)
        
        assert isinstance(token, str)
        # Verify token contains expiry claim
        payload = decode_token(token)
        assert "exp" in payload.__dict__
    
    def test_decode_token_valid(self):
        """Test valid token decoding"""
        data = {"sub": "user123", "email": "test@example.com", "role": "patient"}
        token = create_access_token(data)
        
        payload = decode_token(token)
        assert payload.user_id == "user123"
        assert payload.email == "test@example.com"
        assert payload.role == "patient"
    
    def test_decode_token_invalid(self):
        """Test invalid token decoding"""
        with pytest.raises(HTTPException) as exc_info:
            decode_token("invalid_token")
        assert exc_info.value.status_code == 401


class TestUserService:
    """Test user service business logic"""
    
    def test_user_service_exists(self):
        """Test that UserService class exists and has required methods"""
        assert hasattr(UserService, 'create_user')
        assert hasattr(UserService, 'authenticate_user')
        assert hasattr(UserService, 'get_user_by_id')
        assert hasattr(UserService, 'get_user_by_email')


class TestAuthAPI:
    """Test authentication API endpoints"""
    
    def test_signup_endpoint_invalid_data(self):
        """Test signup with invalid data"""
        invalid_data = {
            "email": "invalid-email",
            "password": "123",  # Too short
            "full_name": "",
            "role": "invalid_role"
        }
        
        response = client.post("/api/v1/auth/signup", json=invalid_data)
        assert response.status_code == 422  # Validation error
    
    def test_login_endpoint_format(self):
        """Test login endpoint expects correct format"""
        # Test with missing fields
        response = client.post("/api/v1/auth/login", json={})
        assert response.status_code == 422
        
        # Test with invalid format
        response = client.post("/api/v1/auth/login", json={"email": "test"})
        assert response.status_code == 422


class TestIntegration:
    """Integration tests for the complete auth system"""
    
    def test_health_endpoint(self):
        """Test application health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "service" in data
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "status" in data
    
    def test_api_info_endpoint(self):
        """Test API info endpoint"""
        response = client.get("/api/v1")
        assert response.status_code == 200
        
        data = response.json()
        assert "version" in data
        assert "endpoints" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])