"""
API Routes Package for TheraAI Backend
FastAPI router modules for different endpoints
"""

from .auth import router as auth_router
from .journal import router as journal_router
from .stats import router as stats_router
from .chat import router as chat_router

__all__ = [
    "auth_router",
    "journal_router",
    "stats_router",
    "chat_router"
]