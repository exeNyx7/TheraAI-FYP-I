---
name: fastapi-patterns
description: Critical backend rules for TheraAI. Trigger when working on backend/app/ files.
---

# TheraAI FastAPI — Critical Rules

## Non-Negotiables
- **Datetime**: `from datetime import datetime, timezone` → `datetime.now(timezone.utc)`. NEVER `datetime.utcnow()`.
- **Pydantic v2**: `.model_dump()` not `.dict()`. `pattern=` not `regex=`. `model_config = ConfigDict(...)` not inner `class Config`.
- **ObjectId**: Always `ObjectId(user_id)` when querying `_id`. Never raw string.
- **Router paths**: Empty root = `@router.get("")` NOT `"/"` (prevents 307 redirect dropping POST bodies).
- **Error order**: `except HTTPException: raise` BEFORE `except Exception as e:`.
- **DB in services only**: No DB queries in router functions. Routers call services.
- **RBAC**: `from ..dependencies.rbac import require_patient, require_therapist, require_admin`

## Key Patterns

### DB access in services
```python
db = await get_database()          # in service methods
# OR
db = db_manager.get_database()     # in api/chat.py (legacy, sync)
```

### Insert pattern (Pydantic v2)
```python
result = await collection.insert_one(doc.model_dump(by_alias=True, exclude={"id"}))
```

### from_doc() classmethod on Out schemas
```python
@classmethod
def from_doc(cls, doc: dict):
    if doc and '_id' in doc:
        doc['id'] = str(doc['_id'])
        doc['_id'] = str(doc['_id'])
    return cls(**doc)
```

### Achievement time check (early_bird / night_owl)
```python
parse_datetime(e.get("created_at", "")).hour  # use this for time-of-day checks
```

## Known Issues Still Open
- `api/chat.py` queries DB directly (should be in ChatService)
- `early_bird`/`night_owl` now implemented (time-based check added 2026-04-01)
- `change-password` endpoint is now fully implemented
