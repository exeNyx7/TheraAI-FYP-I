"""
AI Service for Sentiment Analysis and Empathy Generation
Uses local GPU (NVIDIA RTX 3070) with CUDA for inference

ACTIVE Models:
  - DistilBERT fine-tuned on SST-2    → sentiment analysis (journals)
  - RoBERTa GoEmotions (28 categories) → emotion detection (journals)

DEPRECATED / COMMENTED OUT:
  - BlenderBot-400M-distill → chat responses
    REASON: Incompatible with RTX 5060 (sm_120 compute capability).
    Ran on CPU only, producing slow (10-30s) and low-quality responses.
    REPLACEMENT: See services/model_service.py (Ollama + Llama 3.1 8B)
"""

import logging
import os
from typing import Optional, List, Dict, Any

# Increase Hugging Face Hub timeouts for large model downloads (e.g., BlenderBot 1.6GB)
os.environ["HF_HUB_DOWNLOAD_TIMEOUT"] = "300"
os.environ["HF_HUB_ETAG_TIMEOUT"] = "30"

from transformers import pipeline, Pipeline
# DEPRECATED: AutoTokenizer, AutoModelForSeq2SeqLM were used for BlenderBot
# from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

from ..models.journal import AIAnalysisResult, SentimentLabel

# Configure logging
logger = logging.getLogger(__name__)


class AIService:
    """
    Dual-Model AI Service:
    - DistilBERT: Fast sentiment analysis (positive/negative)
    - RoBERTa GoEmotions: Detailed emotion detection (28 categories)
    - BlenderBot: Conversational AI for chat support
    Configured for NVIDIA RTX 3070 locally
    Loads models once and reuses for all requests
    """
    
    _instance: Optional['AIService'] = None
    _sentiment_model: Optional[Pipeline] = None
    _emotion_model: Optional[Pipeline] = None   # RoBERTa GoEmotions
    # DEPRECATED: BlenderBot tokenizer/model — replaced by ModelService (Ollama)
    # _chatbot_tokenizer: Optional[AutoTokenizer] = None
    # _chatbot_model: Optional[AutoModelForSeq2SeqLM] = None
    _device: Optional[int] = None
    _gpu_config: Optional[Dict[str, Any]] = None
    
    def __new__(cls):
        """Singleton pattern - only one instance of AIService"""
        if cls._instance is None:
            cls._instance = super(AIService, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance
    
    def _detect_gpu_config(self) -> Dict[str, Any]:
        """
        Detect GPU model and return optimal configuration
        
        Returns:
            dict with GPU-specific settings (precision, max_history, max_length, etc.)
        """
        if not torch.cuda.is_available():
            logger.info("🖥️  No GPU detected, using CPU configuration")
            return {
                "device": "cpu",
                "device_id": -1,
                "precision": "fp32",
                "max_history": 5,
                "max_response_length": 100,
                "use_fp16": False,
                "gradient_checkpointing": False
            }
        
        device_name = torch.cuda.get_device_name(0).lower()
        memory_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
        compute_capability = torch.cuda.get_device_capability(0)
        compute_version = f"sm_{compute_capability[0]}{compute_capability[1]}"
        
        logger.info(f"🔍 Detected GPU: {device_name} ({memory_gb:.1f} GB VRAM)")
        logger.info(f"🔍 Compute Capability: {compute_version}")
        
        # Guard against newer GPU architectures unsupported by installed PyTorch builds
        if compute_capability[0] >= 12:  # sm_120 and above
            logger.warning(f"⚠️  GPU compute capability {compute_version} is not supported by PyTorch {torch.__version__}")
            logger.warning("⚠️  Falling back to CPU mode. For GPU support:")
            logger.warning("   1. Wait for official PyTorch release with sm_120 support")
            logger.warning("   2. Or use PyTorch nightly: pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu128")
            logger.info("🖥️  Using CPU configuration")
            return {
                "device": "cpu",
                "device_id": -1,
                "precision": "fp32",
                "max_history": 5,
                "max_response_length": 100,
                "use_fp16": False,
                "gradient_checkpointing": False,
                "gpu_incompatible": True,
                "gpu_model": device_name
            }
        
        # RTX 3070 configuration (typically 8GB VRAM) - Full performance
        if "3070" in device_name:
            logger.info("⚙️  Configuring for RTX 3070 (Full performance mode)")
            return {
                "device": "cuda",
                "device_id": 0,
                "precision": "fp16",
                "max_history": 10,
                "max_response_length": 150,
                "use_fp16": True,
                "gradient_checkpointing": False,
                "gpu_model": "RTX 3070"
            }
        
        # Other NVIDIA GPUs - Conservative defaults
        else:
            logger.info(f"⚙️  Using conservative settings for {device_name}")
            return {
                "device": "cuda",
                "device_id": 0,
                "precision": "fp32",
                "max_history": 8,
                "max_response_length": 130,
                "use_fp16": False,
                "gradient_checkpointing": False,
                "gpu_model": device_name
            }
    
    def _initialize_model(self):
        """
        Initialize sentiment analysis and chatbot models
        Detects GPU and configures accordingly
        """
        try:
            # Detect GPU and get configuration
            self._gpu_config = self._detect_gpu_config()
            self._device = self._gpu_config["device_id"]
            
            # Log GPU configuration
            if self._gpu_config["device"] == "cuda":
                logger.info(f"🚀 CUDA Configuration:")
                logger.info(f"   • GPU: {self._gpu_config.get('gpu_model', 'Unknown')}")
                logger.info(f"   • Precision: {self._gpu_config['precision']}")
                logger.info(f"   • Max History: {self._gpu_config['max_history']} messages")
                logger.info(f"   • Max Response: {self._gpu_config['max_response_length']} tokens")
                logger.info(f"   • CUDA Version: {torch.version.cuda}")
            else:
                logger.warning("⚠️  Using CPU mode - Inference will be slower")
            
            # Load sentiment analysis model (DistilBERT)
            logger.info("📥 Loading sentiment model: distilbert-base-uncased-finetuned-sst-2-english")
            self._sentiment_model = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=self._device,
                framework="pt"
            )
            logger.info("✅ Sentiment model loaded (~268MB)")
            
            # Load emotion detection model (RoBERTa GoEmotions)
            logger.info("📥 Loading emotion model: SamLowe/roberta-base-go_emotions")
            logger.info("   ⏳ First-time download may take 1-2 minutes...")
            self._emotion_model = pipeline(
                "text-classification",
                model="SamLowe/roberta-base-go_emotions",
                device=self._device,
                framework="pt",
                top_k=5  # Return top 5 emotions
            )
            logger.info("✅ Emotion model loaded (~499MB)")
            
            # ── DEPRECATED: BlenderBot loading ────────────────────────────────
            # facebook/blenderbot-400M-distill has been replaced by Ollama + Llama 3.1 8B.
            # Reason: incompatible with RTX 5060 (sm_120); ran on CPU; poor quality.
            # See: backend/app/services/model_service.py
            #
            # logger.info("📥 Loading chatbot: facebook/blenderbot-400M-distill (~1.6GB)")
            # self._chatbot_tokenizer = AutoTokenizer.from_pretrained(
            #     "facebook/blenderbot-400M-distill"
            # )
            # self._chatbot_model = AutoModelForSeq2SeqLM.from_pretrained(
            #     "facebook/blenderbot-400M-distill"
            # )
            # if self._gpu_config["device"] == "cuda":
            #     try:
            #         self._chatbot_model = self._chatbot_model.to("cuda")
            #         if self._gpu_config["use_fp16"]:
            #             self._chatbot_model = self._chatbot_model.half()
            #         logger.info("✅ Chatbot model loaded on GPU successfully!")
            #     except RuntimeError as gpu_error:
            #         self._chatbot_model = AutoModelForSeq2SeqLM.from_pretrained(
            #             "facebook/blenderbot-400M-distill"
            #         )
            #         self._gpu_config["device"] = "cpu"
            #         self._gpu_config["device_id"] = -1
            # ── END DEPRECATED ────────────────────────────────────────────────

            # Run test inference to warm up active models
            test_sentiment = self._sentiment_model("This is a test.")
            logger.info(f"🧪 Sentiment test: {test_sentiment}")

            if self._emotion_model:
                test_emotions = self._emotion_model("I am happy today")
                logger.info(f"🧪 Emotion test: {test_emotions}")

            logger.info("🎉 Sentiment + Emotion models initialized and ready!")
            logger.info("💬 Chat responses: Ollama + Llama 3.1 8B (see model_service.py)")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize AI models: {str(e)}")
            logger.error("⚠️  AI features will not be available")
            self._sentiment_model = None
            self._chatbot_model = None
            raise RuntimeError(f"AI model initialization failed: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if AI service (sentiment + emotion models) is available"""
        # DEPRECATED check removed: chatbot_model (BlenderBot) no longer needed
        # Original: return self._sentiment_model is not None and self._chatbot_model is not None
        return self._sentiment_model is not None
    
    def get_device_info(self) -> dict:
        """Get information about the device and configuration being used"""
        if not self.is_available():
            return {"status": "unavailable", "device": "none"}
        
        info = {
            "status": "available",
            "device": self._gpu_config["device"],
            "device_id": self._gpu_config["device_id"],
            "gpu_model": self._gpu_config.get("gpu_model", "CPU"),
            "precision": self._gpu_config["precision"],
            "max_history": self._gpu_config["max_history"],
            "max_response_length": self._gpu_config["max_response_length"]
        }
        
        if self._gpu_config["device"] == "cuda" and torch.cuda.is_available():
            info.update({
                "cuda_version": torch.version.cuda,
                "memory_total_gb": round(torch.cuda.get_device_properties(0).total_memory / 1e9, 2),
                "fp16_enabled": self._gpu_config["use_fp16"]
            })
        
        return info
    
    def analyze_sentiment(self, text: str) -> dict:
        """
        Run sentiment analysis on text using DistilBERT
        
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
            result = self._sentiment_model(text_to_analyze)[0]
            
            logger.debug(f"Sentiment analysis result: {result}")
            
            return {
                "label": result["label"],
                "score": result["score"]
            }
            
        except Exception as e:
            logger.error(f"Error during sentiment analysis: {str(e)}")
            raise RuntimeError(f"Sentiment analysis failed: {str(e)}")
    
    # ── DEPRECATED: BlenderBot conversation methods ───────────────────────────
    # These methods powered the BlenderBot chat (facebook/blenderbot-400M-distill).
    # BlenderBot has been replaced by Ollama + Llama 3.1 8B via ModelService.
    # See: backend/app/services/model_service.py
    # DO NOT DELETE — kept for reference and potential rollback.
    #
    # def _format_conversation_history(self, history):
    #     """Format conversation history for BlenderBot's </s><s> separator format."""
    #     if not history:
    #         return ""
    #     max_history = self._gpu_config["max_history"]
    #     recent_history = history[-max_history:]
    #     formatted = [msg.get("message", "").strip() for msg in recent_history if msg.get("message")]
    #     return " </s> <s> ".join(formatted) if formatted else ""
    #
    # def generate_response_llm(self, user_message, conversation_history=None):
    #     """
    #     DEPRECATED — Generate response using BlenderBot.
    #     Replaced by: await ModelService.generate_response(user_message, history)
    #
    #     This method was broken because:
    #     1. RTX 5060 (sm_120) forced CPU-only inference (10-30s latency)
    #     2. BlenderBot hallucinated personal experiences constantly
    #     3. A 40-line personal-claim filter replaced most outputs with hardcoded strings
    #        making the 1.6GB model effectively useless
    #     """
    #     raise NotImplementedError(
    #         "BlenderBot has been removed. Use ModelService.generate_response() instead."
    #     )
    # ── END DEPRECATED ────────────────────────────────────────────────────────
    
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
    
    def analyze_emotions(self, text: str) -> List[Dict[str, float]]:
        """
        Analyze detailed emotions using RoBERTa GoEmotions
        
        Args:
            text: Journal entry text to analyze
            
        Returns:
            List of top emotions with scores (up to 5)
            Example: [
                {"label": "joy", "score": 0.85},
                {"label": "optimism", "score": 0.62},
                ...
            ]
            
        Raises:
            RuntimeError: If emotion model is not available
        """
        if not self._emotion_model:
            logger.warning("Emotion model not available")
            return []
        
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        
        # Truncate if needed
        text_to_analyze = text[:2000] if len(text) > 2000 else text
        
        try:
            # Get top 5 emotions
            emotions = self._emotion_model(text_to_analyze)[0]
            
            # Filter emotions with score > 0.1 (10% confidence)
            filtered = [e for e in emotions if e['score'] > 0.1]
            
            logger.debug(f"Emotion analysis: {filtered}")
            return filtered
            
        except Exception as e:
            logger.error(f"Emotion analysis error: {str(e)}")
            return []  # Return empty list on error, don't fail the whole analysis
    
    def get_emotion_themes(self, emotions: List[Dict]) -> List[str]:
        """
        Convert emotion labels to user-friendly themes
        
        Args:
            emotions: List of emotion dicts with 'label' and 'score'
            
        Returns:
            List of user-friendly theme strings (max 5)
        """
        theme_map = {
            "joy": "Joy & Happiness",
            "amusement": "Joy & Happiness",
            "love": "Love & Connection",
            "excitement": "Excitement & Energy",
            "gratitude": "Gratitude & Appreciation",
            "optimism": "Optimism & Hope",
            "caring": "Caring & Compassion",
            "pride": "Pride & Achievement",
            "relief": "Relief & Comfort",
            
            "sadness": "Sadness & Loss",
            "grief": "Sadness & Loss",
            "disappointment": "Disappointment",
            
            "fear": "Anxiety & Fear",
            "nervousness": "Anxiety & Fear",
            
            "anger": "Frustration & Anger",
            "annoyance": "Frustration & Anger",
            "disgust": "Disgust",
            
            "curiosity": "Curiosity & Interest",
            "realization": "Insight & Realization",
            "approval": "Approval & Validation",
            "disapproval": "Disapproval",
            "confusion": "Confusion",
            "surprise": "Surprise",
            "embarrassment": "Embarrassment",
            "remorse": "Remorse & Regret",
            "desire": "Desire & Longing",
            
            "neutral": "Neutral State"
        }
        
        themes = set()
        for emotion in emotions:
            label = emotion['label'].lower()
            theme = theme_map.get(label, label.title())
            themes.add(theme)
        
        return list(themes)[:5]  # Return max 5 themes
    
    def analyze_text(self, text: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> AIAnalysisResult:
        """
        Complete AI analysis with dual models:
        1. DistilBERT: Fast sentiment (POSITIVE/NEGATIVE)
        2. RoBERTa: Detailed emotions (28 categories)
        
        Args:
            text: Journal entry text to analyze
            conversation_history: Optional conversation context (unused for journal analysis)
            
        Returns:
            AIAnalysisResult with sentiment, empathy, and emotion themes
            
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
                empathy_text="Thank you for sharing your thoughts. Your feelings are important and valid. 💙",
                emotion_themes=[],
                top_emotions=[]
            )
        
        try:
            # 1. Fast sentiment analysis (DistilBERT)
            sentiment_result = self.analyze_sentiment(text)
            sentiment_label = self._map_label_to_sentiment(sentiment_result["label"])
            sentiment_score = sentiment_result["score"]
            
            # 2. Detailed emotion analysis (RoBERTa)
            emotions = []
            themes = []
            try:
                emotions = self.analyze_emotions(text)
                themes = self.get_emotion_themes(emotions)
            except Exception as e:
                logger.warning(f"Emotion analysis failed, continuing with sentiment only: {e}")
            
            # 3. Generate empathy response
            empathy_text = self.generate_empathy_response(
                text=text,
                sentiment=sentiment_label,
                score=sentiment_score
            )
            
            return AIAnalysisResult(
                label=sentiment_label,
                score=sentiment_score,
                empathy_text=empathy_text,
                emotion_themes=themes,
                top_emotions=emotions[:3]  # Top 3 emotions only
            )
            
        except Exception as e:
            logger.error(f"Error in AI analysis: {str(e)}")
            # Return fallback on error
            return AIAnalysisResult(
                label=SentimentLabel.NEUTRAL,
                score=0.5,
                empathy_text="Thank you for sharing. I'm here to listen and support you. 💙",
                emotion_themes=[],
                top_emotions=[]
            )


# Global instance (singleton)
ai_service = AIService()


# Convenience function for dependency injection
def get_ai_service() -> AIService:
    """Get the global AI service instance"""
    return ai_service
