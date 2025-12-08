from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline, AutoModelForCausalLM
from pathlib import Path
import torch

class AIService:
    def __init__(self):
        # base_path = Path(__file__).parent.parent / "models"

        # Device setup
        self.device = 0 if torch.cuda.is_available() else -1

        # --- Sentiment model ---
        
        self.sentiment_tokenizer = AutoTokenizer.from_pretrained("ZohaWajahat/sentiment-analysis-model")
        self.sentiment_model = AutoModelForSequenceClassification.from_pretrained("ZohaWajahat/sentiment-analysis-model")


        # --- Chatbot model ---

        self.chatbot_tokenizer = AutoTokenizer.from_pretrained("ZohaWajahat/chatbot-model")
        self.chatbot_model = AutoModelForCausalLM.from_pretrained("ZohaWajahat/chatbot-model")


    def analyze_text(self, text: str):
        return self.sentiment_pipeline(text)[0]

    def generate_response(self, prompt: str, max_length=100):
        inputs = self.chatbot_tokenizer(prompt, return_tensors="pt")
        outputs = self.chatbot_model.generate(**inputs, max_length=max_length)
        return self.chatbot_tokenizer.decode(outputs[0], skip_special_tokens=True)

def get_ai_service():
    return AIService()
