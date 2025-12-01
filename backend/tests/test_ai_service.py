"""
Tests for AI Service
Tests sentiment analysis and empathy generation
Note: Skips GPU tests in CI environments without CUDA
"""

import pytest
from unittest.mock import patch, MagicMock

from app.models.journal import SentimentLabel, AIAnalysisResult
from app.services.ai_service import AIService


class TestAIService:
    """Test cases for AI sentiment analysis service"""
    
    def test_ai_service_singleton(self):
        """Test that AIService is a singleton"""
        service1 = AIService()
        service2 = AIService()
        assert service1 is service2
    
    @pytest.mark.skip(reason="Requires GPU/model to be loaded - run manually")
    def test_sentiment_analysis_positive(self):
        """Test sentiment analysis with positive text"""
        ai_service = AIService()
        
        if not ai_service.is_available():
            pytest.skip("AI model not available")
        
        text = "I am so happy today! Everything is going perfectly and I feel amazing!"
        result = ai_service.analyze_sentiment(text)
        
        assert "label" in result
        assert "score" in result
        assert result["label"].upper() in ["POSITIVE", "NEGATIVE"]
        assert 0.0 <= result["score"] <= 1.0
    
    @pytest.mark.skip(reason="Requires GPU/model to be loaded - run manually")
    def test_sentiment_analysis_negative(self):
        """Test sentiment analysis with negative text"""
        ai_service = AIService()
        
        if not ai_service.is_available():
            pytest.skip("AI model not available")
        
        text = "I feel terrible today. Everything is going wrong and I'm so sad."
        result = ai_service.analyze_sentiment(text)
        
        assert "label" in result
        assert "score" in result
        assert result["label"].upper() in ["POSITIVE", "NEGATIVE"]
        assert 0.0 <= result["score"] <= 1.0
    
    def test_empathy_response_positive_high_confidence(self):
        """Test empathy generation for positive sentiment with high confidence"""
        ai_service = AIService()
        
        text = "I accomplished all my goals today!"
        sentiment = SentimentLabel.POSITIVE
        score = 0.95
        
        response = ai_service.generate_empathy_response(text, sentiment, score)
        
        assert isinstance(response, str)
        assert len(response) > 0
        # Should contain encouraging words
        assert any(word in response.lower() for word in ["great", "wonderful", "proud", "positive"])
    
    def test_empathy_response_negative_high_confidence(self):
        """Test empathy generation for negative sentiment with high confidence"""
        ai_service = AIService()
        
        text = "I'm feeling really anxious and worried about everything."
        sentiment = SentimentLabel.NEGATIVE
        score = 0.92
        
        response = ai_service.generate_empathy_response(text, sentiment, score)
        
        assert isinstance(response, str)
        assert len(response) > 0
        # Should contain supportive words
        assert any(word in response.lower() for word in ["understand", "okay", "here", "support"])
    
    def test_empathy_response_personalized_anxiety(self):
        """Test that empathy response is personalized for anxiety"""
        ai_service = AIService()
        
        text = "I'm so anxious about the upcoming exam. I can't stop worrying."
        sentiment = SentimentLabel.NEGATIVE
        score = 0.88
        
        response = ai_service.generate_empathy_response(text, sentiment, score)
        
        # Should specifically address anxiety
        assert "anxiety" in response.lower() or "anxious" in response.lower()
    
    def test_empathy_response_personalized_sadness(self):
        """Test that empathy response is personalized for sadness"""
        ai_service = AIService()
        
        text = "I feel so sad and lonely today. Nothing seems to help."
        sentiment = SentimentLabel.NEGATIVE
        score = 0.85
        
        response = ai_service.generate_empathy_response(text, sentiment, score)
        
        # Should specifically address sadness
        assert "sad" in response.lower() or "sorry" in response.lower()
    
    def test_empathy_response_medium_confidence(self):
        """Test empathy generation with medium confidence"""
        ai_service = AIService()
        
        text = "Today was okay, nothing special."
        sentiment = SentimentLabel.NEUTRAL
        score = 0.65
        
        response = ai_service.generate_empathy_response(text, sentiment, score)
        
        assert isinstance(response, str)
        assert len(response) > 0
    
    def test_empathy_response_low_confidence(self):
        """Test empathy generation with low confidence"""
        ai_service = AIService()
        
        text = "Some text that's hard to classify."
        sentiment = SentimentLabel.NEUTRAL
        score = 0.52
        
        response = ai_service.generate_empathy_response(text, sentiment, score)
        
        assert isinstance(response, str)
        assert len(response) > 0
        # Should be neutral/supportive
        assert "thank you" in response.lower() or "valid" in response.lower()
    
    @pytest.mark.skip(reason="Requires GPU/model to be loaded - run manually")
    def test_analyze_text_complete(self):
        """Test complete text analysis (sentiment + empathy)"""
        ai_service = AIService()
        
        if not ai_service.is_available():
            pytest.skip("AI model not available")
        
        text = "I'm so grateful for all the support I've received. Things are looking up!"
        result = ai_service.analyze_text(text)
        
        assert isinstance(result, AIAnalysisResult)
        assert result.label in [SentimentLabel.POSITIVE, SentimentLabel.NEGATIVE, SentimentLabel.NEUTRAL]
        assert 0.0 <= result.score <= 1.0
        assert isinstance(result.empathy_text, str)
        assert len(result.empathy_text) > 0
    
    def test_analyze_text_without_model(self):
        """Test that analyze_text returns fallback when model unavailable"""
        # Create a new AI service instance and mock it as unavailable
        with patch.object(AIService, 'is_available', return_value=False):
            ai_service = AIService()
            
            text = "Test text"
            result = ai_service.analyze_text(text)
            
            # Should return fallback response
            assert isinstance(result, AIAnalysisResult)
            assert result.label == SentimentLabel.NEUTRAL
            assert result.score == 0.5
            assert "thank you" in result.empathy_text.lower() or "important" in result.empathy_text.lower()
    
    def test_get_device_info(self):
        """Test getting device information"""
        ai_service = AIService()
        device_info = ai_service.get_device_info()
        
        assert isinstance(device_info, dict)
        assert "status" in device_info
        assert "device" in device_info
        
        if device_info["status"] == "available":
            assert device_info["device"] in ["cuda", "cpu"]
            assert "device_id" in device_info


class TestAIServiceErrors:
    """Test error handling in AI service"""
    
    def test_empty_text_validation(self):
        """Test that empty text is handled properly"""
        ai_service = AIService()
        
        if not ai_service.is_available():
            # Should return fallback for empty text
            result = ai_service.analyze_text("")
            assert isinstance(result, AIAnalysisResult)
        else:
            # Should raise ValueError
            with pytest.raises(ValueError):
                ai_service.analyze_sentiment("")
    
    def test_whitespace_text_validation(self):
        """Test that whitespace-only text is handled properly"""
        ai_service = AIService()
        
        if not ai_service.is_available():
            result = ai_service.analyze_text("   ")
            assert isinstance(result, AIAnalysisResult)
        else:
            with pytest.raises(ValueError):
                ai_service.analyze_sentiment("   ")
    
    @pytest.mark.skip(reason="Requires GPU/model to be loaded - run manually")
    def test_very_long_text_truncation(self):
        """Test that very long text is truncated properly"""
        ai_service = AIService()
        
        if not ai_service.is_available():
            pytest.skip("AI model not available")
        
        # Create a very long text (more than 2000 characters)
        text = "This is a test. " * 200  # ~3000 characters
        
        # Should not raise an error, should truncate
        result = ai_service.analyze_sentiment(text)
        assert "label" in result
        assert "score" in result
