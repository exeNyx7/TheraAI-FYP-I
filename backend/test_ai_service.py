"""
Test script for AI Service with GPU detection and chatbot
Tests both sentiment analysis and conversational AI
"""

import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

from app.services.ai_service import ai_service


def test_gpu_detection():
    """Test GPU detection and configuration"""
    print("\n" + "="*60)
    print("🔍 GPU DETECTION TEST")
    print("="*60)
    
    device_info = ai_service.get_device_info()
    
    print(f"\n✅ AI Service Status: {device_info['status']}")
    print(f"🖥️  Device: {device_info['device']}")
    print(f"🎮 GPU Model: {device_info.get('gpu_model', 'N/A')}")
    print(f"⚙️  Precision: {device_info.get('precision', 'N/A')}")
    print(f"📝 Max History: {device_info.get('max_history', 'N/A')} messages")
    print(f"📏 Max Response: {device_info.get('max_response_length', 'N/A')} tokens")
    
    if device_info['device'] == 'cuda':
        print(f"🚀 CUDA Version: {device_info.get('cuda_version', 'N/A')}")
        print(f"💾 GPU Memory: {device_info.get('memory_total_gb', 'N/A')} GB")
        print(f"🔢 FP16 Enabled: {device_info.get('fp16_enabled', False)}")
    
    print()


def test_sentiment_analysis():
    """Test sentiment analysis"""
    print("\n" + "="*60)
    print("😊 SENTIMENT ANALYSIS TEST")
    print("="*60)
    
    test_cases = [
        "I'm so happy today! Everything went perfectly and I feel amazing!",
        "I'm feeling really anxious and overwhelmed with everything.",
        "Today was okay, nothing special happened."
    ]
    
    for i, text in enumerate(test_cases, 1):
        print(f"\n📝 Test Case {i}:")
        print(f"   Input: {text[:60]}...")
        
        try:
            result = ai_service.analyze_sentiment(text)
            print(f"   ✅ Sentiment: {result['label']} ({result['score']:.2%} confidence)")
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    print()


def test_chatbot():
    """Test conversational AI with BlenderBot"""
    print("\n" + "="*60)
    print("💬 CHATBOT TEST")
    print("="*60)
    
    # Test 1: Simple greeting
    print("\n📝 Test 1: Simple Greeting")
    print("   User: Hello! How are you?")
    
    try:
        response = ai_service.generate_response_llm("Hello! How are you?")
        print(f"   🤖 Bot: {response}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # Test 2: With conversation history
    print("\n📝 Test 2: With Conversation History")
    history = [
        {"role": "user", "message": "I'm feeling stressed about my exams"},
        {"role": "bot", "message": "I understand exam stress can be overwhelming. What subjects are you studying?"},
        {"role": "user", "message": "Computer Science and Mathematics"}
    ]
    
    print("   History:")
    for msg in history:
        print(f"      {msg['role'].capitalize()}: {msg['message']}")
    
    print("   User: Do you have any study tips?")
    
    try:
        response = ai_service.generate_response_llm(
            "Do you have any study tips?",
            conversation_history=history
        )
        print(f"   🤖 Bot: {response}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # Test 3: Mental health support
    print("\n📝 Test 3: Mental Health Support")
    print("   User: I've been feeling really lonely lately")
    
    try:
        response = ai_service.generate_response_llm(
            "I've been feeling really lonely lately"
        )
        print(f"   🤖 Bot: {response}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    print()


def test_journal_analysis():
    """Test full journal analysis (sentiment + empathy)"""
    print("\n" + "="*60)
    print("📔 JOURNAL ANALYSIS TEST")
    print("="*60)
    
    journal_entry = """
    Today was really challenging. I had a big presentation at work and I was 
    so nervous beforehand. My hands were shaking and I couldn't sleep last night. 
    But once I started presenting, things went better than expected. My colleagues 
    gave positive feedback and my manager seemed impressed. I'm exhausted now but 
    relieved it's over.
    """
    
    print(f"\n📝 Journal Entry:")
    print(journal_entry.strip())
    
    try:
        result = ai_service.analyze_text(journal_entry.strip())
        print(f"\n✅ Analysis Results:")
        print(f"   Sentiment: {result.label.value} ({result.score:.2%} confidence)")
        print(f"   Empathy Response:")
        print(f"   {result.empathy_text}")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
    
    print()


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("🧪 TheraAI - AI Service Test Suite")
    print("="*60)
    
    try:
        # Test 1: GPU Detection
        test_gpu_detection()
        
        # Test 2: Sentiment Analysis
        test_sentiment_analysis()
        
        # Test 3: Chatbot
        test_chatbot()
        
        # Test 4: Journal Analysis
        test_journal_analysis()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETED")
        print("="*60)
        print()
        
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {str(e)}")
        print("Make sure PyTorch and transformers are installed:")
        print("  pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121")
        print("  pip install transformers sentencepiece accelerate")
        print()
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
