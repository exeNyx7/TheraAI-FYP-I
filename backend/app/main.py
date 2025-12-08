"""
TheraAI FastAPI Backend
Main application entry point with authentication system
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import db_manager, init_database, check_database_health
from .api import auth_router, journal_router
from .api import chatbot
from .api.chatbot import router as chat_router
from .api import chatbot


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
        
        # Initialize AI service (loads model)
        from .services.ai_service import get_ai_service
        ai = get_ai_service()
        device_info = ai.get_device_info()
        print(f"🤖 AI Service: {device_info}")
        
        print("✅ Application startup complete")
    except Exception as e:
        print(f"❌ Failed to start application: {e}")
        raise e
    
    yield
    
    # Shutdown
    print("🛑 Shutting down application...")
    await db_manager.close_database_connection()
    print("✅ Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan
)

# Configure CORS for React frontend
# CORSMiddleware (before routers)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   # specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],     # allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],     # allow all headers
)

# Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(journal_router, prefix="/api/v1")
app.include_router(chatbot.router, prefix="/api/v1")  # final endpoint: /api/v1/chat/...



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
    description="Comprehensive health check including database status"
)
async def health_check():
    """Comprehensive health check endpoint"""
    try:
        # Check database health
        db_health = await check_database_health()
        
        return {
            "status": "healthy" if db_health["status"] == "healthy" else "degraded",
            "service": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
            "timestamp": db_health.get("timestamp"),
            "database": db_health,
            "features": {
                "authentication": "enabled",
                "user_roles": ["patient", "psychiatrist", "admin"],
                "jwt_auth": "enabled"
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
