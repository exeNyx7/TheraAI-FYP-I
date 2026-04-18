"""
Unit tests for CrisisService — keyword detection and severity classification.
These tests run purely in memory with no database or AI model calls.
"""

import pytest
from app.services.crisis_service import CrisisService


# ── Keyword detection ─────────────────────────────────────────────────────────

def test_emergency_keyword_detected():
    result = CrisisService.detect_crisis("I want to kill myself")
    assert result["is_crisis"] is True
    assert result["severity"] == "emergency"
    assert result["show_book_therapist"] is True


def test_high_keyword_detected():
    result = CrisisService.detect_crisis("I feel so hopeless, I just want to hurt myself")
    assert result["is_crisis"] is True
    assert result["severity"] == "high"
    assert result["show_book_therapist"] is True


def test_moderate_keyword_detected():
    result = CrisisService.detect_crisis("I've been feeling empty and can't cope anymore")
    assert result["is_crisis"] is True
    assert result["severity"] == "moderate"
    assert result["show_book_therapist"] is False


def test_normal_message_no_crisis():
    result = CrisisService.detect_crisis("I had a great day today, feeling calm and happy")
    assert result["is_crisis"] is False
    assert result["severity"] == "none"
    assert result["show_book_therapist"] is False


def test_empty_message_no_crisis():
    result = CrisisService.detect_crisis("")
    assert result["is_crisis"] is False


def test_case_insensitive_detection():
    result = CrisisService.detect_crisis("I AM SUICIDAL")
    assert result["is_crisis"] is True
    assert result["severity"] == "emergency"


# ── Emotion-based detection ───────────────────────────────────────────────────

def test_grief_combo_triggers_moderate():
    emotions = [
        {"label": "grief", "score": 0.85},
        {"label": "remorse", "score": 0.70},
    ]
    result = CrisisService.detect_crisis("I feel terrible", emotions)
    assert result["is_crisis"] is True
    assert result["severity"] in ("moderate", "high")


def test_low_emotion_score_no_upgrade():
    emotions = [
        {"label": "grief", "score": 0.3},  # Below 0.6 threshold
    ]
    result = CrisisService.detect_crisis("I feel sad", emotions)
    # Should not trigger just from low-score emotions alone
    assert result["severity"] == "none" or not result["is_crisis"]


def test_keyword_plus_emotion_upgrades_severity():
    emotions = [
        {"label": "grief", "score": 0.9},
        {"label": "remorse", "score": 0.8},
    ]
    result = CrisisService.detect_crisis(
        "I've been feeling empty",  # moderate keyword
        emotions
    )
    assert result["is_crisis"] is True
    assert result["severity"] in ("moderate", "high")


# ── Return shape ──────────────────────────────────────────────────────────────

def test_detect_crisis_returns_required_fields():
    result = CrisisService.detect_crisis("just testing")
    required = {"is_crisis", "severity", "keywords_matched", "emotions_detected", "show_book_therapist"}
    assert required.issubset(result.keys())


def test_detect_crisis_keywords_matched_list():
    result = CrisisService.detect_crisis("I want to end my life")
    assert isinstance(result["keywords_matched"], list)
    assert len(result["keywords_matched"]) > 0
