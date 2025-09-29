"""
API Routes Package for TheraAI Backend
FastAPI router modules for different endpoints
"""

from .auth import router as auth_router

__all__ = [
    "auth_router"
]