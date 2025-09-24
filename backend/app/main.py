"""
TheraAI FastAPI Backend
Main application entry point with environment configuration
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
import os

# Load settings
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    debug=settings.debug
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Simple root endpoint that returns JSON hello message"""
    return {
        "message": f"Hello from {settings.app_name}!",
        "status": "success",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "debug": settings.debug
    }

@app.get("/health")
async def health_check():
    """Health check endpoint with environment info"""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "database": "connected" if settings.mongodb_url else "disconnected"
    }

@app.get("/config")
async def get_config():
    """Get non-sensitive configuration info"""
    return {
        "app_name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "cors_origins": settings.cors_origins,
        "database_name": settings.mongodb_database,
        "features": {
            "ai_enabled": bool(settings.openai_api_key),
            "file_upload": True,
            "max_file_size": settings.max_file_size
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