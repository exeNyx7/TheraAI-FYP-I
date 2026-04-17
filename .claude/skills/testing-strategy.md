---
name: testing-strategy
description: Testing approach for TheraAI. Trigger when writing or debugging tests.
---

# TheraAI Testing — Quick Reference

## Backend (pytest)
```bash
cd backend
pytest tests/ -v
pytest tests/test_auth.py -v  # single file
```
- All async tests need `@pytest.mark.asyncio`
- Use `AsyncMock` for Motor DB operations
- Always test ownership: User B cannot access User A's data (expect 403)
- Mock AI service and Ollama — don't load real models in tests

## Frontend (Vitest)
```bash
cd web
npm test -- --run   # CI mode
npm test            # watch mode
```
- Use MSW to mock API, not axios directly
- Use `renderWithProviders` to wrap components with AuthProvider + ToastProvider
- `await screen.findByText(...)` for async renders

## Seeded Test Accounts
Password for all: `TheraAI@2024!`
```bash
cd backend
python -m scripts.seed_therapist_profiles  # creates 4 therapist accounts
python -m scripts.seed_assessments         # seeds PHQ-9, GAD-7, PSS-10, WHO-5
```

## Testing Order (manual)
1. Backend starts: `cd backend && uvicorn app.main:app --reload --port 8000`
2. Auth: signup patient → login → `/dashboard` loads
3. Journal: create → list → delete
4. Mood: log mood → check chart
5. Assessments: complete PHQ-9 → check score
6. Appointments: book → cancel (check no `undefined` in URL)
7. Chat: send message (fallback if Ollama not running)
8. Therapist login → therapist dashboard
9. Admin login → admin dashboard, user list
