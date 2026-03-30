"""
Chat Conversation Models
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ConversationModel(BaseModel):
    """Database model for chat conversations"""
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str = Field(..., description="User ID who owns the conversation")
    title: str = Field(default="New Conversation", description="Conversation title")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    message_count: int = Field(default=0, description="Number of messages in conversation")

    class Config:
        populate_by_name = True


class ConversationCreate(BaseModel):
    """Schema for creating a conversation"""
    title: Optional[str] = Field(default="New Conversation", max_length=100)


class ConversationUpdate(BaseModel):
    """Schema for updating a conversation"""
    title: Optional[str] = Field(default=None, max_length=100)


class ConversationResponse(BaseModel):
    """Response schema for conversation"""
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int


class MessageModel(BaseModel):
    """Database model for chat messages"""
    id: Optional[str] = Field(default=None, alias="_id")
    conversation_id: str = Field(..., description="Conversation ID")
    user_id: str = Field(..., description="User ID")
    content: str = Field(..., description="Message content")
    sender: str = Field(..., description="'user' or 'ai'")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
