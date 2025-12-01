"""
API Routes Package for TheraAI Backend
FastAPI router modules for different endpoints
"""

from .auth import router as auth_router
from .journal import router as journal_router

__all__ = [
    "auth_router",
    "journal_router"
]