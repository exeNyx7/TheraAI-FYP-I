"""
Demo script to show chatbot improvements
Run this to see how the chatbot responds to various scenarios
"""
from app.services.ai_service import AIService

def test_conversation():
    """Test a realistic conversation"""
    ai_service = AIService()
    
    print("=" * 80)
    print("CHATBOT CONVERSATION TEST")
    print("=" * 80)
    
    # Test cases that were problematic before
    test_cases = [
        {
            "scenario": "Simple Greeting",
            "messages": ["hello"]
        },
        {
            "scenario": "User feeling good",
            "messages": ["i am doing great"]
        },
        {
            "scenario": "User lost pet",
            "messages": ["I lost my dog"]
        },
        {
            "scenario": "Questions about AI",
            "messages": [
                "Do you exercise?",
                "Do you have pets?",
                "What did you do today?"
            ]
        },
        {
            "scenario": "Multi-turn emotional support",
            "messages": [
                "Hi",
                "I'm feeling stressed",
                "It's because of my exams"
            ]
        }
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n{'=' * 80}")
        print(f"TEST {i}: {test['scenario']}")
        print('=' * 80)
        
        history = []
        for msg in test["messages"]:
            print(f"\n👤 User: {msg}")
            
            response = ai_service.generate_response_llm(msg, conversation_history=history)
            print(f"🤖 AI: {response}")
            
            # Validate response
            response_lower = response.lower()
            issues = []
            
            # Check for personal claims
            if any(phrase in response_lower for phrase in 
                  ["i just got", "my dog", "my gym", "i was at", "i do, but"]):
                issues.append("❌ Contains personal claim")
            
            # Check if AI claims activities
            if response_lower.startswith(("i am good", "i'm doing", "i just")):
                issues.append("❌ Claims personal status/activity")
            
            if issues:
                print("⚠️  ISSUES:", ", ".join(issues))
            else:
                print("✅ Response appropriate")
            
            # Add to history
            history.append({"role": "user", "message": msg})
            history.append({"role": "bot", "message": response})
    
    print(f"\n{'=' * 80}")
    print("TEST COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    test_conversation()
