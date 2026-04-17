"""
Role-Based Access Control (RBAC) Dependencies for TheraAI
Provides pre-built guard dependencies for role enforcement across routers.

Architecture:
    Request → JWT Auth (get_current_user) → Role Guard (require_role) → Endpoint Logic
"""

from fastapi import Depends, HTTPException, status

from .auth import get_current_user
from ..models.user import UserOut, UserRole


def require_role(*allowed_roles: UserRole):
    """
    Dependency factory that enforces one or more allowed roles.

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user: UserOut = Depends(require_admin)):
            ...
    """
    async def role_checker(current_user: UserOut = Depends(get_current_user)) -> UserOut:
        if current_user.role not in [r.value for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this resource",
            )
        return current_user

    return role_checker


# ---------------------------------------------------------------------------
# Pre-built guards — import these directly into routers
# ---------------------------------------------------------------------------

require_patient = require_role(UserRole.PATIENT)
require_therapist = require_role(UserRole.PSYCHIATRIST)
require_admin = require_role(UserRole.ADMIN)
require_therapist_or_admin = require_role(UserRole.PSYCHIATRIST, UserRole.ADMIN)
