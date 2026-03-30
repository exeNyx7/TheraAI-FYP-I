---
name: fastapi-patterns
description: Enforces consistent FastAPI backend patterns for TheraAI project. Auto-trigger whenever working on any file inside backend/app/ — including routers (api/), service layer (services/), Pydantic models (models/), database layer (database.py), dependencies (dependencies/), utilities (utils/), or main.py. Also trigger when adding a new API route, service method, database query, or AI model integration in this project.
---

# TheraAI FastAPI Backend Patterns

This skill defines the exact conventions used in this codebase. Follow these patterns precisely — do not introduce new patterns without strong justification.

---

## 1. Folder Structure

```
backend/
└── app/
    ├── main.py                    # FastAPI app, lifespan, router registration
    ├── config.py                  # Pydantic Settings (all env vars)
    ├── database.py                # Motor async MongoDB manager + collection helpers
    ├── api/
    │   ├── __init__.py            # Re-exports all routers
    │   ├── auth.py                # /auth router
    │   ├── journal.py             # /journals router
    │   ├── chat.py                # /chat router
    │   ├── moods.py               # /moods router
    │   ├── stats.py               # /users router (stats/achievements)
    │   └── conversations.py       # /conversations router
    ├── models/
    │   ├── user.py                # User, Token, TokenData schemas
    │   ├── journal.py             # Journal schemas + AIAnalysisResult
    │   ├── mood.py                # Mood schemas
    │   └── conversation.py        # Conversation + Message schemas
    ├── services/
    │   ├── ai_service.py          # Singleton AI service (3 ML models)
    │   ├── user_service.py        # UserService class
    │   ├── journal_service.py     # JournalService class
    │   ├── mood_service.py        # MoodService class
    │   └── conversation_service.py # ConversationService class
    ├── dependencies/
    │   ├── auth.py                # get_current_user, require_role, require_roles
    │   └── rate_limit.py          # SlowAPI limiter instance
    └── utils/
        └── auth.py                # hash_password, verify_password, JWT helpers
```

**Rule:** Never put business logic in routers. Never put DB queries in routers. Routers call services; services call the database.

---

## 2. Router File Template

```python
"""
<Feature> API Routes for TheraAI
<One-line description of what this router handles>
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query

from ..models.<model_module> import <CreateSchema>, <OutSchema>, <UpdateSchema>
from ..models.user import UserOut
from ..services.<service_module> import <FeatureService>
from ..dependencies.auth import get_current_user

router = APIRouter(prefix="/<resource>", tags=["<Tag Name>"])


@router.post(
    "",
    response_model=<OutSchema>,
    status_code=status.HTTP_201_CREATED,
    summary="<Short action summary>",
    description="<Longer description for OpenAPI docs>"
)
async def create_<resource>(
    data: <CreateSchema>,
    current_user: UserOut = Depends(get_current_user)
) -> <OutSchema>:
    """Docstring shown in /docs"""
    try:
        result = await <FeatureService>.create_<resource>(
            user_id=str(current_user.id),
            data=data
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.exception("Failed to create <resource>")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again."
        )
```

**Naming conventions:**
- Router variable: always named `router`
- Route functions: `create_X`, `get_X`, `get_X_by_id`, `update_X`, `delete_X`
- Prefixes: plural nouns (e.g., `/journals`, `/moods`, `/conversations`)
- Tags: Title Case string (e.g., `"AI Chat"`, `"Journals"`)

**Route path strings:**
- Use `""` (empty string) for the collection endpoint — NOT `"/"` — because `redirect_slashes=False` is set on the app to prevent 307 redirects that drop POST bodies.
- Use `"/{id}"` for item endpoints.
- Use `"/stats"`, `"/history"` etc. for sub-resource endpoints — declare these BEFORE `"/{id}"` routes to avoid routing conflicts.

---

## 3. Service Layer Template

```python
"""
<Feature> Service Layer for TheraAI
Handles all <feature>-related business logic and database operations
"""

from typing import Optional, List
from datetime import datetime, timezone
from fastapi import HTTPException, status
from bson import ObjectId

from ..database import get_database
from ..models.<model_module> import <CreateSchema>, <OutSchema>, <InDBSchema>, <UpdateSchema>


class <Feature>Service:
    """Service class for <feature> operations"""

    @staticmethod
    async def create_<resource>(user_id: str, data: <CreateSchema>) -> <OutSchema>:
        """
        <Action description>

        Args:
            user_id: ID of the user
            data: Input data

        Returns:
            <OutSchema>: Created resource

        Raises:
            HTTPException: If creation fails
        """
        try:
            db = await get_database()
            collection = db.<collection_name>

            doc = <InDBSchema>(
                user_id=user_id,
                # ... fields from data
                created_at=datetime.now(timezone.utc),
                updated_at=None
            )

            result = await collection.insert_one(
                doc.dict(by_alias=True, exclude={"id"})
            )

            created = await collection.find_one({"_id": result.inserted_id})
            if not created:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create resource"
                )

            return <OutSchema>.from_doc(created)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create <resource>: {str(e)}"
            )
```

**Rules:**
- All service methods are `@staticmethod async def` — no `self` needed, no instantiation
- Always validate ObjectId with `ObjectId.is_valid(id)` before DB queries that take an ID
- Re-raise `HTTPException` before the generic `except Exception` — pattern is always `except HTTPException: raise` then `except Exception as e:`
- Use `datetime.now(timezone.utc)` for `created_at`/`updated_at` — **not** `datetime.utcnow()` (deprecated in Python 3.12+)
- Timestamps displayed to the user use Pakistan timezone (`Asia/Karachi` via `pytz`)

---

## 4. Pydantic Schema Patterns

```python
from pydantic import BaseModel, Field, field_validator, ConfigDict, computed_field
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum

# 1. Use str Enums for all constrained string fields
class ResourceStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

# 2. Three-schema pattern per resource:
#    - Base (shared fields + validators)
#    - Create (input, inherits Base)
#    - Out (API response, inherits Base, adds id/timestamps)
#    - InDB (database doc, inherits Base, adds id/timestamps/hashed fields)
#    - Update (all Optional, for PATCH-style updates)

class ResourceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

class ResourceCreate(ResourceBase):
    model_config = ConfigDict(json_schema_extra={"example": {"name": "example"}})

class ResourceOut(ResourceBase):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Use @computed_field for properties that must appear in API responses
    @computed_field
    @property
    def derived_field(self) -> Optional[str]:
        return f"computed from {self.name}"

    @classmethod
    def from_doc(cls, doc: dict):
        """Create from MongoDB document — always convert _id to str"""
        if doc and '_id' in doc:
            doc['id'] = str(doc['_id'])
            doc['_id'] = str(doc['_id'])
        return cls(**doc)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        from_attributes=True,          # Required for @computed_field to serialize
        json_encoders={
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    )

class ResourceInDB(ResourceBase):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class ResourceUpdate(BaseModel):
    """All fields Optional for partial updates"""
    name: Optional[str] = Field(default=None, max_length=200)
```

**Key rules:**
- `@computed_field` + `@property` is required for any model property that must be included in JSON responses. A bare `@property` is NOT serialized by Pydantic v2. This was a known bug fixed Dec 2025.
- `model_config` with `from_attributes=True` must be set on any model using `@computed_field`
- `from_doc()` classmethod on `Out` schemas — always convert `_id` ObjectId to `str`
- Use `update_data.dict(exclude_unset=True)` for partial updates (never `model_dump()` with all fields)
- Validators: use `@field_validator("field") @classmethod` (Pydantic v2 syntax)

---

## 5. MongoDB Motor Async Patterns

```python
# Get database (use the async dependency function, not db_manager.get_database() directly)
db = await get_database()                         # In service methods
collection = db.<collection_name>                 # Access collection directly

# INSERT
result = await collection.insert_one(doc.dict(by_alias=True, exclude={"id"}))
created = await collection.find_one({"_id": result.inserted_id})

# FIND ONE (with ownership check — always include user_id for authorization)
doc = await collection.find_one({
    "_id": ObjectId(entry_id),
    "user_id": user_id                            # Authorization: ensures ownership
})

# FIND MANY (with pagination)
cursor = collection.find({"user_id": user_id}).sort("created_at", -1).skip(skip).limit(limit)
items = []
async for doc in cursor:
    items.append(OutSchema.from_doc(doc))

# FIND MANY (to list — only for small result sets)
items = await collection.find({"user_id": user_id}).to_list(length=None)

# UPDATE
update_dict = update_data.dict(exclude_unset=True)
update_dict["updated_at"] = datetime.now(timezone.utc)
await collection.update_one(
    {"_id": ObjectId(entry_id)},
    {"$set": update_dict}
)
updated = await collection.find_one({"_id": ObjectId(entry_id)})

# DELETE (with ownership)
result = await collection.delete_one({
    "_id": ObjectId(entry_id),
    "user_id": user_id
})
if result.deleted_count == 0:
    raise HTTPException(status_code=404, detail="<Resource> not found")

# DELETE MANY
result = await collection.delete_many({"user_id": user_id})

# In router/endpoint code that directly accesses DB (not via service):
# Use db_manager.get_database() (sync) instead of await get_database()
db = db_manager.get_database()                    # chat.py pattern for direct DB access
```

**IMPORTANT — Two DB access patterns exist in this codebase (inconsistency):**
- `services/` use: `db = await get_database()` (async dependency)
- `api/chat.py` uses: `db = db_manager.get_database()` (sync call on the manager)

**When adding new code:** use `db = await get_database()` (the service pattern) — it's the correct approach for service layer code.

---

## 6. Dependency Injection Patterns

```python
# Standard auth dependency (all protected routes)
from ..dependencies.auth import get_current_user
current_user: UserOut = Depends(get_current_user)

# Role-specific (single role)
from ..dependencies.auth import require_role
current_user: UserOut = Depends(require_role("admin"))

# Role-specific (multiple roles)
from ..dependencies.auth import require_roles
current_user: UserOut = Depends(require_roles(["admin", "psychiatrist"]))

# Convenience aliases
from ..dependencies.auth import get_current_admin, get_current_psychiatrist, get_current_staff

# Optional auth (public endpoints that optionally use auth)
from ..dependencies.auth import get_optional_current_user
current_user: Optional[UserOut] = Depends(get_optional_current_user)

# Rate limiting (auth endpoints only)
from ..dependencies.rate_limit import limiter
from fastapi import Request
@router.post("/signup")
@limiter.limit("5/minute")
async def signup(request: Request, ...):
    ...
```

**User caching:** `get_current_user` has a TTLCache (60s, 1024 entries) — no manual caching needed.

---

## 7. Error Handling Standard

Every endpoint follows this exact try/except pattern:

```python
try:
    result = await SomeService.do_something(...)
    return result
except HTTPException:
    raise                    # Always re-raise HTTPExceptions from services unchanged
except Exception as e:
    import logging
    logging.exception("Failed to <action>")     # Log the full traceback
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An unexpected error occurred. Please try again."
    )
```

**HTTP status codes used:**
- `400` — Invalid input (e.g., malformed ObjectId, validation errors)
- `401` — Unauthenticated (handled by auth dependency)
- `403` — Forbidden (role mismatch, handled by require_role)
- `404` — Resource not found or not owned by user
- `409` — Conflict (e.g., email already exists)
- `422` — Unprocessable Entity (Pydantic validation — automatic from FastAPI)
- `500` — Unexpected server error

**Error response body:**
```json
{"detail": "Human-readable message"}
```

FastAPI's automatic `HTTPException` handler returns this format. Do not deviate from it.

---

## 8. Authentication & Middleware

The full auth flow:
1. Client sends `Authorization: Bearer <jwt_token>` header
2. `HTTPBearer()` security scheme extracts the token
3. `get_current_user()` decodes JWT → `TokenData` → looks up user (with TTLCache)
4. User's `is_active` is checked; inactive users get 401

JWT token structure:
```python
{
    "sub": user_id,          # Subject (user's MongoDB _id as string)
    "email": user_email,
    "role": user_role,
    "exp": expiry_timestamp  # 30 minutes from creation
}
```

Password hashing: `bcrypt` via `passlib`. Use `hash_password()` and `verify_password()` from `utils/auth.py`. Never call bcrypt directly.

Rate limiting is via `SlowAPI` on the FastAPI app:
```python
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

Only auth endpoints have `@limiter.limit(...)` decorators — `5/minute` for signup, `10/minute` for login.

CORS is configured in `main.py` for `http://localhost:3000` and `localhost:5173`. When adding new allowed origins, update `config.py` (`cors_origins` setting) not `main.py` directly.

---

## 9. AI Model Integration in Services

The AI service is a singleton loaded at startup via a background thread:

```python
# Get the AI service singleton (never instantiate AIService directly)
from ..services.ai_service import get_ai_service
ai_service = get_ai_service()
```

**Available AI methods:**
```python
# Full analysis (DistilBERT + RoBERTa) — use for journal entries
analysis = ai_service.analyze_text(text)
# Returns AIAnalysisResult with:
#   .label (SentimentLabel)
#   .score (float 0-1)
#   .empathy_text (str)
#   .emotion_themes (List[str])
#   .top_emotions (List[Dict])

# Sentiment only
sentiment = ai_service.analyze_sentiment(text)  # {"label": "positive", "score": 0.95}

# Emotions only (28 categories from RoBERTa GoEmotions)
emotions = ai_service.analyze_emotions(text)    # [{"label": "joy", "score": 0.85}, ...]

# Chat response (BlenderBot-400M) — currently broken on RTX 5060, runs on CPU
response = ai_service.generate_response_llm(user_message, conversation_history)
```

**CRITICAL — BlenderBot status:**
`facebook/blenderbot-400M-distill` is the current chat model. It is NOT compatible with RTX 5060 (sm_120 compute capability). It falls back to CPU mode, making it slow and low-quality. **This model needs to be replaced.** Do not build new features that depend on BlenderBot quality. A replacement (e.g., Llama, Mistral, OpenAI API, or Google Gemini) is planned.

**Threading rule:** AI inference (synchronous PyTorch) must be called via `loop.run_in_executor` when inside an async endpoint:
```python
import asyncio
loop = asyncio.get_running_loop()
response = await loop.run_in_executor(
    None,
    lambda: ai_service.generate_response_llm(user_message, history)
)
```
Journal service calls `ai_service.analyze_text()` directly (synchronously) inside an async service method — this is inconsistent with the chat pattern but works because journal creation is not latency-sensitive. For any NEW AI calls in async contexts, use `run_in_executor`.

---

## 10. Inconsistencies to Fix

The following patterns exist in the codebase but are inconsistent or problematic. When touching these areas, normalize to the standard:

| Issue | Current State | Standard |
|-------|--------------|----------|
| `datetime.utcnow()` | Used in `JournalInDB` (`created_at` default) and some services | Use `datetime.now(timezone.utc)` everywhere |
| DB access in routers | `api/chat.py` calls `db_manager.get_database()` directly | DB access belongs in services; use `await get_database()` |
| Request schema definitions | `api/chat.py` defines `ChatMessage`, `ChatResponse` etc. inline in the router file | All schemas belong in `models/` |
| Inlined service logic | `api/chat.py` queries `db.chat_history` directly in the route handler | Move to a `ChatService` class in `services/chat_service.py` |
| `logging.exception` import | Imported inline inside exception handler in some routers (`import logging` inside `except`) | Import at module top level |
| `update_data.dict()` | Old Pydantic v1 method used in some services | Use `update_data.model_dump(exclude_unset=True)` in Pydantic v2 |
| Missing ChatService | Chat history and message storage logic is in the router | Should be extracted to `services/chat_service.py` following the same `@staticmethod async def` pattern |
