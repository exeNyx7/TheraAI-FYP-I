"""
Conversation Service - Business logic for chat conversations
"""
from typing import List, Dict, Optional
from datetime import datetime
from bson import ObjectId

from app.database import get_database
from app.models.conversation import ConversationCreate, ConversationUpdate


class ConversationService:
    """Service for managing chat conversations"""
    
    @staticmethod
    async def create_conversation(user_id: str, conversation_data: ConversationCreate) -> Dict:
        """Create a new conversation"""
        db = await get_database()
        
        conversation_dict = {
            "user_id": user_id,
            "title": conversation_data.title or "New Conversation",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "message_count": 0
        }
        
        result = await db.conversations.insert_one(conversation_dict)
        conversation_dict["_id"] = str(result.inserted_id)
        
        return conversation_dict
    
    @staticmethod
    async def get_conversation_by_id(conversation_id: str, user_id: str) -> Optional[Dict]:
        """Get a single conversation by ID"""
        db = await get_database()
        
        try:
            conversation = await db.conversations.find_one({
                "_id": ObjectId(conversation_id),
                "user_id": user_id
            })
            
            if conversation:
                conversation["_id"] = str(conversation["_id"])
            
            return conversation
        except Exception:
            return None
    
    @staticmethod
    async def get_user_conversations(user_id: str, limit: int = 50) -> List[Dict]:
        """Get all conversations for a user"""
        db = await get_database()
        
        cursor = db.conversations.find({"user_id": user_id})\
            .sort("updated_at", -1)\
            .limit(limit)
        
        conversations = await cursor.to_list(length=limit)
        
        for conversation in conversations:
            conversation["_id"] = str(conversation["_id"])
        
        return conversations
    
    @staticmethod
    async def update_conversation(
        conversation_id: str,
        user_id: str,
        conversation_data: ConversationUpdate
    ) -> Optional[Dict]:
        """Update a conversation"""
        db = await get_database()
        
        try:
            update_data = {k: v for k, v in conversation_data.dict(exclude_unset=True).items() if v is not None}
            
            if not update_data:
                return await ConversationService.get_conversation_by_id(conversation_id, user_id)
            
            update_data["updated_at"] = datetime.now(timezone.utc)
            
            result = await db.conversations.find_one_and_update(
                {"_id": ObjectId(conversation_id), "user_id": user_id},
                {"$set": update_data},
                return_document=True
            )
            
            if result:
                result["_id"] = str(result["_id"])
            
            return result
        except Exception:
            return None
    
    @staticmethod
    async def delete_conversation(conversation_id: str, user_id: str) -> bool:
        """Delete a conversation and all its messages"""
        db = await get_database()
        
        try:
            # Delete all messages in conversation
            await db.chat_messages.delete_many({"conversation_id": conversation_id})
            
            # Delete conversation
            result = await db.conversations.delete_one({
                "_id": ObjectId(conversation_id),
                "user_id": user_id
            })
            
            return result.deleted_count > 0
        except Exception:
            return False
    
    @staticmethod
    async def get_conversation_messages(
        conversation_id: str,
        user_id: str,
        limit: int = 100
    ) -> List[Dict]:
        """Get messages for a conversation"""
        db = await get_database()
        
        # Verify user owns conversation
        conversation = await db.conversations.find_one({
            "_id": ObjectId(conversation_id),
            "user_id": user_id
        })
        
        if not conversation:
            return []
        
        cursor = db.chat_messages.find({"conversation_id": conversation_id})\
            .sort("timestamp", 1)\
            .limit(limit)
        
        messages = await cursor.to_list(length=limit)
        
        for message in messages:
            message["_id"] = str(message["_id"])
        
        return messages
    
    @staticmethod
    async def add_message_to_conversation(
        conversation_id: str,
        user_id: str,
        content: str,
        sender: str
    ) -> Dict:
        """Add a message to a conversation"""
        db = await get_database()
        
        message_dict = {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "content": content,
            "sender": sender,
            "timestamp": datetime.now(timezone.utc)
        }
        
        result = await db.chat_messages.insert_one(message_dict)
        message_dict["_id"] = str(result.inserted_id)
        
        # Update conversation's updated_at and message_count
        await db.conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {
                "$set": {"updated_at": datetime.now(timezone.utc)},
                "$inc": {"message_count": 1}
            }
        )
        
        return message_dict


# Export singleton instance
conversation_service = ConversationService()
