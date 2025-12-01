"""
AI Service for Sentiment Analysis and Empathy Generation
Uses local GPU (NVIDIA RTX 5060) with CUDA 12.8 for inference
Model: DistilBERT fine-tuned on SST-2 (Stanford Sentiment Treebank)
"""

import logging
from typing import Optional
from transformers import pipeline, Pipeline
import torch

from ..models.journal import AIAnalysisResult, SentimentLabel

# Configure logging
logger = logging.getLogger(__name__)


class AIService:
    """
    Singleton AI service for sentiment analysis using local GPU
    Loads model once and reuses for all requests
    """
    
    _instance: Optional['AIService'] = None
    _model: Optional[Pipeline] = None
    _device: Optional[int] = None
    
    def __new__(cls):
        """Singleton pattern - only one instance of AIService"""
        if cls._instance is None:
            cls._instance = super(AIService, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance
    
    def _initialize_model(self):
        """
        Initialize the sentiment analysis model
        Detects GPU availability and loads model accordingly
        """
        try:
            # Check for CUDA availability
            cuda_available = torch.cuda.is_available()
            
            if cuda_available:
                self._device = 0  # Use first GPU (RTX 5060)
                device_name = torch.cuda.get_device_name(0)
                cuda_version = torch.version.cuda
                logger.info(f"🚀 CUDA detected! Using GPU: {device_name}")
                logger.info(f"📊 CUDA Version: {cuda_version}")
                logger.info(f"💾 GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
            else:
                self._device = -1  # Use CPU
                logger.warning("⚠️  CUDA not available. Using CPU for inference (slower).")
                logger.warning("💡 To enable GPU: Install PyTorch with CUDA support")
            
            # Load the sentiment analysis pipeline
            logger.info("📥 Loading sentiment analysis model: distilbert-base-uncased-finetuned-sst-2-english")
            
            self._model = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=self._device,
                framework="pt"  # PyTorch framework
            )
            
            logger.info("✅ Model loaded successfully!")
            
            # Run a test inference to warm up the model
            test_result = self._model("This is a test.")
            logger.info(f"🧪 Test inference successful: {test_result}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize AI model: {str(e)}")
            logger.error("⚠️  AI features will not be available")
            self._model = None
            raise RuntimeError(f"AI model initialization failed: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if AI service is available"""
        return self._model is not None
    
    def get_device_info(self) -> dict:
        """Get information about the device being used"""
        if not self.is_available():
            return {"status": "unavailable", "device": "none"}
        
        info = {
            "status": "available",
            "device": "cuda" if self._device == 0 else "cpu",
            "device_id": self._device
        }
        
        if self._device == 0 and torch.cuda.is_available():
            info.update({
                "device_name": torch.cuda.get_device_name(0),
                "cuda_version": torch.version.cuda,
                "memory_total_gb": round(torch.cuda.get_device_properties(0).total_memory / 1e9, 2)
            })
        
        return info
    
    def analyze_sentiment(self, text: str) -> dict:
        """
        Run sentiment analysis on text using the model
        
        Args:
            text: Input text to analyze
            
        Returns:
            dict with 'label' and 'score' from the model
            
        Raises:
            RuntimeError: If model is not available
        """
        if not self.is_available():
            raise RuntimeError("AI model is not available")
        
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        
        # Truncate text if too long (DistilBERT max is 512 tokens)
        max_chars = 2000  # Approximately 512 tokens
        text_to_analyze = text[:max_chars] if len(text) > max_chars else text
        
        try:
            # Run inference
            result = self._model(text_to_analyze)[0]
            
            logger.debug(f"Sentiment analysis result: {result}")
            
            return {
                "label": result["label"],
                "score": result["score"]
            }
            
        except Exception as e:
            logger.error(f"Error during sentiment analysis: {str(e)}")
            raise RuntimeError(f"Sentiment analysis failed: {str(e)}")
    
    def _map_label_to_sentiment(self, label: str) -> SentimentLabel:
        """
        Map model output label to our SentimentLabel enum
        DistilBERT SST-2 outputs: POSITIVE, NEGATIVE
        """
        label_upper = label.upper()
        
        if label_upper == "POSITIVE":
            return SentimentLabel.POSITIVE
        elif label_upper == "NEGATIVE":
            return SentimentLabel.NEGATIVE
        else:
            # Default to neutral if unknown
            return SentimentLabel.NEUTRAL
    
    def generate_empathy_response(self, text: str, sentiment: SentimentLabel, score: float) -> str:
        """
        Generate an empathetic response based on sentiment analysis
        Uses rule-based approach for now (can be enhanced with GPT later)
        
        Args:
            text: Original journal text
            sentiment: Detected sentiment label
            score: Confidence score
            
        Returns:
            Empathetic response text
        """
        # Extract key emotional words for personalization (simple approach)
        text_lower = text.lower()
        
        # High confidence responses (score > 0.8)
        if score > 0.8:
            if sentiment == SentimentLabel.POSITIVE:
                responses = [
                    "It sounds like you're experiencing something really positive! That's wonderful to hear. 😊",
                    "I'm glad to hear things are going well for you! It's great that you're taking time to reflect on these positive moments.",
                    "Your positive energy really comes through in your words! Keep embracing these good feelings.",
                    "It's beautiful to see you in such a good place. Remember to celebrate these moments!"
                ]
                # Personalize based on content
                if any(word in text_lower for word in ["accomplished", "achieved", "succeeded"]):
                    return "You should be proud of what you've accomplished! It's clear you've put in real effort, and that's paying off. Keep up the great work! 🌟"
                elif any(word in text_lower for word in ["happy", "joy", "excited"]):
                    return responses[0]
                elif any(word in text_lower for word in ["grateful", "thankful", "blessed"]):
                    return "Gratitude is such a powerful emotion. It's wonderful that you're taking time to appreciate the good in your life. 🙏"
                else:
                    return responses[1]
            
            elif sentiment == SentimentLabel.NEGATIVE:
                responses = [
                    "I hear you, and it sounds like you're going through a difficult time. Remember that it's okay to feel this way, and these feelings won't last forever. 💙",
                    "It takes courage to express difficult emotions. Please know that what you're feeling is valid, and you're not alone in this.",
                    "I can sense that things are challenging right now. Be gentle with yourself - you're doing the best you can.",
                    "Thank you for sharing this with me. It's important to acknowledge difficult feelings rather than suppress them. You're taking a positive step by journaling."
                ]
                # Personalize based on content
                if any(word in text_lower for word in ["anxious", "anxiety", "worried", "nervous"]):
                    return "Anxiety can feel overwhelming, but you're taking a positive step by acknowledging it. Try to focus on what you can control, and remember to breathe. You've got this. 🌊"
                elif any(word in text_lower for word in ["sad", "depressed", "down", "lonely"]):
                    return "I'm sorry you're feeling this way. Sadness is a natural emotion, and it's okay to sit with it for a while. Consider reaching out to someone you trust, or engaging in an activity that usually brings you comfort. 💙"
                elif any(word in text_lower for word in ["angry", "frustrated", "mad", "irritated"]):
                    return "It's understandable to feel frustrated. Anger often signals that something important to us isn't being honored. What might help you process these feelings in a healthy way? 🔥"
                elif any(word in text_lower for word in ["stressed", "overwhelmed", "pressure"]):
                    return "Feeling overwhelmed is a sign that you might need to pause and prioritize. Break things down into smaller steps, and don't hesitate to ask for support. You don't have to do everything at once. 🌱"
                else:
                    return responses[0]
        
        # Medium confidence responses (0.6 < score <= 0.8)
        elif score > 0.6:
            if sentiment == SentimentLabel.POSITIVE:
                return "It seems like you're in a fairly good place right now. That's great! Keep nurturing these positive feelings. ✨"
            elif sentiment == SentimentLabel.NEGATIVE:
                return "I notice there might be some difficult emotions here. Remember, it's okay to have ups and downs. Be kind to yourself today. 💙"
        
        # Low confidence or neutral (score <= 0.6)
        else:
            return "Thank you for sharing your thoughts. Whether you're feeling good, bad, or somewhere in between, your feelings are valid. Journaling is a great way to process and understand your emotions better. 📝"
    
    def analyze_text(self, text: str) -> AIAnalysisResult:
        """
        Complete AI analysis: sentiment + empathy response
        
        Args:
            text: Journal entry text to analyze
            
        Returns:
            AIAnalysisResult with sentiment and empathy response
            
        Raises:
            RuntimeError: If AI service is not available
            ValueError: If text is empty
        """
        if not self.is_available():
            # Return a fallback response if AI is not available
            logger.warning("AI model not available, returning fallback response")
            return AIAnalysisResult(
                label=SentimentLabel.NEUTRAL,
                score=0.5,
                empathy_text="Thank you for sharing your thoughts. Your feelings are important and valid. 💙"
            )
        
        try:
            # Get sentiment analysis
            sentiment_result = self.analyze_sentiment(text)
            
            # Map to our enum
            sentiment_label = self._map_label_to_sentiment(sentiment_result["label"])
            sentiment_score = sentiment_result["score"]
            
            # Generate empathy response
            empathy_text = self.generate_empathy_response(
                text=text,
                sentiment=sentiment_label,
                score=sentiment_score
            )
            
            return AIAnalysisResult(
                label=sentiment_label,
                score=sentiment_score,
                empathy_text=empathy_text
            )
            
        except Exception as e:
            logger.error(f"Error in AI analysis: {str(e)}")
            # Return fallback on error
            return AIAnalysisResult(
                label=SentimentLabel.NEUTRAL,
                score=0.5,
                empathy_text="Thank you for sharing. I'm here to listen and support you. 💙"
            )


# Global instance (singleton)
ai_service = AIService()


# Convenience function for dependency injection
def get_ai_service() -> AIService:
    """Get the global AI service instance"""
    return ai_service
