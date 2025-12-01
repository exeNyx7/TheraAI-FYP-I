"""
Tests for Journal API Endpoints
Comprehensive testing for mood tracking and journaling features
"""

import pytest
from httpx import AsyncClient
from datetime import datetime
from unittest.mock import patch, MagicMock

from app.main import app
from app.models.journal import MoodType, SentimentLabel, AIAnalysisResult


# Mock AI service to avoid loading the model during tests
@pytest.fixture
def mock_ai_service():
    """Mock AI service for testing without loading the actual model"""
    with patch('app.services.journal_service.get_ai_service') as mock:
        # Create a mock AI service
        mock_service = MagicMock()
        mock_service.analyze_text.return_value = AIAnalysisResult(
            label=SentimentLabel.POSITIVE,
            score=0.9234,
            empathy_text="Test empathy response"
        )
        mock.return_value = mock_service
        yield mock_service


@pytest.mark.asyncio
class TestJournalAPI:
    """Test cases for Journal API endpoints"""
    
    async def test_create_journal_entry_success(self, mock_ai_service):
        """Test creating a journal entry successfully"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # First, create a user and login
            signup_data = {
                "email": "journal_user@test.com",
                "password": "TestPass123",
                "confirm_password": "TestPass123",
                "full_name": "Journal Test User",
                "role": "patient"
            }
            await client.post("/api/v1/auth/signup", json=signup_data)
            
            # Login to get token
            login_data = {
                "email": "journal_user@test.com",
                "password": "TestPass123"
            }
            login_response = await client.post("/api/v1/auth/login", json=login_data)
            token = login_response.json()["access_token"]
            
            # Create journal entry
            journal_data = {
                "content": "Today was a wonderful day! I accomplished all my goals.",
                "mood": "happy",
                "title": "Great Day"
            }
            
            response = await client.post(
                "/api/v1/journals/",
                json=journal_data,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 201
            data = response.json()
            assert data["content"] == journal_data["content"]
            assert data["mood"] == journal_data["mood"]
            assert data["title"] == journal_data["title"]
            assert data["sentiment_label"] == "positive"
            assert data["sentiment_score"] == 0.9234
            assert data["empathy_response"] == "Test empathy response"
            assert "id" in data
            assert "user_id" in data
            assert "created_at" in data
    
    async def test_create_journal_entry_without_auth(self):
        """Test creating journal entry without authentication fails"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            journal_data = {
                "content": "This should fail without auth.",
                "mood": "neutral"
            }
            
            response = await client.post("/api/v1/journals/", json=journal_data)
            assert response.status_code == 401
    
    async def test_create_journal_entry_invalid_content(self, mock_ai_service):
        """Test creating journal entry with invalid content"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Setup auth
            signup_data = {
                "email": "invalid_content@test.com",
                "password": "TestPass123",
                "confirm_password": "TestPass123",
                "full_name": "Invalid Test User",
                "role": "patient"
            }
            await client.post("/api/v1/auth/signup", json=signup_data)
            
            login_data = {
                "email": "invalid_content@test.com",
                "password": "TestPass123"
            }
            login_response = await client.post("/api/v1/auth/login", json=login_data)
            token = login_response.json()["access_token"]
            
            # Test with content too short
            journal_data = {
                "content": "Short",  # Less than 10 characters
                "mood": "happy"
            }
            
            response = await client.post(
                "/api/v1/journals/",
                json=journal_data,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 422  # Validation error
    
    async def test_get_journal_entries(self, mock_ai_service):
        """Test retrieving user's journal entries"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Setup auth
            signup_data = {
                "email": "get_journals@test.com",
                "password": "TestPass123",
                "confirm_password": "TestPass123",
                "full_name": "Get Journals User",
                "role": "patient"
            }
            await client.post("/api/v1/auth/signup", json=signup_data)
            
            login_data = {
                "email": "get_journals@test.com",
                "password": "TestPass123"
            }
            login_response = await client.post("/api/v1/auth/login", json=login_data)
            token = login_response.json()["access_token"]
            
            # Create multiple journal entries
            for i in range(3):
                journal_data = {
                    "content": f"Journal entry number {i + 1}. This is a test entry with enough content.",
                    "mood": "happy",
                    "title": f"Entry {i + 1}"
                }
                await client.post(
                    "/api/v1/journals/",
                    json=journal_data,
                    headers={"Authorization": f"Bearer {token}"}
                )
            
            # Get all entries
            response = await client.get(
                "/api/v1/journals/",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 3
    
    async def test_get_journal_entries_pagination(self, mock_ai_service):
        """Test pagination for journal entries"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Setup auth
            signup_data = {
                "email": "pagination@test.com",
                "password": "TestPass123",
                "confirm_password": "TestPass123",
                "full_name": "Pagination User",
                "role": "patient"
            }
            await client.post("/api/v1/auth/signup", json=signup_data)
            
            login_data = {
                "email": "pagination@test.com",
                "password": "TestPass123"
            }
            login_response = await client.post("/api/v1/auth/login", json=login_data)
            token = login_response.json()["access_token"]
            
            # Create 5 entries
            for i in range(5):
                journal_data = {
                    "content": f"Pagination test entry {i + 1} with sufficient content for validation.",
                    "mood": "neutral"
                }
                await client.post(
                    "/api/v1/journals/",
                    json=journal_data,
                    headers={"Authorization": f"Bearer {token}"}
                )
            
            # Get with pagination
            response = await client.get(
                "/api/v1/journals/?skip=2&limit=2",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2  # Should return 2 items
    
    async def test_get_single_journal_entry(self, mock_ai_service):
        """Test retrieving a single journal entry by ID"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Setup auth
            signup_data = {
                "email": "single_entry@test.com",
                "password": "TestPass123",
                "confirm_password": "TestPass123",
                "full_name": "Single Entry User",
                "role": "patient"
            }
            await client.post("/api/v1/auth/signup", json=signup_data)
            
            login_data = {
                "email": "single_entry@test.com",
                "password": "TestPass123"
            }
            login_response = await client.post("/api/v1/auth/login", json=login_data)
            token = login_response.json()["access_token"]
            
            # Create an entry
            journal_data = {
                "content": "This is a specific entry to retrieve later with enough content.",
                "mood": "calm",
                "title": "Specific Entry"
            }
            create_response = await client.post(
                "/api/v1/journals/",
                json=journal_data,
                headers={"Authorization": f"Bearer {token}"}
            )
            entry_id = create_response.json()["id"]
            
            # Get the specific entry
            response = await client.get(
                f"/api/v1/journals/{entry_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == entry_id
            assert data["title"] == "Specific Entry"
    
    async def test_get_nonexistent_journal_entry(self, mock_ai_service):
        """Test retrieving a non-existent journal entry"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Setup auth
            signup_data = {
                "email": "nonexistent@test.com",
                "password": "TestPass123",
                "confirm_password": "TestPass123",
                "full_name": "Nonexistent User",
                "role": "patient"
            }
            await client.post("/api/v1/auth/signup", json=signup_data)
            
            login_data = {
                "email": "nonexistent@test.com",
                "password": "TestPass123"
            }
            login_response = await client.post("/api/v1/auth/login", json=login_data)
            token = login_response.json()["access_token"]
            
            # Try to get non-existent entry
            fake_id = "507f1f77bcf86cd799439011"
            response = await client.get(
                f"/api/v1/journals/{fake_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 404
    
    async def test_delete_journal_entry(self, mock_ai_service):
        """Test deleting a journal entry"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Setup auth
            signup_data = {
                "email": "delete_entry@test.com",
                "password": "TestPass123",
                "confirm_password": "TestPass123",
                "full_name": "Delete Entry User",
                "role": "patient"
            }
            await client.post("/api/v1/auth/signup", json=signup_data)
            
            login_data = {
                "email": "delete_entry@test.com",
                "password": "TestPass123"
            }
            login_response = await client.post("/api/v1/auth/login", json=login_data)
            token = login_response.json()["access_token"]
            
            # Create an entry
            journal_data = {
                "content": "This entry will be deleted with enough content for validation.",
                "mood": "neutral"
            }
            create_response = await client.post(
                "/api/v1/journals/",
                json=journal_data,
                headers={"Authorization": f"Bearer {token}"}
            )
            entry_id = create_response.json()["id"]
            
            # Delete the entry
            delete_response = await client.delete(
                f"/api/v1/journals/{entry_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert delete_response.status_code == 204
            
            # Verify it's deleted
            get_response = await client.get(
                f"/api/v1/journals/{entry_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert get_response.status_code == 404
    
    async def test_get_mood_statistics(self, mock_ai_service):
        """Test retrieving mood statistics"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Setup auth
            signup_data = {
                "email": "stats@test.com",
                "password": "TestPass123",
                "confirm_password": "TestPass123",
                "full_name": "Stats User",
                "role": "patient"
            }
            await client.post("/api/v1/auth/signup", json=signup_data)
            
            login_data = {
                "email": "stats@test.com",
                "password": "TestPass123"
            }
            login_response = await client.post("/api/v1/auth/login", json=login_data)
            token = login_response.json()["access_token"]
            
            # Create entries with different moods
            moods = ["happy", "sad", "happy", "anxious", "happy"]
            for mood in moods:
                journal_data = {
                    "content": f"Entry with {mood} mood and enough content for validation.",
                    "mood": mood
                }
                await client.post(
                    "/api/v1/journals/",
                    json=journal_data,
                    headers={"Authorization": f"Bearer {token}"}
                )
            
            # Get statistics
            response = await client.get(
                "/api/v1/journals/stats",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["total_entries"] == 5
            assert "mood_counts" in data
            assert "sentiment_distribution" in data
            assert "most_common_mood" in data
            assert data["most_common_mood"] == "happy"  # 3 out of 5
