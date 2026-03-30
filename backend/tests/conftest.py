"""
Shared pytest fixtures for TheraAI backend tests.

Provides:
- async_client: FastAPI TestAsyncClient for async endpoint testing
- mock_db: Mocked MongoDB collections using AsyncMock
- mock_ai_service: Mocked AIService (DistilBERT + RoBERTa models)
- mock_ollama: Mocked Ollama HTTP calls for chat
- test_user_data: Sample user for signup/login tests
- test_user_id: Sample ObjectId for authenticated requests
- authenticated_headers: Valid JWT Bearer token header
- user_factory: Factory to create varied test users
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId
from fastapi.testclient import TestAsyncClient

from app.main import app
from app.utils.auth import create_access_token, hash_password


# ─────────────────────────────────────────────────────────────────
# Test client
# ─────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def async_client():
    """FastAPI test client for async endpoints."""
    async with TestAsyncClient(app=app, base_url="http://test") as client:
        yield client


# ─────────────────────────────────────────────────────────────────
# Database mocking
# ─────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db(monkeypatch):
    """
    Mock MongoDB collections using AsyncMock.

    Returns a dict of collection mocks:
    {
        'users': AsyncMock(),
        'journals': AsyncMock(),
        'moods': AsyncMock(),
        'conversations': AsyncMock(),
        'chat_messages': AsyncMock(),
        'chat_history': AsyncMock(),
    }
    """
    mock_collections = {
        'users': AsyncMock(),
        'journals': AsyncMock(),
        'moods': AsyncMock(),
        'conversations': AsyncMock(),
        'chat_messages': AsyncMock(),
        'chat_history': AsyncMock(),
    }

    # Patch database manager to return mocked collections
    monkeypatch.setattr(
        "app.database.db",
        MagicMock(**mock_collections)
    )
    return mock_collections


# ─────────────────────────────────────────────────────────────────
# User and auth fixtures
# ─────────────────────────────────────────────────────────────────

@pytest.fixture
def test_user_data():
    """Sample user data for signup/login tests."""
    return {
        "email": "test@example.com",
        "password": "SecurePassword123!",
        "full_name": "Test User",
    }


@pytest.fixture
def test_user_id():
    """Sample ObjectId for authenticated requests."""
    return ObjectId()


@pytest.fixture
def authenticated_headers(test_user_id):
    """Valid JWT Bearer token header for authenticated requests."""
    token = create_access_token(
        data={"sub": str(test_user_id)},
        expires_delta=timedelta(minutes=30)
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_factory():
    """
    Factory to create varied test users with different roles and states.

    Usage:
        user = user_factory()  # Default patient
        admin = user_factory(role="admin")
        inactive = user_factory(is_active=False)
    """
    def _create_user(
        email="test@example.com",
        role="patient",
        is_active=True,
        full_name="Test User",
        password="SecurePassword123!"
    ):
        return {
            "_id": ObjectId(),
            "email": email,
            "full_name": full_name,
            "role": role,
            "is_active": is_active,
            "hashed_password": hash_password(password),
            "login_attempts": 0,
            "locked_until": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    return _create_user


@pytest.fixture
def psychiatrist_factory():
    """Factory to create psychiatrist users for role-based tests."""
    def _create_psychiatrist(email="therapist@example.com", full_name="Dr. Smith"):
        return {
            "_id": ObjectId(),
            "email": email,
            "full_name": full_name,
            "role": "psychiatrist",
            "is_active": True,
            "hashed_password": hash_password("SecurePassword123!"),
            "login_attempts": 0,
            "locked_until": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    return _create_psychiatrist


@pytest.fixture
def admin_factory():
    """Factory to create admin users for role-based tests."""
    def _create_admin(email="admin@example.com", full_name="Admin User"):
        return {
            "_id": ObjectId(),
            "email": email,
            "full_name": full_name,
            "role": "admin",
            "is_active": True,
            "hashed_password": hash_password("SecurePassword123!"),
            "login_attempts": 0,
            "locked_until": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    return _create_admin


# ─────────────────────────────────────────────────────────────────
# AI service mocking
# ─────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_ai_service(monkeypatch):
    """
    Mock AIService to avoid loading real transformer models.

    By default returns a POSITIVE sentiment response.
    Can be customized per test:

        mock_ai_service.analyze_text.return_value = {
            "sentiment_label": "NEGATIVE",
            ...
        }
    """
    mock_service = MagicMock()
    mock_service.analyze_text = AsyncMock(return_value={
        "sentiment_label": "POSITIVE",
        "sentiment_score": 0.92,
        "emotion_themes": ["joy", "gratitude"],
        "top_emotions": [
            {"emotion": "joy", "score": 0.85},
            {"emotion": "gratitude", "score": 0.78},
        ],
        "empathy_response": "That's wonderful! I'm glad you're feeling this way."
    })

    # Patch the AI service singleton
    monkeypatch.setattr(
        "app.services.ai_service.ai_service",
        mock_service
    )
    return mock_service


# ─────────────────────────────────────────────────────────────────
# Ollama/ModelService mocking
# ─────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_ollama(monkeypatch):
    """
    Mock Ollama HTTP calls via ModelService.

    By default returns a helpful therapy response.
    Can be customized per test to simulate timeouts or errors.
    """
    mock_response = AsyncMock()
    mock_response.json = AsyncMock(return_value={
        "message": {
            "content": (
                "I understand you're feeling anxious. That's a common experience. "
                "Let's explore what might be triggering these feelings and work through them together."
            )
        }
    })
    mock_response.status_code = 200

    # Patch httpx.AsyncClient.post to return mocked response
    monkeypatch.setattr(
        "httpx.AsyncClient.post",
        AsyncMock(return_value=mock_response)
    )
    return mock_response


# ─────────────────────────────────────────────────────────────────
# Sample data fixtures
# ─────────────────────────────────────────────────────────────────

@pytest.fixture
def sample_journal_data():
    """Sample journal entry data for creation tests."""
    return {
        "content": "Had a productive day at work. Feeling accomplished and proud of myself.",
        "mood": "happy",
    }


@pytest.fixture
def sample_journal_with_analysis(sample_journal_data):
    """Sample journal entry with AI analysis results."""
    return {
        **sample_journal_data,
        "_id": ObjectId(),
        "user_id": str(ObjectId()),
        "sentiment_label": "POSITIVE",
        "sentiment_score": 0.92,
        "emotion_themes": ["joy", "pride"],
        "top_emotions": [
            {"emotion": "joy", "score": 0.85},
            {"emotion": "pride", "score": 0.78},
        ],
        "empathy_response": "That's wonderful! I'm glad you're feeling accomplished.",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


@pytest.fixture
def sample_mood_data():
    """Sample mood entry data for creation tests."""
    return {
        "mood": "happy",
        "notes": "Had a great day!",
    }


@pytest.fixture
def sample_conversation_data():
    """Sample conversation data for conversation tests."""
    return {
        "title": "Session 1",
        "user_id": str(ObjectId()),
    }


@pytest.fixture
def sample_chat_message():
    """Sample chat message for conversation tests."""
    return {
        "conversation_id": str(ObjectId()),
        "user_id": str(ObjectId()),
        "content": "I'm feeling anxious about tomorrow",
        "sender": "user",
        "timestamp": datetime.now(timezone.utc),
    }


# ─────────────────────────────────────────────────────────────────
# Pytest configuration
# ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_mocks(monkeypatch):
    """Auto-reset all mocks between tests to ensure isolation."""
    # Fixtures like mock_db, mock_ai_service are created fresh per test
    # This ensures no state leakage between tests
    yield
