"""
Configuration settings for TheraAI Backend
Using Pydantic Settings for environment variable management
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
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
    debug: bool = Field(default=False, alias="DEBUG")
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
    secret_key: str = Field(alias="SECRET_KEY")
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, alias="REFRESH_TOKEN_EXPIRE_DAYS")
    
    # CORS Settings
    # In production set CORS_ORIGINS=["https://your-app.vercel.app"] and CORS_ALLOW_CREDENTIALS=false
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
    
    # AI/ML Configuration — Local Ollama LLM
    ollama_base_url: str = Field(default="http://localhost:11434", alias="OLLAMA_BASE_URL")
    ollama_model: str = Field(default="llama3.2:3b", alias="OLLAMA_MODEL")
    ollama_num_ctx: int = Field(default=4096, alias="OLLAMA_NUM_CTX")
    ai_models_disabled: bool = Field(default=False, alias="AI_MODELS_DISABLED")

    # Legacy / unused — kept so existing .env files don't break
    groq_api_key: Optional[str] = Field(default=None, alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.1-8b-instant", alias="GROQ_MODEL")
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
    
    # Email Configuration (fastapi-mail)
    smtp_host: str = Field(default="smtp.gmail.com", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_username: Optional[str] = Field(default=None, alias="SMTP_USERNAME")
    smtp_password: Optional[str] = Field(default=None, alias="SMTP_PASSWORD")
    from_email: str = Field(default="noreply@theraai.dev", alias="FROM_EMAIL")
    mail_enabled: bool = Field(default=False, alias="MAIL_ENABLED")
    mail_username: Optional[str] = Field(default=None, alias="MAIL_USERNAME")
    mail_password: Optional[str] = Field(default=None, alias="MAIL_PASSWORD")
    mail_from: str = Field(default="noreply@theraai.app", alias="MAIL_FROM")
    mail_port: int = Field(default=587, alias="MAIL_PORT")
    mail_server: str = Field(default="smtp.gmail.com", alias="MAIL_SERVER")
    mail_tls: bool = Field(default=True, alias="MAIL_STARTTLS")
    mail_ssl: bool = Field(default=False, alias="MAIL_SSL_TLS")
    admin_email: Optional[str] = Field(default=None, alias="ADMIN_EMAIL")
    
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
    
    # Firebase / FCM
    firebase_credentials_path: Optional[str] = Field(default=None, alias="FIREBASE_CREDENTIALS_PATH")
    fcm_enabled: bool = Field(default=False, alias="FCM_ENABLED")

    # Google Calendar OAuth2
    google_client_id: Optional[str] = Field(default=None, alias="GOOGLE_CLIENT_ID")
    google_client_secret: Optional[str] = Field(default=None, alias="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str = Field(
        default="http://localhost:8000/api/v1/calendar/callback",
        alias="GOOGLE_REDIRECT_URI",
    )

    # Jitsi Meet
    jitsi_domain: str = Field(default="meet.jit.si", alias="JITSI_DOMAIN")

    # AI Models — set true on 8 GB VRAM laptops to keep DistilBERT/RoBERTa
    # on CPU and give all VRAM to Ollama (Llama 3.1 8B)
    ai_models_force_cpu: bool = Field(default=False, alias="AI_MODELS_FORCE_CPU")
    # Lazy-load DistilBERT/RoBERTa — don't load at startup, load on first journal analysis.
    # Recommended True on laptops to prevent RAM/VRAM spike at startup.
    ai_models_preload: bool = Field(default=False, alias="AI_MODELS_PRELOAD")

    # Demo mode — prints crisis alerts in bright red to server console
    demo_mode: bool = Field(default=False, alias="DEMO_MODE")

    # Public backend URL — used for hosted assets (logo in emails, etc.)
    backend_url: str = Field(default="http://localhost:8000", alias="BACKEND_URL")

    # Frontend URL — used for Stripe success/cancel redirects
    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")

    # Stripe (sandbox / test mode only)
    stripe_secret_key: Optional[str] = Field(default=None, alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: Optional[str] = Field(default=None, alias="STRIPE_WEBHOOK_SECRET")
    stripe_price_starter: Optional[str] = Field(default=None, alias="STRIPE_PRICE_STARTER")
    stripe_price_professional: Optional[str] = Field(default=None, alias="STRIPE_PRICE_PROFESSIONAL")
    stripe_price_intensive: Optional[str] = Field(default=None, alias="STRIPE_PRICE_INTENSIVE")

    # Health Check
    health_check_interval: int = Field(default=30, alias="HEALTH_CHECK_INTERVAL")  # seconds

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
        
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


# Singleton — re-created each time Python reloads this module (e.g. uvicorn --reload).
# Import this directly when you just need a setting at module level.
settings = Settings()


def get_settings() -> Settings:
    """Return the module-level settings singleton."""
    return settings