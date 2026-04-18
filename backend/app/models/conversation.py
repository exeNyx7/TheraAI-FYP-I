"""
Chat Conversation Models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone


class ConversationModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str = Field(..., description="User ID who owns the conversation")
    title: str = Field(default="New Conversation", description="Conversation title")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message_count: int = Field(default=0, description="Number of messages in conversation")

    model_config = ConfigDict(populate_by_name=True)


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
    id: Optional[str] = Field(default=None, alias="_id")
    conversation_id: str = Field(..., description="Conversation ID")
    user_id: str = Field(..., description="User ID")
    content: str = Field(..., description="Message content")
    sender: str = Field(..., description="'user' or 'ai'")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(populate_by_name=True)
