"""
Unit tests for mood-based crisis escalation logic.

Tests the helper function _check_mood_escalation directly without
requiring a live DB — uses AsyncMock to simulate MongoDB.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId
from datetime import datetime, timezone


def _make_mood(mood_label: str) -> dict:
    return {
        "_id": ObjectId(),
        "user_id": "user123",
        "mood": mood_label,
        "created_at": datetime.now(timezone.utc),
    }


@pytest.mark.asyncio
async def test_escalation_fires_after_three_crisis_moods():
    """3 consecutive crisis moods → CrisisService.record_crisis_event is called."""
    crisis_moods = [_make_mood("sad"), _make_mood("anxious"), _make_mood("stressed")]

    mock_cursor = MagicMock()
    mock_cursor.sort = MagicMock(return_value=mock_cursor)
    mock_cursor.limit = MagicMock(return_value=mock_cursor)
    mock_cursor.to_list = AsyncMock(return_value=crisis_moods)

    mock_collection = MagicMock()
    mock_collection.find = MagicMock(return_value=mock_cursor)

    mock_db = MagicMock()
    mock_db.moods = mock_collection

    with patch("app.database.get_database", AsyncMock(return_value=mock_db)):
        with patch("app.services.crisis_service.CrisisService.record_crisis_event", new_callable=AsyncMock) as mock_record:
            from app.api.moods import _check_mood_escalation
            await _check_mood_escalation("user123", "stressed")
            mock_record.assert_called_once()
            call_args = mock_record.call_args[1] if mock_record.call_args[1] else {}
            assert call_args.get("severity") == "moderate"


@pytest.mark.asyncio
async def test_no_escalation_when_less_than_threshold():
    """Only 2 crisis moods → no escalation."""
    moods = [_make_mood("sad"), _make_mood("anxious")]

    mock_cursor = MagicMock()
    mock_cursor.sort = MagicMock(return_value=mock_cursor)
    mock_cursor.limit = MagicMock(return_value=mock_cursor)
    mock_cursor.to_list = AsyncMock(return_value=moods)

    mock_collection = MagicMock()
    mock_collection.find = MagicMock(return_value=mock_cursor)

    mock_db = MagicMock()
    mock_db.moods = mock_collection

    with patch("app.database.get_database", AsyncMock(return_value=mock_db)):
        with patch("app.services.crisis_service.CrisisService.record_crisis_event", new_callable=AsyncMock) as mock_record:
            from app.api.moods import _check_mood_escalation
            await _check_mood_escalation("user123", "anxious")
            mock_record.assert_not_called()


@pytest.mark.asyncio
async def test_no_escalation_for_happy_moods():
    """3 happy moods → no escalation even if threshold met."""
    happy_moods = [_make_mood("happy"), _make_mood("calm"), _make_mood("excited")]

    mock_cursor = MagicMock()
    mock_cursor.sort = MagicMock(return_value=mock_cursor)
    mock_cursor.limit = MagicMock(return_value=mock_cursor)
    mock_cursor.to_list = AsyncMock(return_value=happy_moods)

    mock_collection = MagicMock()
    mock_collection.find = MagicMock(return_value=mock_cursor)

    mock_db = MagicMock()
    mock_db.moods = mock_collection

    with patch("app.database.get_database", AsyncMock(return_value=mock_db)):
        with patch("app.services.crisis_service.CrisisService.record_crisis_event", new_callable=AsyncMock) as mock_record:
            from app.api.moods import _check_mood_escalation
            await _check_mood_escalation("user123", "happy")
            mock_record.assert_not_called()


@pytest.mark.asyncio
async def test_escalation_db_error_is_swallowed():
    """DB error must not propagate — escalation check is fire-and-forget."""
    with patch("app.database.get_database", AsyncMock(side_effect=Exception("db down"))):
        # Should not raise
        from app.api.moods import _check_mood_escalation
        await _check_mood_escalation("user123", "sad")
