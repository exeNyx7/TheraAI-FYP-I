---
name: react-design-system
description: Critical frontend rules for TheraAI. Trigger when working on web/src/ files.
---

# TheraAI React — Critical Rules

## Non-Negotiables
- **API calls**: ALWAYS use `apiClient` from `web/src/apiClient.js`. NEVER raw `fetch` or direct axios. Never hardcode `http://localhost:8000`.
- **Routes**: NEVER navigate to a route not in `App.jsx`. Check first.
- **Role UI**: SidebarNav renders per role. Never show patient pages to psychiatrists/admins.
- **Auth state**: Use `useAuth()` from `AuthContext` — has `user`, `isAuthenticated`, `hasRole()`, `isPatient()`, `isPsychiatrist()`, `isAdmin()`.
- **Toasts**: `useToast()` → `showSuccess()`, `showError()`.

## apiClient Usage
```js
import apiClient from '../../apiClient';

// GET
const res = await apiClient.get('/journals');
setData(res.data);

// POST
await apiClient.post('/journals', { content, mood });

// PUT / DELETE
await apiClient.put(`/appointments/${id}/cancel`);
await apiClient.delete(`/journals/${id}`);
```

## MongoDB ID Handling (Frontend)
Backend may return `_id` OR `id` depending on serialization. Always use:
```js
const itemId = item.id || item._id;
```

## Routes in App.jsx (complete list)
`/`, `/login`, `/signup`, `/dashboard`, `/therapist-dashboard`, `/journal`, `/journal/:id`,
`/mood`, `/chat`, `/progress`, `/achievements`, `/appointments`, `/assessments`,
`/resources`, `/profile`, `/settings`, `/patients`, `/sessions`, `/community`, `/users`, `/unauthorized`

## Wildcard Route
`*` now uses `AuthAwareRedirect` → sends logged-in users to `/dashboard`, others to `/`.

## Error Pattern
```js
try {
  const res = await apiClient.get('/endpoint');
  setData(res.data);
} catch (err) {
  showError(err.response?.data?.detail || 'Failed to load.');
}
```

## Pages Fixed (raw fetch → apiClient)
- Journal.jsx ✅
- MoodTracker.jsx ✅
- Profile.jsx ✅
- Settings.jsx (change-password) ✅
- Achievements.jsx (now fetches from /users/me/achievements) ✅
- Appointments.jsx (video call id, cancel id) ✅

## Pages Still Using Mock/Hardcoded Data
- DashboardV0.jsx — check for raw fetch patterns
- JournalDetailV0.jsx — check for raw fetch patterns
