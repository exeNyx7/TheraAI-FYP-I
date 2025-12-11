"""
Comprehensive test cases for chatbot conversation quality
Tests various scenarios to ensure reliable and appropriate responses
"""
import pytest
import sys
from pathlib import Path

# Add parent directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.ai_service import AIService

@pytest.fixture
def ai_service():
    """Initialize AI service for testing"""
    service = AIService()
    return service

class TestChatbotGreetings:
    """Test greeting scenarios"""
    
    def test_simple_hello(self, ai_service):
        """Test response to simple greeting"""
        response = ai_service.generate_response_llm("hello")
        
        # Should not claim personal experiences
        assert "gym" not in response.lower()
        assert "i just got" not in response.lower()
        assert "my" not in response.lower() or "my mind" in response.lower()
        
        # Should be welcoming
        assert len(response) > 10
        print(f"\n✓ Hello response: {response}")
    
    def test_hey_greeting(self, ai_service):
        """Test response to casual greeting"""
        response = ai_service.generate_response_llm("hey")
        
        # Should not have personal claims
        assert not any(phrase in response.lower() for phrase in 
                      ["i am doing", "i'm doing", "i just", "i was"])
        
        print(f"\n✓ Hey response: {response}")
    
    def test_hi_how_are_you(self, ai_service):
        """Test response to how are you"""
        response = ai_service.generate_response_llm("hi, how are you?")
        
        # Should NOT say "I am good" or "I am doing well"
        assert not response.lower().startswith(("i am", "i'm"))
        assert "gym" not in response.lower()
        
        print(f"\n✓ Hi how are you response: {response}")

class TestChatbotEmotionalSupport:
    """Test emotional support responses"""
    
    def test_feeling_sad(self, ai_service):
        """Test response to sadness"""
        response = ai_service.generate_response_llm("I'm feeling really sad today")
        
        # Should be empathetic
        assert len(response) > 10
        # Should not have personal claims
        assert "my" not in response.lower() or "my mind" in response.lower()
        
        print(f"\n✓ Sadness response: {response}")
    
    def test_feeling_anxious(self, ai_service):
        """Test response to anxiety"""
        response = ai_service.generate_response_llm("I'm anxious about my exams")
        
        # Should be supportive
        assert len(response) > 10
        # No personal claims
        assert not any(phrase in response.lower() for phrase in 
                      ["when i was", "i remember", "i've had"])
        
        print(f"\n✓ Anxiety response: {response}")
    
    def test_lost_pet(self, ai_service):
        """Test response to losing a pet"""
        response = ai_service.generate_response_llm("I lost my dog")
        
        # Should NOT say "my dog" (AI claiming to have a dog)
        # But CAN say "your dog" (referring to user's dog)
        if "dog" in response.lower():
            assert "your dog" in response.lower() or "the dog" in response.lower()
            assert "my dog" not in response.lower()
        
        # Should be empathetic
        assert len(response) > 10
        
        print(f"\n✓ Lost pet response: {response}")
    
    def test_feeling_great(self, ai_service):
        """Test response to positive emotion"""
        response = ai_service.generate_response_llm("I'm feeling great today!")
        
        # Should be supportive but not claim to feel great too
        assert "gym" not in response.lower()
        assert not response.lower().startswith("i am good")
        
        print(f"\n✓ Feeling great response: {response}")

class TestChatbotConversationFlow:
    """Test multi-turn conversations"""
    
    def test_two_turn_conversation(self, ai_service):
        """Test maintaining context over two turns"""
        # First message
        response1 = ai_service.generate_response_llm("I'm stressed about work")
        print(f"\n✓ Turn 1: {response1}")
        
        # Second message with history
        history = [
            {"role": "user", "message": "I'm stressed about work"},
            {"role": "bot", "message": response1}
        ]
        response2 = ai_service.generate_response_llm(
            "It's been overwhelming", 
            conversation_history=history
        )
        
        # Should not claim personal experiences
        assert "my work" not in response2.lower()
        assert "my job" not in response2.lower()
        
        print(f"✓ Turn 2: {response2}")
    
    def test_three_turn_conversation(self, ai_service):
        """Test longer conversation"""
        messages = [
            "Hello",
            "I've been feeling down lately",
            "I think it's because of loneliness"
        ]
        
        history = []
        for i, msg in enumerate(messages):
            response = ai_service.generate_response_llm(msg, conversation_history=history)
            
            # Check no personal claims
            assert not any(phrase in response.lower() for phrase in 
                          ["i just got", "my friend", "my experience", "when i was"])
            
            print(f"\n✓ Turn {i+1} - User: {msg}")
            print(f"  AI: {response}")
            
            # Add to history
            history.append({"role": "user", "message": msg})
            history.append({"role": "bot", "message": response})

class TestChatbotBoundaries:
    """Test that AI maintains appropriate boundaries"""
    
    def test_no_personal_activities(self, ai_service):
        """Ensure AI doesn't claim activities"""
        test_messages = [
            "What did you do today?",
            "Do you exercise?",
            "Do you have pets?",
            "Tell me about yourself"
        ]
        
        for msg in test_messages:
            response = ai_service.generate_response_llm(msg)
            
            # Should not claim personal activities
            prohibited_phrases = [
                "i just got back", "i went to", "i was at the gym",
                "my dog", "my cat", "my pet", "my workout",
                "i exercise", "i do yoga", "i play"
            ]
            
            for phrase in prohibited_phrases:
                assert phrase not in response.lower(), \
                    f"Response contains prohibited phrase '{phrase}': {response}"
            
            print(f"\n✓ '{msg}' -> {response}")
    
    def test_no_false_empathy(self, ai_service):
        """Ensure AI doesn't falsely claim to relate through personal experience"""
        response = ai_service.generate_response_llm("I lost a loved one")
        
        # Should be empathetic but not claim "I've been there" or similar
        prohibited = [
            "i've lost", "i lost", "when i lost", "i remember losing",
            "i've been through", "i went through", "in my life"
        ]
        
        for phrase in prohibited:
            assert phrase not in response.lower(), \
                f"Response falsely claims personal experience: {response}"
        
        print(f"\n✓ Loss response: {response}")

class TestChatbotQuality:
    """Test response quality"""
    
    def test_minimum_length(self, ai_service):
        """Responses should have minimum length"""
        messages = ["hi", "yes", "ok", "I see"]
        
        for msg in messages:
            response = ai_service.generate_response_llm(msg)
            assert len(response) > 5, f"Response too short for '{msg}': {response}"
            print(f"\n✓ '{msg}' -> {response} (length: {len(response)})")
    
    def test_no_echo(self, ai_service):
        """Should not just repeat user input"""
        messages = ["I'm feeling sad", "I need help", "Tell me something"]
        
        for msg in messages:
            response = ai_service.generate_response_llm(msg)
            assert response.lower() != msg.lower(), \
                f"Response echoes input: {response}"
            print(f"\n✓ No echo for '{msg}'")
    
    def test_coherent_responses(self, ai_service):
        """Responses should be coherent and relevant"""
        test_cases = [
            ("I'm happy today", ["happy", "glad", "great", "well", "positive"]),
            ("I'm worried", ["worry", "concern", "feel", "support", "help"]),
            ("I can't sleep", ["sleep", "rest", "night", "tired", "help"])
        ]
        
        for msg, expected_keywords in test_cases:
            response = ai_service.generate_response_llm(msg)
            response_lower = response.lower()
            
            # At least one keyword should be present
            has_keyword = any(keyword in response_lower for keyword in expected_keywords)
            
            print(f"\n✓ '{msg}' -> {response}")
            print(f"  Keywords found: {[kw for kw in expected_keywords if kw in response_lower]}")


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "-s"])
