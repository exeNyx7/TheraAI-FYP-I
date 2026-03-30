# TheraAI Testing Strategy

> Comprehensive testing patterns and conventions for TheraAI backend (FastAPI + pytest) and frontend (React + Vitest).
> Use this skill when working on test files, routers, services, or components.

---

## Overview

TheraAI has three testing layers:

1. **Unit tests** — Individual routers, services, components tested in isolation with mocks
2. **Integration tests** — Multi-step user journeys (signup → chat → journal retrieval) end-to-end
3. **CI/CD** — Automated test runs on every push via GitHub Actions with coverage reporting

**Coverage targets:**
- Backend routers: 100% (every endpoint, ≥1 error case per endpoint)
- Backend services: 75%+ (business logic + CRUD)
- Frontend components: 50%+ baseline (key components: Auth, Chat, Journal, Dashboard)
- Frontend services: 70%+ (all API surface via MSW mocking)

---

## Backend Testing (pytest + FastAPI)

### Project Structure
```
backend/
├── tests/
│   ├── conftest.py              # Shared fixtures: async_client, mock_db, authenticated_headers, etc.
│   ├── test_auth.py             # /api/auth/* endpoints (20+ tests)
│   ├── test_journal_api.py      # /api/journals/* endpoints (12 tests)
│   ├── test_chat_api.py         # /api/chat/* endpoints (10 tests)
│   ├── test_moods_api.py        # /api/moods/* endpoints (8 tests)
│   ├── test_stats_api.py        # /api/users/stats/* endpoints (8 tests)
│   ├── test_services/
│   │   ├── test_user_service.py
│   │   ├── test_journal_service.py
│   │   ├── test_ai_service.py
│   │   ├── test_mood_service.py
│   │   ├── test_conversation_service.py
│   │   └── test_model_service.py
│   └── test_integration.py      # 5 critical user journeys
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── auth.py              # Router endpoints
│   │   ├── journal.py
│   │   ├── chat.py
│   │   ├── moods.py
│   │   ├── stats.py
│   │   └── conversations.py
│   ├── services/
│   │   ├── user_service.py      # Service classes (static methods)
│   │   ├── journal_service.py
│   │   ├── ai_service.py
│   │   ├── mood_service.py
│   │   ├── conversation_service.py
│   │   └── model_service.py
│   └── models/
│       ├── user.py              # Pydantic schemas
│       ├── journal.py
│       ├── mood.py
│       └── conversation.py
└── requirements.txt             # Includes pytest, pytest-asyncio, httpx-mock
```

### Setup: conftest.py

All shared fixtures go in `/backend/tests/conftest.py`. Key fixtures:

```python
# /backend/tests/conftest.py
import pytest
import pytest_asyncio
from fastapi.testclient import TestAsyncClient
from app.main import app
from app.utils.auth import create_access_token, hash_password
from datetime import datetime, timezone, timedelta

# ─────────────────────────────────────────────────────────────────
# Test client + database mocking
# ─────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def async_client():
    """FastAPI test client for async endpoints."""
    async with TestAsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
def mock_db(monkeypatch):
    """Mock MongoDB collections. Return a dict of AsyncMock collections."""
    from unittest.mock import AsyncMock
    mock_collections = {
        'users': AsyncMock(),
        'journals': AsyncMock(),
        'moods': AsyncMock(),
        'conversations': AsyncMock(),
        'chat_messages': AsyncMock(),
        'chat_history': AsyncMock(),
    }
    # Patch database manager
    monkeypatch.setattr("app.database.db", mock_collections)
    return mock_collections

# ─────────────────────────────────────────────────────────────────
# Auth fixtures
# ─────────────────────────────────────────────────────────────────

@pytest.fixture
def test_user_data():
    """Sample user data for signup/login tests."""
    return {
        "email": "test@example.com",
        "password": "SecurePassword123!",
        "full_name": "Test User",
    }

@pytest.fixture
def test_user_id():
    """Sample ObjectId for authenticated requests."""
    from bson import ObjectId
    return ObjectId()

@pytest.fixture
def authenticated_headers(test_user_id):
    """Valid JWT Bearer token header for authenticated requests."""
    token = create_access_token(
        data={"sub": str(test_user_id)},
        expires_delta=timedelta(minutes=30)
    )
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def user_factory():
    """Factory to create varied test users."""
    from bson import ObjectId
    def _create_user(
        email="test@example.com",
        role="patient",
        is_active=True,
        full_name="Test User"
    ):
        return {
            "_id": ObjectId(),
            "email": email,
            "full_name": full_name,
            "role": role,
            "is_active": is_active,
            "hashed_password": hash_password("SecurePassword123!"),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    return _create_user

# ─────────────────────────────────────────────────────────────────
# AI/Ollama mocking
# ─────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_ai_service(monkeypatch):
    """Mock AIService to avoid loading real transformer models."""
    from unittest.mock import AsyncMock, MagicMock
    mock_service = MagicMock()
    mock_service.analyze_text = AsyncMock(return_value={
        "sentiment_label": "POSITIVE",
        "sentiment_score": 0.92,
        "emotion_themes": ["joy", "gratitude"],
        "top_emotions": [
            {"emotion": "joy", "score": 0.85},
            {"emotion": "gratitude", "score": 0.78},
        ],
        "empathy_response": "That's wonderful! I'm glad you're feeling this way."
    })
    monkeypatch.setattr("app.services.ai_service.AIService", mock_service)
    return mock_service

@pytest.fixture
def mock_ollama(monkeypatch):
    """Mock Ollama HTTP calls (ModelService)."""
    from unittest.mock import AsyncMock, patch
    mock_response = AsyncMock()
    mock_response.json = AsyncMock(return_value={
        "message": {
            "content": "I understand you're feeling anxious. Let's explore what might be helping."
        }
    })
    monkeypatch.setattr(
        "httpx.AsyncClient.post",
        AsyncMock(return_value=mock_response)
    )
    return mock_response
```

### Test File Patterns

#### Endpoint Tests (one per router)

```python
# /backend/tests/test_auth.py
import pytest
from fastapi import status

@pytest.mark.asyncio
class TestAuthEndpoints:
    """Test /api/auth/* endpoints."""

    # ─── Signup ───────────────────────────────────────────
    async def test_signup_success(self, async_client, test_user_data):
        """Happy path: user can sign up with valid email/password."""
        response = await async_client.post("/api/v1/auth/signup", json=test_user_data)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert "access_token" in data

    async def test_signup_invalid_email(self, async_client, test_user_data):
        """Error case: invalid email format."""
        test_user_data["email"] = "not-an-email"
        response = await async_client.post("/api/v1/auth/signup", json=test_user_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_signup_duplicate_email(self, async_client, test_user_data, mock_db):
        """Error case: email already exists (409 Conflict)."""
        mock_db["users"].find_one = AsyncMock(
            return_value={"email": test_user_data["email"]}
        )
        response = await async_client.post("/api/v1/auth/signup", json=test_user_data)

        assert response.status_code == status.HTTP_409_CONFLICT
        assert "already exists" in response.json()["detail"]

    # ─── Login ────────────────────────────────────────────
    async def test_login_success(self, async_client, test_user_data, mock_db, user_factory):
        """Happy path: user can login with correct credentials."""
        existing_user = user_factory(email=test_user_data["email"])
        mock_db["users"].find_one = AsyncMock(return_value=existing_user)

        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": test_user_data["email"], "password": test_user_data["password"]}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data

    async def test_login_invalid_credentials(self, async_client):
        """Error case: invalid email or password (401 Unauthorized)."""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@example.com", "password": "WrongPassword"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # ─── Get Current User ─────────────────────────────────
    async def test_get_me_success(self, async_client, authenticated_headers, mock_db, user_factory):
        """Happy path: authenticated user can fetch their profile."""
        current_user = user_factory()
        mock_db["users"].find_one = AsyncMock(return_value=current_user)

        response = await async_client.get("/api/v1/auth/me", headers=authenticated_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == current_user["email"]

    async def test_get_me_unauthorized(self, async_client):
        """Error case: missing or invalid token (401 Unauthorized)."""
        response = await async_client.get("/api/v1/auth/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
```

#### Service Unit Tests

```python
# /backend/tests/test_services/test_journal_service.py
import pytest
from bson import ObjectId
from app.services.journal_service import JournalService
from app.models.journal import JournalCreate, AIAnalysisResult

@pytest.mark.asyncio
class TestJournalService:
    """Test JournalService business logic."""

    async def test_create_entry_runs_ai_analysis(self, mock_db, mock_ai_service):
        """Verify that create_entry triggers AI analysis."""
        user_id = str(ObjectId())
        journal_data = JournalCreate(
            content="I had a great day today",
            mood="happy"
        )

        # Mock DB insert
        mock_db["journals"].insert_one = AsyncMock(
            return_value=ObjectId()
        )

        result = await JournalService.create_entry(user_id, journal_data, mock_db["journals"])

        # Verify AI analysis was called (mock_ai_service.analyze_text)
        mock_ai_service.analyze_text.assert_called_once()
        assert result.sentiment_label == "POSITIVE"

    async def test_create_entry_ownership(self, mock_db):
        """Verify journal entry is tagged with user_id."""
        user_id = str(ObjectId())
        journal_data = JournalCreate(content="Test", mood="calm")

        mock_db["journals"].insert_one = AsyncMock(return_value=ObjectId())

        await JournalService.create_entry(user_id, journal_data, mock_db["journals"])

        # Verify insert was called with user_id
        call_args = mock_db["journals"].insert_one.call_args
        assert call_args[0][0]["user_id"] == user_id
```

#### Integration Tests

```python
# /backend/tests/test_integration.py
import pytest
from fastapi import status
from app.utils.auth import create_access_token
from datetime import timedelta

@pytest.mark.asyncio
class TestIntegrationScenarios:
    """Critical user journey scenarios."""

    async def test_scenario_1_signup_login_get_me(self, async_client, test_user_data, mock_db, user_factory):
        """Scenario 1: Signup → Login → Get Me."""
        # Step 1: Signup
        response = await async_client.post("/api/v1/auth/signup", json=test_user_data)
        assert response.status_code == status.HTTP_201_CREATED
        user_id = response.json()["id"]

        # Step 2: Login
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": test_user_data["email"], "password": test_user_data["password"]}
        )
        assert response.status_code == status.HTTP_200_OK
        token = response.json()["access_token"]

        # Step 3: Get current user
        response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["email"] == test_user_data["email"]

    async def test_scenario_3_chat_with_ollama_fallback(self, async_client, authenticated_headers, mock_ollama):
        """Scenario 3: Chat message with Ollama available, then fallback when unavailable."""
        # Test 1: Ollama available
        response = await async_client.post(
            "/api/v1/chat/message",
            json={"message": "I'm feeling anxious"},
            headers=authenticated_headers
        )
        assert response.status_code == status.HTTP_200_OK
        assert "content" in response.json()

        # Test 2: Mock Ollama timeout → fallback
        # (Mock `mock_ollama` to raise timeout exception)
        response = await async_client.post(
            "/api/v1/chat/message",
            json={"message": "I'm feeling anxious"},
            headers=authenticated_headers
        )
        assert response.status_code == status.HTTP_200_OK
        # Verify fallback response contains hotline info
        content = response.json()["content"]
        assert "help" in content.lower() or "hotline" in content.lower()

    async def test_scenario_5_ownership_validation(self, async_client, authenticated_headers, test_user_id, mock_db, user_factory):
        """Scenario 5: User A creates journal, User B cannot access it (403)."""
        # User A creates journal
        response = await async_client.post(
            "/api/v1/journals",
            json={"content": "Private journal", "mood": "calm"},
            headers=authenticated_headers
        )
        assert response.status_code == status.HTTP_201_CREATED
        journal_id = response.json()["id"]

        # User B tries to access User A's journal (403 Forbidden)
        user_b_id = str(ObjectId())
        user_b_token = create_access_token({"sub": user_b_id})
        user_b_headers = {"Authorization": f"Bearer {user_b_token}"}

        response = await async_client.get(
            f"/api/v1/journals/{journal_id}",
            headers=user_b_headers
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
```

### Key Patterns

**1. Mark all tests with `@pytest.mark.asyncio`**
```python
@pytest.mark.asyncio
async def test_something(self, async_client):
    response = await async_client.post(...)
```

**2. Use `AsyncMock` for database operations**
```python
from unittest.mock import AsyncMock
mock_db["journals"].insert_one = AsyncMock(return_value=ObjectId())
```

**3. Always test ownership — User B cannot access User A's data**
```python
# Create resource as User A
response = await async_client.post(..., headers=user_a_headers)
resource_id = response.json()["id"]

# Try to access as User B (should be 403)
response = await async_client.get(f".../{resource_id}", headers=user_b_headers)
assert response.status_code == status.HTTP_403_FORBIDDEN
```

**4. Mock external dependencies, not internal logic**
- ✅ Mock `AIService.analyze_text()` (external ML inference)
- ✅ Mock `ModelService` HTTP calls to Ollama (external service)
- ✅ Mock `Motor` database operations (external DB)
- ❌ Don't mock internal helper functions — test real behavior

**5. Test both happy path AND error cases**
```python
async def test_create_success(self, ...):  # Happy path
    response = await async_client.post(...)
    assert response.status_code == status.HTTP_201_CREATED

async def test_create_invalid_email(self, ...):  # Error: validation
    response = await async_client.post(..., json={"email": "invalid"})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

async def test_create_duplicate(self, ...):  # Error: business rule
    response = await async_client.post(...)
    assert response.status_code == status.HTTP_409_CONFLICT
```

---

## Frontend Testing (Vitest + React Testing Library)

### Project Structure
```
web/src/
├── __tests__/                       # Optional centralized test directory
│   ├── setup.ts                     # Vitest + MSW configuration
│   ├── mocks/
│   │   ├── handlers.ts              # MSW request handlers for all API endpoints
│   │   └── server.ts                # MSW server setup
│   ├── utils.tsx                    # Custom render + test utilities
│   └── fixtures/
│       ├── auth.fixtures.ts         # Mock user data, tokens, etc.
│       └── journal.fixtures.ts      # Mock journal entries, etc.
├── services/
│   ├── apiClient.js
│   ├── authService.js
│   ├── journalService.js
│   ├── chatService.js
│   ├── moodService.js
│   ├── statsService.js
│   └── *.test.js                    # Service tests (40+ tests)
├── contexts/
│   ├── AuthContext.jsx
│   ├── ToastContext.jsx
│   ├── AuthContext.test.jsx         # Context tests (18 tests)
│   └── ToastContext.test.jsx
├── components/
│   ├── Auth/
│   │   ├── Login.test.jsx           # Component tests (80+ total)
│   │   └── Signup.test.jsx
│   ├── Chat/
│   │   ├── Chat.test.jsx
│   │   ├── MessageBubble.test.jsx
│   │   └── VoiceInput.test.jsx
│   ├── Journal/
│   │   ├── Journal.test.jsx
│   │   ├── JournalCard.test.jsx
│   │   └── AddJournalModal.test.jsx
│   ├── Dashboard/
│   │   └── Dashboard.test.jsx
│   └── ... (other components)
└── vitest.config.ts                 # Vitest configuration
```

### Setup Files

#### `/web/src/__tests__/setup.ts` — Vitest Configuration
```typescript
// web/src/__tests__/setup.ts
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

// Setup MSW server
export const server = setupServer(...handlers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
  vi.clearAllMocks()
})

afterAll(() => {
  server.close()
})
```

#### `/web/src/__tests__/mocks/handlers.ts` — API Mocking
```typescript
// web/src/__tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const handlers = [
  // ─── Auth endpoints ───────────────────────────
  http.post(`${API}/api/v1/auth/login`, async ({ request }) => {
    const body = await request.json()
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        access_token: 'mock-jwt-token',
        token_type: 'bearer',
        id: '507f1f77bcf86cd799439011',
        email: body.email,
        full_name: 'Test User',
        role: 'patient',
      })
    }
    return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 })
  }),

  http.post(`${API}/api/v1/auth/signup`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      access_token: 'mock-jwt-token',
      token_type: 'bearer',
      id: '507f1f77bcf86cd799439011',
      email: body.email,
      full_name: body.full_name,
      role: 'patient',
    }, { status: 201 })
  }),

  http.get(`${API}/api/v1/auth/me`, () => {
    return HttpResponse.json({
      id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'patient',
      is_active: true,
      created_at: new Date().toISOString(),
    })
  }),

  // ─── Journal endpoints ────────────────────────
  http.get(`${API}/api/v1/journals`, () => {
    return HttpResponse.json([
      {
        id: '1',
        user_id: '507f1f77bcf86cd799439011',
        content: 'Had a good day',
        mood: 'happy',
        sentiment_label: 'POSITIVE',
        sentiment_score: 0.92,
        emotion_themes: ['joy'],
        created_at: new Date().toISOString(),
      },
    ])
  }),

  http.post(`${API}/api/v1/journals`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 'new-journal-id',
      user_id: '507f1f77bcf86cd799439011',
      content: body.content,
      mood: body.mood,
      sentiment_label: 'POSITIVE',
      sentiment_score: 0.85,
      emotion_themes: [],
      created_at: new Date().toISOString(),
    }, { status: 201 })
  }),

  // ─── Chat endpoints ──────────────────────────
  http.post(`${API}/api/v1/chat/message`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 'msg-1',
      conversation_id: 'conv-1',
      user_id: '507f1f77bcf86cd799439011',
      content: 'I understand you\'re feeling that way. Let\'s explore this together.',
      sender: 'ai',
      timestamp: new Date().toISOString(),
    })
  }),

  // ─── Error scenarios ─────────────────────────
  // Add handlers for 401, 404, 422, 500 errors as needed
]
```

#### `/web/src/__tests__/utils.tsx` — Custom Render Utility
```typescript
// web/src/__tests__/utils.tsx
import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import userEvent from '@testing-library/user-event'

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: ReactElement }) {
    return (
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    )
  }
  return render(ui, { wrapper: Wrapper, ...options })
}

export * from '@testing-library/react'
export { userEvent }
```

### Service Test Example

```typescript
// web/src/services/authService.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { server } from '@/__tests__/mocks/server'
import { HttpResponse, http } from 'msw'
import authService from './authService'

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('login makes POST request and stores token', async () => {
    const result = await authService.login('test@example.com', 'password123')

    expect(result.access_token).toBe('mock-jwt-token')
    expect(localStorage.getItem('theraai_auth_token')).toBe('mock-jwt-token')
  })

  it('login with invalid credentials throws error', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 })
      )
    )

    await expect(
      authService.login('invalid@example.com', 'wrongpassword')
    ).rejects.toThrow()
  })

  it('logout clears token from localStorage', async () => {
    // Set a token first
    localStorage.setItem('theraai_auth_token', 'some-token')

    authService.logout()

    expect(localStorage.getItem('theraai_auth_token')).toBeNull()
  })
})
```

### Component Test Example

```typescript
// web/src/components/Auth/Login.test.jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/__tests__/utils'
import Login from './Login'

describe('Login component', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders email and password fields', () => {
    renderWithProviders(<Login />)

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('submits form on button click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Login />)

    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /login/i }))

    // Wait for response (mocked by MSW)
    const successElement = await screen.findByText(/dashboard|home/i)
    expect(successElement).toBeInTheDocument()
  })

  it('shows error toast on 401 response', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json({ detail: 'Invalid email or password' }, { status: 401 })
      )
    )

    renderWithProviders(<Login />)

    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /login/i }))

    // Verify error message appears
    const errorMsg = await screen.findByText(/invalid email or password/i)
    expect(errorMsg).toBeInTheDocument()
  })
})
```

### Context Test Example

```typescript
// web/src/contexts/AuthContext.test.jsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// Component to test hook behavior
function TestComponent() {
  const { user, isAuthenticated, login } = useAuth()

  return (
    <div>
      <div>{isAuthenticated ? 'Logged in' : 'Not logged in'}</div>
      <button onClick={() => login('test@example.com', 'password123')}>Login</button>
    </div>
  )
}

describe('AuthContext', () => {
  it('initializes with no user', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText('Not logged in')).toBeInTheDocument()
  })

  it('logs in user on login action', async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await user.click(screen.getByRole('button', { name: /login/i }))

    // Wait for login to complete
    const loggedInMsg = await screen.findByText('Logged in')
    expect(loggedInMsg).toBeInTheDocument()
  })

  it('throws error when useAuth is used outside provider', () => {
    // Suppress error output for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow()

    spy.mockRestore()
  })
})
```

### Best Practices

**1. Query by role, not implementation**
```javascript
// ✅ Good — user-facing
screen.getByRole('button', { name: /login/i })
screen.getByPlaceholderText(/password/i)

// ❌ Bad — implementation detail
screen.getByTestId('login-btn')
screen.getByClassName('form-input')
```

**2. Wait for async updates**
```javascript
// ✅ Good — waits for element to appear
const element = await screen.findByText(/success/i)

// ❌ Bad — doesn't wait
expect(screen.queryByText(/success/i)).toBeInTheDocument()
```

**3. Test behavior, not implementation**
```javascript
// ✅ Good — tests observable behavior
await user.click(button)
expect(await screen.findByText(/saved/i)).toBeInTheDocument()

// ❌ Bad — tests internal state/implementation
expect(component.state.isSaving).toBe(false)
expect(someFunction).toHaveBeenCalledWith(...)
```

**4. Use MSW to mock API, not axios**
```javascript
// ✅ Good — MSW handles all HTTP calls globally
server.use(http.post('/api/v1/auth/login', () => ...))

// ❌ Bad — axios mocking is fragile
vi.mock('axios', () => ({...}))
```

---

## CI/CD — GitHub Actions

### `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7
        env:
          MONGO_INITDB_ROOT_USERNAME: admin
          MONGO_INITDB_ROOT_PASSWORD: password
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run tests with coverage
        run: |
          cd backend
          pytest tests/ \
            --cov=app \
            --cov-report=term-missing \
            --cov-report=xml

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml
          flags: backend
          fail_ci_if_error: true

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'web/package-lock.json'

      - name: Install dependencies
        run: |
          cd web
          npm ci

      - name: Run tests with coverage
        run: |
          cd web
          npm run test -- --run --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./web/coverage/coverage-final.json
          flags: frontend
          fail_ci_if_error: true
```

---

## Common Pitfalls & Solutions

| Problem | Solution |
|---------|----------|
| **Tests hang on async operations** | Always use `@pytest.mark.asyncio` on async tests; use `await` for async calls |
| **Database mock doesn't work** | Use `AsyncMock` for Motor operations; sync `MagicMock` for non-async mocks |
| **Tests pass locally, fail in CI** | Run tests with `pytest` in CI (no watch mode); ensure MongoDB service is running |
| **MSW handlers not catching requests** | Verify handler URL matches exactly (protocol, domain, path); check `onUnhandledRequest: 'error'` in server setup |
| **Component renders but event handlers don't fire** | Use `await userEvent.setup()` and `await user.click()`; don't use `fireEvent` directly |
| **Token not set in localStorage during tests** | Mock `authService.login()` via MSW; ensure localStorage is cleared in `beforeEach` |
| **API calls timeout in tests** | Increase timeout in `httpx` mock; ensure MSW handlers respond quickly |
| **Coverage drops unexpectedly** | Run tests locally with `--cov-report=term-missing` to see uncovered lines; add tests for error paths |

---

## Running Tests Locally

```bash
# Backend
cd backend
pytest tests/                                      # All tests
pytest tests/test_auth.py -v                      # Single file, verbose
pytest tests/ -k "test_create"                    # By name pattern
pytest tests/ --cov=app --cov-report=html        # Generate HTML coverage report

# Frontend
cd web
npm test                                          # Watch mode
npm test -- --run                                 # CI mode (no watch)
npm test -- --coverage                            # With coverage report
npm test -- --ui                                  # Interactive Vitest UI
```

---

## Summary

- **Backend:** pytest + AsyncMock + TestAsyncClient + conftest fixtures
- **Frontend:** Vitest + MSW + React Testing Library + custom renderWithProviders
- **Structure:** One test file per router/service/component with descriptive names
- **Mocking:** Mock external dependencies (DB, API, ML), test real business logic
- **Ownership:** Always test that users can't access each other's data (403)
- **CI:** GitHub Actions runs tests on every push; coverage reported via Codecov
