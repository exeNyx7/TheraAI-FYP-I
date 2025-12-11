"""
Test emotion model integration
"""
from app.services.ai_service import get_ai_service

def test_emotion_analysis():
    """Test that both models are working"""
    ai_service = get_ai_service()
    
    print("=" * 80)
    print("TESTING DUAL-MODEL AI ANALYSIS")
    print("=" * 80)
    
    # Check models are loaded
    print(f"\n✓ Sentiment Model: {'Loaded' if ai_service._sentiment_model else 'NOT LOADED'}")
    print(f"✓ Emotion Model: {'Loaded' if ai_service._emotion_model else 'NOT LOADED'}")
    print(f"✓ Chatbot Model: {'Loaded' if ai_service._chatbot_model else 'NOT LOADED'}")
    
    # Test text
    test_texts = [
        "I'm feeling so happy and excited about my new job! Everything is going great!",
        "I'm really anxious and worried about my upcoming presentation. I can't sleep.",
        "I lost my dog today. I'm heartbroken and grieving."
    ]
    
    for i, text in enumerate(test_texts, 1):
        print(f"\n{'-' * 80}")
        print(f"TEST {i}: {text}")
        print('-' * 80)
        
        # Full analysis
        result = ai_service.analyze_text(text)
        
        print(f"\n📊 DISTILBERT SENTIMENT:")
        print(f"   Label: {result.label.value}")
        print(f"   Score: {result.score:.4f}")
        
        print(f"\n💭 EMPATHY RESPONSE:")
        print(f"   {result.empathy_text}")
        
        if result.emotion_themes:
            print(f"\n🎨 ROBERTA EMOTION THEMES:")
            for theme in result.emotion_themes:
                print(f"   • {theme}")
        else:
            print(f"\n⚠️  No emotion themes detected")
        
        if result.top_emotions:
            print(f"\n🔍 TOP EMOTIONS:")
            for emotion in result.top_emotions:
                print(f"   • {emotion['label']}: {emotion['score']*100:.1f}%")
        else:
            print(f"\n⚠️  No top emotions detected")
    
    print(f"\n{'=' * 80}")
    print("TEST COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    test_emotion_analysis()
