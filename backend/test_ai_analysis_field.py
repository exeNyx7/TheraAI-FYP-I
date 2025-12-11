"""
Test if JournalOut model properly serializes the ai_analysis computed field
"""
from app.models.journal import JournalOut, SentimentLabel
from datetime import datetime
import json

# Create a sample JournalOut instance
journal = JournalOut(
    id="507f1f77bcf86cd799439011",
    _id="507f1f77bcf86cd799439011",
    user_id="507f1f77bcf86cd799439012",
    content="I'm feeling so happy and excited today! Everything is going great!",
    mood="happy",
    title="Great Day",
    sentiment_label=SentimentLabel.POSITIVE,
    sentiment_score=0.95,
    empathy_response="It sounds like you're experiencing joy! That's wonderful!",
    emotion_themes=["Joy & Happiness", "Excitement & Energy"],
    top_emotions=[
        {"label": "joy", "score": 0.85},
        {"label": "excitement", "score": 0.77},
        {"label": "optimism", "score": 0.65}
    ],
    created_at=datetime.utcnow()
)

print("=" * 60)
print("Testing JournalOut serialization with ai_analysis field")
print("=" * 60)

# Test 1: Check if ai_analysis property works
print("\n1. Testing ai_analysis property directly:")
ai_analysis = journal.ai_analysis
print(f"   ai_analysis type: {type(ai_analysis)}")
print(f"   ai_analysis keys: {ai_analysis.keys() if ai_analysis else 'None'}")
print(f"   ai_analysis content:\n{json.dumps(ai_analysis, indent=4)}")

# Test 2: Check if model_dump includes ai_analysis
print("\n2. Testing model_dump() serialization:")
model_dict = journal.model_dump()
print(f"   Has 'ai_analysis' key: {'ai_analysis' in model_dict}")
if 'ai_analysis' in model_dict:
    print(f"   ✅ SUCCESS - ai_analysis is included in serialization!")
    print(f"   ai_analysis content:\n{json.dumps(model_dict['ai_analysis'], indent=4)}")
else:
    print(f"   ❌ FAILED - ai_analysis NOT included in serialization")
    print(f"   Available keys: {list(model_dict.keys())}")

# Test 3: Check JSON serialization (what API returns)
print("\n3. Testing model_dump_json() (API response):")
json_output = journal.model_dump_json(indent=2)
json_dict = json.loads(json_output)
print(f"   Has 'ai_analysis' key: {'ai_analysis' in json_dict}")
if 'ai_analysis' in json_dict:
    print(f"   ✅ SUCCESS - ai_analysis will be sent to frontend!")
    print(f"   Top emotions: {json_dict['ai_analysis']['top_emotions']}")
    print(f"   Themes: {json_dict['ai_analysis']['themes']}")
else:
    print(f"   ❌ FAILED - Frontend won't receive ai_analysis")

print("\n" + "=" * 60)
print("Test complete!")
print("=" * 60)
