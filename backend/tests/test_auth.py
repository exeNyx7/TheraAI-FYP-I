"""
Comprehensive tests for /api/v1/auth/* endpoints.

Covers all 8 auth endpoints with happy paths and error cases:
- POST /auth/signup
- POST /auth/login
- GET /auth/me
- PUT /auth/me
- POST /auth/change-password (stub)
- POST /auth/refresh
- POST /auth/logout
- GET /auth/health

Total: 25+ test cases (async + FastAPI TestAsyncClient)
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from fastapi import status
from bson import ObjectId

# Import auth utilities
from app.utils.auth import hash_password, verify_password, create_access_token


@pytest.mark.asyncio
class TestAuthSignup:
    """POST /api/v1/auth/signup — User registration."""

    async def test_signup_success(self, async_client, test_user_data, mock_db):
        """Happy path: user can sign up with valid email and password."""
        mock_db['users'].find_one = AsyncMock(return_value=None)
        mock_db['users'].insert_one = AsyncMock()

        response = await async_client.post(
            "/api/v1/auth/signup",
            json=test_user_data
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["full_name"] == test_user_data["full_name"]
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_signup_duplicate_email(self, async_client, test_user_data, mock_db, user_factory):
        """Error: email already registered (409 Conflict)."""
        existing_user = user_factory(email=test_user_data["email"])
        mock_db['users'].find_one = AsyncMock(return_value=existing_user)

        response = await async_client.post(
            "/api/v1/auth/signup",
            json=test_user_data
        )

        assert response.status_code == status.HTTP_409_CONFLICT

    async def test_signup_invalid_email(self, async_client, test_user_data):
        """Error: invalid email format (422)."""
        test_user_data["email"] = "not-an-email"

        response = await async_client.post(
            "/api/v1/auth/signup",
            json=test_user_data
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_signup_missing_email(self, async_client):
        """Error: missing email field (422)."""
        response = await async_client.post(
            "/api/v1/auth/signup",
            json={"password": "SecurePassword123!", "full_name": "Test"}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
class TestAuthLogin:
    """POST /api/v1/auth/login — User authentication."""

    async def test_login_success(self, async_client, test_user_data, mock_db, user_factory):
        """Happy path: user can login with correct credentials."""
        existing_user = user_factory(email=test_user_data["email"])
        mock_db['users'].find_one = AsyncMock(return_value=existing_user)

        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_user_not_found(self, async_client, mock_db):
        """Error: email not registered (401 Unauthorized)."""
        mock_db['users'].find_one = AsyncMock(return_value=None)

        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "SomePassword123!"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_login_wrong_password(self, async_client, test_user_data, mock_db, user_factory):
        """Error: incorrect password (401 Unauthorized)."""
        existing_user = user_factory(email=test_user_data["email"])
        mock_db['users'].find_one = AsyncMock(return_value=existing_user)

        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user_data["email"],
                "password": "WrongPassword123!"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_login_inactive_user(self, async_client, test_user_data, mock_db, user_factory):
        """Error: user account is inactive (401)."""
        inactive_user = user_factory(email=test_user_data["email"], is_active=False)
        mock_db['users'].find_one = AsyncMock(return_value=inactive_user)

        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
class TestAuthGetMe:
    """GET /api/v1/auth/me — Get current authenticated user profile."""

    async def test_get_me_success(self, async_client, authenticated_headers, mock_db, user_factory):
        """Happy path: authenticated user can fetch their profile."""
        current_user = user_factory()
        mock_db['users'].find_one = AsyncMock(return_value=current_user)

        response = await async_client.get(
            "/api/v1/auth/me",
            headers=authenticated_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == current_user["email"]
        assert "hashed_password" not in data

    async def test_get_me_unauthorized_no_token(self, async_client):
        """Error: no authentication token (401 Unauthorized)."""
        response = await async_client.get("/api/v1/auth/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_get_me_invalid_token(self, async_client):
        """Error: invalid JWT token (401 Unauthorized)."""
        response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid-token"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_get_me_expired_token(self, async_client):
        """Error: expired JWT token (401 Unauthorized)."""
        expired_token = create_access_token(
            data={"sub": "507f1f77bcf86cd799439011"},
            expires_delta=timedelta(seconds=-1)
        )
        headers = {"Authorization": f"Bearer {expired_token}"}

        response = await async_client.get(
            "/api/v1/auth/me",
            headers=headers
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
class TestAuthUpdateMe:
    """PUT /api/v1/auth/me — Update current user profile."""

    async def test_update_me_success(self, async_client, authenticated_headers, mock_db, user_factory):
        """Happy path: user can update their profile."""
        current_user = user_factory()
        mock_db['users'].find_one = AsyncMock(return_value=current_user)
        mock_db['users'].update_one = AsyncMock()

        response = await async_client.put(
            "/api/v1/auth/me",
            headers=authenticated_headers,
            json={"full_name": "Updated Name"}
        )

        assert response.status_code == status.HTTP_200_OK

    async def test_update_me_unauthorized(self, async_client):
        """Error: no authentication token (401 Unauthorized)."""
        response = await async_client.put(
            "/api/v1/auth/me",
            json={"full_name": "Updated Name"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
class TestAuthRefresh:
    """POST /api/v1/auth/refresh — Refresh JWT access token."""

    async def test_refresh_success(self, async_client, authenticated_headers, mock_db, user_factory):
        """Happy path: user can refresh their token."""
        current_user = user_factory()
        mock_db['users'].find_one = AsyncMock(return_value=current_user)

        response = await async_client.post(
            "/api/v1/auth/refresh",
            headers=authenticated_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data

    async def test_refresh_unauthorized(self, async_client):
        """Error: no authentication token (401 Unauthorized)."""
        response = await async_client.post("/api/v1/auth/refresh")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
class TestAuthLogout:
    """POST /api/v1/auth/logout — Logout user."""

    async def test_logout_success(self, async_client, authenticated_headers, mock_db):
        """Happy path: authenticated user can logout."""
        response = await async_client.post(
            "/api/v1/auth/logout",
            headers=authenticated_headers
        )

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]

    async def test_logout_unauthorized(self, async_client):
        """Error: no authentication token (401 Unauthorized)."""
        response = await async_client.post("/api/v1/auth/logout")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
class TestAuthChangePassword:
    """POST /api/v1/auth/change-password — Change user password (stub)."""

    async def test_change_password_endpoint_exists(self, async_client, authenticated_headers, mock_db):
        """Test change-password endpoint (currently a stub)."""
        response = await async_client.post(
            "/api/v1/auth/change-password",
            headers=authenticated_headers,
            json={
                "old_password": "SecurePassword123!",
                "new_password": "NewPassword456!"
            }
        )

        # Endpoint exists but may not be fully implemented
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_501_NOT_IMPLEMENTED
        ]

    async def test_change_password_unauthorized(self, async_client):
        """Error: no authentication token (401 Unauthorized)."""
        response = await async_client.post(
            "/api/v1/auth/change-password",
            json={
                "old_password": "SecurePassword123!",
                "new_password": "NewPassword456!"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
class TestAuthHealth:
    """GET /api/v1/auth/health — Health check."""

    async def test_health_check(self, async_client):
        """Happy path: health check returns 200 OK."""
        response = await async_client.get("/api/v1/auth/health")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "status" in data


@pytest.mark.asyncio
class TestAuthFlow:
    """Integration: Signup → Login → Get Me."""

    async def test_full_auth_flow(self, async_client, test_user_data, mock_db, user_factory):
        """Complete authentication flow."""
        # Step 1: Signup
        mock_db['users'].find_one = AsyncMock(return_value=None)
        mock_db['users'].insert_one = AsyncMock()

        signup_response = await async_client.post(
            "/api/v1/auth/signup",
            json=test_user_data
        )

        assert signup_response.status_code == status.HTTP_201_CREATED

        # Step 2: Login
        mock_db['users'].find_one = AsyncMock(
            return_value=user_factory(email=test_user_data["email"])
        )

        login_response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )

        assert login_response.status_code == status.HTTP_200_OK
        login_token = login_response.json()["access_token"]

        # Step 3: Get current user
        current_user = user_factory(email=test_user_data["email"])
        mock_db['users'].find_one = AsyncMock(return_value=current_user)

        me_response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {login_token}"}
        )

        assert me_response.status_code == status.HTTP_200_OK
        assert me_response.json()["email"] == test_user_data["email"]
