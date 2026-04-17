"""
TheraAI FastAPI Backend
Main application entry point with authentication system
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import db_manager, init_database, check_database_health
from .api import (
    auth_router, journal_router, stats_router, chat_router,
    appointments_router, calls_router,
    notifications_router, calendar_router,
)
from .api.moods import router as moods_router
from .api.conversations import router as conversations_router
from .api.settings import router as settings_router
from .api.assessments import router as assessments_router
from .api.therapist import router as therapist_router
from .api.ws import router as ws_router
from .api.admin import router as admin_router
from .api.escalations import router as escalations_router
from .api.treatment_plans import router as treatment_plans_router
from .api.session_notes import router as session_notes_router
from .api.therapists_public import router as therapists_public_router
from .api.sharing_preferences import router as sharing_preferences_router
from .api.gamification import router as gamification_router

# Load settings
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    print(f"🚀 Starting {settings.app_name} v{settings.app_version}")
    print(f"🌍 Environment: {settings.environment}")
    
    try:
        # Connect to database
        await db_manager.connect_to_database()
        
        # Initialize database (create indexes)
        await init_database()
        
        # Initialize AI service (loads model) in background
        import threading
        from .services.ai_service import get_ai_service
        
        def load_ai_background():
            try:
                ai = get_ai_service()
                device_info = ai.get_device_info()
                print(f"🤖 AI Service Loaded in background: {device_info}")
            except Exception as e:
                print(f"❌ AI Service Load Error: {e}")
                
        threading.Thread(target=load_ai_background, daemon=True).start()
        
        # Initialize notification service (FCM) if configured
        try:
            from .services.notification_service import NotificationService
            if settings.firebase_credentials_path:
                NotificationService.initialize(settings.firebase_credentials_path)
                print("✅ Firebase Cloud Messaging initialized")
            else:
                print("ℹ️ FCM not configured (FIREBASE_CREDENTIALS_PATH not set)")
        except Exception as e:
            print(f"⚠️ FCM initialization skipped: {e}")

        # Start appointment reminder scheduler
        try:
            from .services.scheduler_service import start_scheduler
            start_scheduler()
            print("✅ Appointment reminder scheduler started")
        except Exception as e:
            print(f"⚠️ Scheduler start failed: {e}")

        print("✅ Application startup complete")
    except Exception as e:
        print(f"❌ Failed to start application: {e}")
        raise e

    yield

    # Shutdown
    print("🛑 Shutting down application...")
    try:
        from .services.scheduler_service import stop_scheduler
        stop_scheduler()
    except Exception:
        pass
    await db_manager.close_database_connection()
    print("✅ Application shutdown complete")


from .dependencies.rate_limit import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
    redirect_slashes=False,  # Prevent 307 redirects that drop POST bodies
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(journal_router, prefix="/api/v1")
app.include_router(stats_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(moods_router, prefix="/api/v1")
app.include_router(conversations_router, prefix="/api/v1")
app.include_router(appointments_router, prefix="/api/v1")
app.include_router(therapist_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(assessments_router, prefix="/api/v1")
app.include_router(calls_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(calendar_router, prefix="/api/v1")
app.include_router(ws_router)
app.include_router(admin_router, prefix="/api/v1")
app.include_router(escalations_router, prefix="/api/v1")
app.include_router(treatment_plans_router, prefix="/api/v1")
app.include_router(session_notes_router, prefix="/api/v1")
app.include_router(therapists_public_router, prefix="/api/v1")
app.include_router(sharing_preferences_router, prefix="/api/v1")
app.include_router(gamification_router, prefix="/api/v1")


@app.get(
    "/",
    summary="Root endpoint",
    description="Basic information about the API"
)
async def root():
    """Root endpoint with API information"""
    return {
        "message": f"Welcome to {settings.app_name}!",
        "status": "success",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "docs_url": "/docs",
        "api_base": "/api/v1"
    }


@app.get(
    "/health",
    summary="Health check",
    description="Comprehensive health check including database and Ollama LLM status"
)
async def health_check():
    """Comprehensive health check endpoint"""
    try:
        # Check database health
        db_health = await check_database_health()

        # Check Ollama / ModelService health
        from .services.model_service import ModelService
        model_health = await ModelService.check_health()

        # Overall status: healthy only if both DB and model are up
        db_ok = db_health["status"] == "healthy"
        model_ok = model_health.get("status") == "healthy"
        overall = "healthy" if (db_ok and model_ok) else "degraded"

        return {
            "status": overall,
            "service": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
            "timestamp": db_health.get("timestamp"),
            "database": db_health,
            "chat_ai": model_health,
            "features": {
                "authentication": "enabled",
                "user_roles": ["patient", "psychiatrist", "admin"],
                "jwt_auth": "enabled",
                "sentiment_analysis": "distilbert-base-uncased-finetuned-sst-2-english",
                "emotion_detection": "SamLowe/roberta-base-go_emotions",
                "chat_llm": model_health.get("model", "llama3.1:8b"),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Health check failed: {str(e)}")


@app.get(
    "/api/v1",
    summary="API version info",
    description="Information about API v1 endpoints"
)
async def api_info():
    """API version information"""
    return {
        "version": "v1",
        "service": settings.app_name,
        "endpoints": {
            "auth": "/api/v1/auth",
            "journals": "/api/v1/journals",
            "health": "/health",
            "docs": "/docs"
        },
        "features": {
            "authentication": "JWT-based authentication",
            "user_management": "Multi-role user system",
            "mood_tracking": "AI-powered journal with sentiment analysis",
            "ai_analysis": "Local GPU-accelerated sentiment analysis",
            "roles": ["patient", "psychiatrist", "admin"],
            "database": "MongoDB with async operations"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=settings.reload
    )