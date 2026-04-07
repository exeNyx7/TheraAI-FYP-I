"""
API Routes Package for TheraAI Backend
FastAPI router modules for different endpoints
"""

from .auth import router as auth_router
from .journal import router as journal_router
from .stats import router as stats_router
from .chat import router as chat_router
from .appointments import router as appointments_router
from .therapist import router as therapist_router
from .calls import router as calls_router
from .notifications import router as notifications_router
from .calendar import router as calendar_router

__all__ = [
    "auth_router",
    "journal_router",
    "stats_router",
    "chat_router",
    "appointments_router",
    "therapist_router",
    "calls_router",
    "notifications_router",
    "calendar_router",
]