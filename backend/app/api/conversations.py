from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List

from app.models.conversation import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse
)
from app.models.user import UserOut
from app.dependencies.auth import get_current_user
from app.services.conversation_service import conversation_service

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new conversation"""
    conversation = await conversation_service.create_conversation(
        current_user.id,
        conversation_data
    )
    
    return ConversationResponse(
        id=conversation["_id"],
        user_id=conversation["user_id"],
        title=conversation["title"],
        created_at=conversation["created_at"],
        updated_at=conversation["updated_at"],
        message_count=conversation["message_count"]
    )


@router.get("", response_model=List[ConversationResponse])
async def get_conversations(
    limit: int = Query(50, ge=1, le=100),
    current_user: UserOut = Depends(get_current_user)
):
    """Get all conversations for the current user"""
    conversations = await conversation_service.get_user_conversations(
        current_user.id,
        limit
    )
    
    return [
        ConversationResponse(
            id=conv["_id"],
            user_id=conv["user_id"],
            title=conv["title"],
            created_at=conv["created_at"],
            updated_at=conv["updated_at"],
            message_count=conv.get("message_count", 0)
        )
        for conv in conversations
    ]


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: UserOut = Depends(get_current_user)
):
    """Get a specific conversation"""
    conversation = await conversation_service.get_conversation_by_id(
        conversation_id,
        current_user.id
    )
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return ConversationResponse(
        id=conversation["_id"],
        user_id=conversation["user_id"],
        title=conversation["title"],
        created_at=conversation["created_at"],
        updated_at=conversation["updated_at"],
        message_count=conversation.get("message_count", 0)
    )


@router.get("/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    limit: int = Query(100, ge=1, le=500),
    current_user: UserOut = Depends(get_current_user)
):
    """Get messages for a conversation"""
    messages = await conversation_service.get_conversation_messages(
        conversation_id,
        current_user.id,
        limit
    )
    
    return {
        "conversation_id": conversation_id,
        "messages": [
            {
                "id": msg["_id"],
                "content": msg["content"],
                "sender": msg["sender"],
                "timestamp": msg["timestamp"].isoformat() if msg.get("timestamp") else None
            }
            for msg in messages
        ]
    }


@router.put("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    conversation_data: ConversationUpdate,
    current_user: UserOut = Depends(get_current_user)
):
    """Update a conversation (e.g., rename title)"""
    conversation = await conversation_service.update_conversation(
        conversation_id,
        current_user.id,
        conversation_data
    )
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return ConversationResponse(
        id=conversation["_id"],
        user_id=conversation["user_id"],
        title=conversation["title"],
        created_at=conversation["created_at"],
        updated_at=conversation["updated_at"],
        message_count=conversation.get("message_count", 0)
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: UserOut = Depends(get_current_user)
):
    """Delete a conversation and all its messages"""
    success = await conversation_service.delete_conversation(
        conversation_id,
        current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return None
