"""
Configuration settings for TheraAI Backend
Using Pydantic Settings for environment variable management
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application Settings
    app_name: str = Field(default="TheraAI Backend", alias="APP_NAME")
    app_version: str = Field(default="1.0.0", alias="APP_VERSION")
    app_description: str = Field(
        default="AI-powered therapy assistance platform backend", 
        alias="APP_DESCRIPTION"
    )
    debug: bool = Field(default=True, alias="DEBUG")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    
    # Server Configuration
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")
    reload: bool = Field(default=True, alias="RELOAD")
    
    # Database Configuration
    mongodb_url: str = Field(default="mongodb://localhost:27017", alias="MONGODB_URL")
    mongodb_database: str = Field(default="theraai_dev", alias="MONGODB_DATABASE")
    mongodb_test_database: str = Field(default="theraai_test", alias="MONGODB_TEST_DATABASE")
    
    # Security & Authentication
    secret_key: str = Field(
        default="dev-secret-key-change-in-production-12345", 
        alias="SECRET_KEY"
    )
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, alias="REFRESH_TOKEN_EXPIRE_DAYS")
    
    # CORS Settings
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000", 
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ], 
        alias="CORS_ORIGINS"
    )
    cors_allow_credentials: bool = Field(default=True, alias="CORS_ALLOW_CREDENTIALS")
    
    # AI/ML Configuration
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-3.5-turbo", alias="OPENAI_MODEL")
    openai_max_tokens: int = Field(default=1000, alias="OPENAI_MAX_TOKENS")
    openai_temperature: float = Field(default=0.7, alias="OPENAI_TEMPERATURE")
    
    # Therapy AI Settings
    ai_therapy_model: str = Field(default="gpt-3.5-turbo", alias="AI_THERAPY_MODEL")
    ai_therapy_system_prompt: str = Field(
        default="You are a helpful AI therapy assistant. Provide supportive and empathetic responses.",
        alias="AI_THERAPY_SYSTEM_PROMPT"
    )
    ai_max_conversation_history: int = Field(default=10, alias="AI_MAX_CONVERSATION_HISTORY")
    
    # File Upload Configuration
    max_file_size: int = Field(default=10485760, alias="MAX_FILE_SIZE")  # 10MB
    allowed_file_types: List[str] = Field(
        default=["image/jpeg", "image/png", "image/gif", "text/plain", "application/pdf"],
        alias="ALLOWED_FILE_TYPES"
    )
    upload_path: str = Field(default="uploads/", alias="UPLOAD_PATH")
    
    # Email Configuration
    smtp_host: str = Field(default="smtp.gmail.com", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_username: Optional[str] = Field(default=None, alias="SMTP_USERNAME")
    smtp_password: Optional[str] = Field(default=None, alias="SMTP_PASSWORD")
    from_email: str = Field(default="noreply@theraai.dev", alias="FROM_EMAIL")
    
    # Redis Configuration (optional)
    redis_url: str = Field(default="redis://localhost:6379", alias="REDIS_URL")
    redis_password: Optional[str] = Field(default=None, alias="REDIS_PASSWORD")
    redis_db: int = Field(default=0, alias="REDIS_DB")
    
    # Logging Configuration
    log_level: str = Field(default="DEBUG", alias="LOG_LEVEL")
    log_file: str = Field(default="logs/app.log", alias="LOG_FILE")
    log_max_size: int = Field(default=10485760, alias="LOG_MAX_SIZE")  # 10MB
    log_backup_count: int = Field(default=5, alias="LOG_BACKUP_COUNT")
    
    # Rate Limiting
    rate_limit_requests: int = Field(default=1000, alias="RATE_LIMIT_REQUESTS")
    rate_limit_period: int = Field(default=60, alias="RATE_LIMIT_PERIOD")  # seconds
    
    # Health Check
    health_check_interval: int = Field(default=30, alias="HEALTH_CHECK_INTERVAL")  # seconds
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        
    @property
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.environment.lower() == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.environment.lower() == "production"
    
    @property
    def database_url(self) -> str:
        """Get the full database URL"""
        return f"{self.mongodb_url}/{self.mongodb_database}"


# Create a global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings