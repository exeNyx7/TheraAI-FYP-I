"""
Shared utility functions for API routers.

These helpers are duplicated across session_notes, treatment_plans,
escalations, and sharing_preferences — centralised here.
"""

from datetime import datetime
from ..models.user import UserOut


def safe_str(val) -> str:
    try:
        return str(val) if val is not None else ""
    except Exception:
        return ""


def role_val(user: UserOut) -> str:
    role = getattr(user, "role", None)
    return role.value if hasattr(role, "value") else (role or "")


def is_admin(user: UserOut) -> bool:
    return role_val(user) == "admin"


def is_therapist(user: UserOut) -> bool:
    return role_val(user) in ("therapist", "psychiatrist")


def therapist_scope_filter(current_user: UserOut) -> dict:
    """Return a MongoDB filter dict scoped to the therapist (admin sees all)."""
    if is_admin(current_user):
        return {}
    return {"therapist_id": str(current_user.id)}


def fmt_dt(val) -> str | None:
    if isinstance(val, datetime):
        return val.isoformat()
    if val is None:
        return None
    return str(val)
