"""
Dependencies Package for TheraAI Backend
Dependency injection functions for FastAPI routes
"""

from .auth import (
    get_current_user,
    get_current_active_user,
    require_role,
    require_roles,
    get_current_admin,
    get_current_psychiatrist, 
    get_current_patient,
    get_current_staff,
    get_optional_current_user
)

__all__ = [
    "get_current_user",
    "get_current_active_user",
    "require_role",
    "require_roles", 
    "get_current_admin",
    "get_current_psychiatrist",
    "get_current_patient",
    "get_current_staff",
    "get_optional_current_user"
]