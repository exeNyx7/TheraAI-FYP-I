---
name: react-design-system
description: Enforces consistent UI/UX patterns for the TheraAI React frontend. Auto-trigger whenever working on any frontend file — components (components/), pages (pages/), services (services/), contexts (contexts/), styles (*.css, tailwind.config.js), or App.jsx. Also trigger when building new UI components, adding API calls, designing forms, handling loading/error states, writing chat interface code, or making any visual/layout change to the mental health therapy app.
---

# TheraAI React Design System

This skill defines every UI/UX pattern used in this codebase. Follow these patterns precisely — do not introduce new ones without strong justification.

---

## 1. Component Folder Structure & Naming

```
web/src/
├── App.jsx                      # All routes defined here
├── main.jsx                     # Entry point (wraps with AuthProvider + ToastProvider)
├── pages/                       # Full-page route components
│   ├── Auth/
│   │   ├── LoginV0.jsx          # ← ACTIVE (imported in App.jsx)
│   │   └── SignupV0.jsx         # ← ACTIVE
│   ├── Dashboard/
│   │   ├── DashboardV0.jsx      # Role router → Patient/Psychiatrist/Admin
│   │   ├── PatientDashboardV0.jsx
│   │   ├── PsychiatristDashboardV0.jsx
│   │   └── AdminDashboardV0.jsx
│   ├── Chat/Chat.jsx
│   ├── Journal/
│   │   ├── Journal.jsx
│   │   └── JournalDetailV0.jsx
│   ├── MoodTracker/MoodTracker.jsx
│   ├── Profile/Profile.jsx
│   ├── Settings/Settings.jsx
│   ├── Appointments/Appointments.jsx
│   ├── Assessments/Assessments.jsx
│   ├── Achievements/Achievements.jsx
│   ├── Therapist/TherapistDashboard.jsx
│   └── Landing/LandingPageV0.jsx
├── components/
│   ├── ui/                      # Reusable primitives (shadcn-style)
│   │   ├── button.jsx, input.jsx, textarea.jsx, card.jsx
│   │   ├── dialog.jsx, modal.jsx, select.jsx, badge.jsx
│   │   ├── avatar.jsx, alert.jsx, progress.jsx, separator.jsx
│   │   ├── tooltip.jsx, skeleton.jsx
│   │   └── index.js             # Barrel export — always import from here
│   ├── Chat/                    # MessageBubble, SessionHistory, VoiceInput
│   ├── Journal/                 # JournalCard, JournalForm, AddJournalModal, MoodSelector
│   ├── Dashboard/               # DashboardHeader, SidebarNav, TherapistSidebar, QuickActions, ActivityHeatmap
│   ├── Landing/                 # HeroSection, FeaturesGrid, ValueProposition, CTASection
│   ├── Auth/                    # Login.jsx, Signup.jsx (modern — NOT used in App.jsx, dead code)
│   ├── Navigation/              # Navbar.jsx, Footer.jsx
│   ├── Appointments/            # TherapistSelector, PaymentCheckout
│   ├── Assessments/             # AssessmentSelector
│   ├── Teletherapy/             # VideoCallModal (not connected to backend)
│   ├── Gamification/            # AchievementTracker
│   └── Loading/                 # Loading.jsx
├── services/                    # API call modules (one per resource)
├── contexts/                    # AuthContext, ToastContext
└── lib/utils.js                 # cn() helper only
```

**Naming rules:**
- Pages: PascalCase, suffix `V0` on initial versions (e.g., `LoginV0.jsx`, `DashboardV0.jsx`)
- Components: PascalCase, no version suffix unless actively versioning
- Services: camelCase with `Service` suffix (`authService.js`, `chatService.js`)
- Dead code: `_OLD.jsx`, `_NEW.jsx` variants exist in `Auth/` — do NOT import them; only the `V0` pages are active in `App.jsx`

---

## 2. Styling Approach

**Stack:** Tailwind CSS 3.4 + CSS custom properties (HSL) + `cn()` utility

### The `cn()` helper — always use this for conditional classes
```javascript
import { cn } from '@/lib/utils'
// cn() = twMerge(clsx(...inputs))
// Use for any conditional or merged Tailwind class strings
```

### CSS Custom Properties (from `src/index.css`)

#### Light mode (`:root`)
```css
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--card: 0 0% 100%;
--card-foreground: 222.2 84% 4.9%;
--popover: 0 0% 100%;
--popover-foreground: 222.2 84% 4.9%;
--primary: 262 83% 58%;           /* Purple — brand primary */
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96%;
--secondary-foreground: 222.2 84% 4.9%;
--muted: 210 40% 96%;
--muted-foreground: 215.4 16.3% 46.9%;
--accent: 210 40% 96%;
--accent-foreground: 222.2 84% 4.9%;
--destructive: 0 84.2% 60.2%;     /* Red */
--destructive-foreground: 210 40% 98%;
--border: 214.3 31.8% 91.4%;
--input: 214.3 31.8% 91.4%;
--ring: 262 83% 58%;
--radius: 0.75rem;
/* Sidebar */
--sidebar: 210 40% 96%;
--sidebar-primary: 262 83% 58%;
--sidebar-accent: 210 40% 92%;
--sidebar-border: 214.3 31.8% 88%;
```

#### Dark mode (`.dark`)
```css
--background: 222.2 84% 4.9%;
--foreground: 210 40% 98%;
--card: 222.2 47% 8%;
--primary: 262 83% 68%;           /* Lighter purple in dark mode */
--sidebar: 222.2 47% 8%;
/* (all others inverted accordingly) */
```

#### App-specific semantic tokens
```css
--therapy-primary: 262 83% 58%;    /* Purple */
--therapy-secondary: 204 100% 97%; /* Light Blue */
--therapy-accent: 142 76% 36%;     /* Green */
--therapy-warning: 38 92% 50%;     /* Orange */
--therapy-danger: 0 84% 60%;       /* Red */
--therapy-success: 142 76% 36%;    /* Green */
--therapy-info: 199 89% 48%;       /* Blue */
```

**Rule:** Always reference CSS variables via Tailwind tokens (`bg-primary`, `text-foreground`, `border-border`, etc.) — never hardcode HSL values inline. Use hex only for Recharts chart colors (Recharts doesn't support CSS vars).

### Recharts chart color palette (hex, hardcoded by necessity)
```javascript
happy:    '#FBBF24'  // amber
sad:      '#3B82F6'  // blue
anxious:  '#EF4444'  // red
calm:     '#14B8A6'  // teal
neutral:  '#9CA3AF'  // gray
excited:  '#F59E0B'  // orange
stressed: '#6366F1'  // indigo
```

### Tailwind configuration summary
- **Dark mode:** `class` strategy — toggle `dark` class on `document.documentElement`
- **Font:** `font-sans` → `Montserrat`
- **Border radius:** `rounded-lg` = `var(--radius)` = 0.75rem
- **Container:** centered, 2rem padding, max-width 1400px at 2xl
- **Animations:** `accordion-down` / `accordion-up` (from tailwindcss-animate)

---

## 3. State Management Patterns

### Auth state — `AuthContext`
```javascript
import { useAuth } from '@/contexts/AuthContext'

const {
  user, isAuthenticated, loading, error,
  login, signup, logout, updateUser, clearError, loadUser,
  hasRole, isAdmin, isPsychiatrist, isPatient
} = useAuth()
```

**State shape:**
```javascript
{ user: null | UserObject, isAuthenticated: boolean, loading: boolean, error: string | null }
```

**Actions dispatched:** `SET_LOADING`, `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`, `SET_USER`, `CLEAR_ERROR`, `SET_ERROR`

**Token storage:** `localStorage` key = `import.meta.env.VITE_AUTH_TOKEN_KEY` || `'theraai_auth_token'`

### Toast notifications — `ToastContext`
```javascript
import { useToast } from '@/contexts/ToastContext'

const { showSuccess, showError, showWarning, showInfo } = useToast()

showError('Something went wrong')
showSuccess('Saved successfully')
```

Toast types: `success` | `error` | `warning` | `info`. Auto-dismiss. Bottom-right stacked.

### Local component state
All other state is `useState` / `useEffect` — no Redux, no Zustand, no react-query. Standard async data fetch pattern:

```javascript
const [data, setData] = useState(null)
const [isLoading, setIsLoading] = useState(false)
const { showError } = useToast()

useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const result = await someService.getData()
      setData(result)
    } catch (err) {
      showError(err.response?.data?.detail || err.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }
  fetchData()
}, [])
```

---

## 4. Reusable Component Patterns

### Button
```javascript
import { Button } from '@/components/ui'

// Variants: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
//           "gradient" | "success" | "warning" | "purple"
// Sizes:    "sm" | "default" | "lg" | "icon" | "icon-sm" | "icon-lg"
// Special:  loading={boolean}  leftIcon={<Icon />}  rightIcon={<Icon />}

<Button variant="default" size="default" loading={isLoading}>
  Save Changes
</Button>
<Button variant="destructive" size="sm">Delete</Button>
<Button variant="gradient">Get Started</Button>  {/* blue→purple gradient */}
```

**Loading state rule:** Always pass `loading={isLoading}` to `Button` — it renders a spinner and sets `disabled` automatically. Do not manually disable or change button text to "Loading…".

**Icon-only buttons must have `aria-label`:**
```javascript
<Button variant="ghost" size="icon" aria-label="Delete entry">
  <Trash2 className="h-4 w-4" />
</Button>
```

### Input
```javascript
import { Input } from '@/components/ui'

// Variants: "default" | "error" | "success"
// Sizes:    "sm" | "default" | "lg"
// Props:    leftIcon, rightIcon, error (bool), success (bool)

<Input
  type="email"
  placeholder="Enter email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  variant={emailError ? 'error' : 'default'}
/>
```

Always pair with `<label htmlFor="...">` for accessibility.

### Card
```javascript
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle / helper text</CardDescription>
  </CardHeader>
  <CardContent>{/* body */}</CardContent>
  <CardFooter>{/* actions */}</CardFooter>
</Card>
```

Gradient card variant (used in DashboardHeader stats):
```javascript
className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-2 border-primary/20 hover:shadow-lg hover:-translate-y-1 transition-all"
```

### Badge
```javascript
import { Badge } from '@/components/ui'

// Variants: "default" | "secondary" | "destructive" | "outline"
//           "success" | "warning" | "info"

<Badge variant="success">Completed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="info">New</Badge>
```

### Modal / Dialog
```javascript
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, ConfirmDialog } from '@/components/ui'

// Sizes: "sm" | "md" | "lg" | "xl" | "full"
<Modal open={isOpen} onOpenChange={setIsOpen} size="md">
  <ModalHeader>
    <ModalTitle>Title</ModalTitle>
  </ModalHeader>
  <ModalContent>{/* body */}</ModalContent>
  <ModalFooter>
    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button onClick={handleSubmit}>Confirm</Button>
  </ModalFooter>
</Modal>

// For destructive confirmations — always use ConfirmDialog, never a plain window.confirm()
<ConfirmDialog
  open={showDeleteConfirm}
  onConfirm={handleDelete}
  onCancel={() => setShowDeleteConfirm(false)}
  title="Delete entry?"
  description="This action cannot be undone."
/>
```

### Alert
```javascript
import { Alert } from '@/components/ui'

// Variants: "default" | "destructive" | "success" | "warning" | "info"
<Alert variant="warning" dismissible onDismiss={() => setShowAlert(false)}>
  Your session will expire in 5 minutes.
</Alert>
```

### Progress bar
```javascript
import { Progress } from '@/components/ui'

// Colors: "blue" | "green" | "purple" | "red" | "yellow"
// Sizes:  "sm" | "md" | "lg"
<Progress value={75} color="purple" size="sm" showPercentage animated />
```

### Skeleton (loading placeholders)
```javascript
import { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar } from '@/components/ui'

<SkeletonCard />             // full card placeholder
<SkeletonText lines={3} />   // text block placeholder
<SkeletonAvatar size="md" />
```

### Avatar
```javascript
import { UserAvatar } from '@/components/ui'

// Sizes: "sm" | "md" | "lg" | "xl"
// Falls back to gradient initials (bg-gradient-to-br from-blue-500 to-purple-600) if no image
<UserAvatar user={currentUser} size="md" />
```

### Loading spinner
```javascript
import Loading from '@/components/Loading/Loading'

// Variants: "spinner" | "dots" | "pulse"
// Sizes:    "sm" | "md" | "lg" | "xl"
// Colors:   "blue" | "purple" | "green" | "gray"

<Loading variant="spinner" size="md" color="purple" />
<Loading variant="dots" size="sm" />
<Loading fullScreen message="Loading data..." />  // backdrop blur overlay
```

---

## 5. Color Palette & Typography

### Brand palette
| Role | Tailwind token | Approx. color |
|------|---------------|---------------|
| Primary | `bg-primary` / `text-primary` | Purple `hsl(262 83% 58%)` |
| Foreground | `text-foreground` | Near-black |
| Muted text | `text-muted-foreground` | Mid-gray — helper/secondary text only |
| Card bg | `bg-card` | White (light) / dark blue-gray (dark) |
| Border | `border-border` | Light gray |
| Destructive | `bg-destructive` | Red — errors and delete actions only |

### Mood color mapping — use THIS table consistently across ALL mood UI
```javascript
// bg-[color]/10 for background, text-[color] for icon/text
const MOOD_COLORS = {
  happy:    { text: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  sad:      { text: 'text-blue-500',   bg: 'bg-blue-500/10'   },
  anxious:  { text: 'text-purple-500', bg: 'bg-purple-500/10' },
  angry:    { text: 'text-red-500',    bg: 'bg-red-500/10'    },
  calm:     { text: 'text-green-500',  bg: 'bg-green-500/10'  },
  excited:  { text: 'text-orange-500', bg: 'bg-orange-500/10' },
  stressed: { text: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  neutral:  { text: 'text-gray-500',   bg: 'bg-gray-500/10'   },
}
```

> **Note:** Current codebase has inconsistencies between `AddJournalModal` (5 moods), `MoodSelector` (8 moods), and `JournalDetailV0` (different colors). Always use the 8-mood table above when building new mood UI.

### 8 canonical moods (use all 8, not a subset)
```javascript
import { Smile, Frown, CloudRain, Angry, Heart, Zap, Wind, Meh } from 'lucide-react'

const MOODS = [
  { value: 'happy',    label: 'Happy',    icon: Smile,     ...MOOD_COLORS.happy    },
  { value: 'sad',      label: 'Sad',      icon: Frown,     ...MOOD_COLORS.sad      },
  { value: 'anxious',  label: 'Anxious',  icon: CloudRain, ...MOOD_COLORS.anxious  },
  { value: 'angry',    label: 'Angry',    icon: Angry,     ...MOOD_COLORS.angry    },
  { value: 'calm',     label: 'Calm',     icon: Heart,     ...MOOD_COLORS.calm     },
  { value: 'excited',  label: 'Excited',  icon: Zap,       ...MOOD_COLORS.excited  },
  { value: 'stressed', label: 'Stressed', icon: Wind,      ...MOOD_COLORS.stressed },
  { value: 'neutral',  label: 'Neutral',  icon: Meh,       ...MOOD_COLORS.neutral  },
]
```

### Typography
- **Font family:** Montserrat everywhere. Applied via `font-sans` in Tailwind (mapped to `['Montserrat', 'sans-serif']` in `tailwind.config.js`)
- **Never** hardcode `fontFamily` inline unless overriding for a specific logo/brand mark

Heading scale (Tailwind):
```
text-xs      12px  — metadata, timestamps, small labels
text-sm      14px  — body text, list items, form helpers
text-base    16px  — standard body
text-lg      18px  — card titles, section labels
text-xl      20px  — sub-headings
text-2xl     24px  — CardTitle, page section headings
text-3xl+    30px+ — page headings, hero titles
```

---

## 6. Mental Health UX Guidelines

This is a therapy application. Every UI decision must reinforce emotional safety, trust, and calm. These rules are **non-negotiable.**

### Language & tone
- **Affirming, not clinical.** "How are you feeling?" not "Enter mood data."
- **Encourage, never shame.** Show "Keep up the great work!" for streaks. Never show "You missed X days."
- **Normalize emotions.** "It's completely okay to feel this way" — use language like this for difficult emotional states.
- **UI role labels:** Call psychiatrists **"Therapist"** in UI. Call patients **"Member"** in UI. Never expose the backend role names `patient` or `psychiatrist` directly to users.
- **Avoid harmful language:** Never use "crazy," "insane," "psycho," "lunatic" anywhere in UI copy. Use "overwhelmed," "anxious," "struggling," "difficult time" instead.
- **Crisis acknowledgement:** If a user expresses crisis content in chat, the AI response must include a resource or suggest speaking to a professional. Do not dismiss.

### Colors and visual tone
- **Purple = calm, wisdom, care** — the primary brand color. Lean into it for trust-building UI.
- **Red = alerts and destruction only** — never use red for primary actions, never on backgrounds in normal flows.
- **Soft gradients convey warmth:** `bg-gradient-to-br from-primary/15 to-primary/5` on stat cards and hero areas.
- **Validation errors:** Use `bg-red-50 border-red-200 text-red-700` — never a solid `bg-red-600` which feels alarming.

### Avoiding alarming UI patterns
- **No full-screen error states** for recoverable errors — use toasts.
- **No undismissable modals** except for critical confirmations.
- **Always use `ConfirmDialog`** before destructive actions (delete journal entry, clear chat history, etc.).
- **Empty states must be encouraging:**
  ```
  "No journal entries yet."        ← bad (bare)
  "Your journey starts here.        ← good
   Write your first entry to begin."
  ```
- **Never leave blank white space during loading** — always show `<SkeletonCard />` or `<Loading />`.

### Accessible design (WCAG AA minimum)
- All `<input>` and `<textarea>` must have `<label htmlFor="...">` — existing pattern in `LoginV0`, `SignupV0`
- Color must never be the ONLY way to convey information — pair with icons or text labels
- Interactive elements: visible focus styles via `focus-visible:ring-2 focus-visible:ring-ring` (already in all `ui/` components)
- Minimum touch target size: aim for 44×44px on mobile (`h-11 w-11`); current minimum is `h-10 w-10` (40px — acceptable)
- Text contrast: use `text-foreground` for body text, `text-muted-foreground` only for secondary/helper text
- Do not use `outline: none` without providing a replacement focus indicator
- Icon-only buttons MUST have `aria-label`
- Use semantic HTML elements: `<nav>`, `<main>`, `<section>`, `<header>`, `<article>` — already done in `SidebarNav` and `Navbar`

---

## 7. Chat Interface Patterns

The AI wellness companion lives at `pages/Chat/Chat.jsx`.

### Layout structure
```
[SidebarNav | left fixed] [Chat main | center flex-1] [SessionHistory | right, hidden on mobile]
```

### Chat main column layout
```
┌─────────────────────────────────────┐
│  Header: "Mindful Chat" + actions   │  sticky top, border-b
├─────────────────────────────────────┤
│                                     │
│  Messages (overflow-y-auto flex-1)  │
│  └─ <MessageBubble> per message     │
│  └─ Typing indicator (isLoading)    │
│                                     │
├─────────────────────────────────────┤
│  Suggested prompts (if no messages) │  chips, horizontal scroll
├─────────────────────────────────────┤
│  [Input] [Send Button] [VoiceInput] │  sticky bottom, border-t
└─────────────────────────────────────┘
```

### MessageBubble classes
```javascript
// User bubble (right-aligned)
wrapper:  "flex flex-row-reverse gap-3 animate-fade-in"
bubble:   "bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3 max-w-[75%] text-sm"
avatar:   "h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold"

// AI bubble (left-aligned)
wrapper:  "flex flex-row gap-3 animate-fade-in"
bubble:   "bg-muted text-foreground border border-border rounded-2xl rounded-bl-sm px-4 py-3 max-w-[75%] text-sm"
avatar:   "h-8 w-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center"
```

### Typing indicator (AI is thinking)
```javascript
// 3 bouncing dots with staggered delay
<div className="flex gap-1 px-4 py-3">
  {[0, 1, 2].map(i => (
    <div
      key={i}
      className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
      style={{ animationDelay: `${i * 0.15}s` }}
    />
  ))}
</div>
```

### Suggested prompt chips (shown before first message)
```javascript
const SUGGESTED_PROMPTS = [
  "I'm feeling overwhelmed with work",
  "How can I manage anxiety better?",
  "I had a great day, want to celebrate!",
  "I'm struggling with sleep"
]
// On click: setInputValue(prompt) and focus the input
```

### Voice input
`VoiceInput.jsx` uses the Web Speech Recognition API (`window.SpeechRecognition`). Returns `null` silently if unsupported. Always render it — users with compatible browsers get the feature automatically with no extra effort.

---

## 8. Responsive Design Breakpoints

**Tailwind default breakpoints as used in this codebase:**

| Breakpoint | Min-width | Primary usage |
|-----------|----------|--------------|
| `sm:` | 640px | Rarely used |
| `md:` | 768px | Main mobile → desktop switch point |
| `lg:` | 1024px | 3-column layouts, right panels |
| `xl:` | 1280px | Wide layouts |
| `2xl:` | 1536px | Container max-width (1400px) |

**Standard responsive patterns from this codebase:**
```javascript
// Sidebar visibility
"hidden md:flex"             // hidden on mobile, flex on desktop (SidebarNav)
"w-20 md:w-64"               // collapsed vs expanded sidebar width

// Grid layouts
"grid grid-cols-2 md:grid-cols-4"   // QuickActions (2 col mobile, 4 col desktop)
"grid grid-cols-1 md:grid-cols-2"   // form field pairs

// Page containers
"p-4 md:p-6 lg:p-8"         // progressive padding
"pt-16 md:pt-0"              // top padding on mobile for fixed nav header
"max-w-2xl mx-auto"          // narrow content pages (Profile, Settings)
"max-w-md"                   // auth forms

// Right panels
"hidden lg:flex"             // SessionHistory in Chat page

// Responsive text
"text-lg md:text-2xl"        // responsive headings
```

**Mobile navigation:** `SidebarNav` shows a hamburger icon on mobile. The sidebar slides in from the left with `translate-x-0` / `-translate-x-full`. Overlay: `z-40 bg-black/50`. Always test new pages in the mobile sidebar-collapsed state.

---

## 9. Inconsistencies to Fix

When touching these areas, normalize to the standard documented above:

| Area | Current issue | Fix |
|------|--------------|-----|
| **Mood set size** | `AddJournalModal` has 5 moods; `MoodSelector` has 8; `JournalDetailV0` has 5 | Standardize all mood UI to the canonical 8-mood set |
| **Mood colors** | Same moods have different colors across components (anxious = `text-purple-500` in MoodSelector vs `text-red-500` in JournalDetailV0) | Extract `MOOD_COLORS` constant to a shared `lib/constants.js` file and import everywhere |
| **Dead auth components** | `components/Auth/` has `Login.jsx`, `LoginModern.jsx`, `_OLD`, `_NEW` variants | These are dead code — delete them; only `pages/Auth/LoginV0.jsx` and `SignupV0.jsx` are active |
| **Direct fetch() in pages** | `pages/Journal/Journal.jsx` and `pages/Chat/Chat.jsx` call `fetch(\`${API}/...\`)` directly | Move all API calls to `services/`; pages should only call service functions |
| **Multiple axios instances** | Some service files create their own axios instance instead of importing `apiClient` | Always import `apiClient` from `services/apiClient.js` — never instantiate axios directly |
| **Form validation inconsistency** | `LoginV0` uses only HTML5 `required`; `SignupV0` has manual JS validation | Use HTML5 for simple required fields; manual JS for cross-field validation (password match, length). Do not introduce react-hook-form without discussion |
| **Loading state inconsistency** | Some pages use `<Loading>`, some inline spinners, some change button text | Page data load: `<SkeletonCard />`. Button actions: `loading={isLoading}` prop. Full-screen block: `<Loading fullScreen />` |
| **Mock data in components** | `SessionHistory.jsx` has hardcoded sessions; `ActivityHeatmap.jsx` generates random data | Connect both to real API endpoints (`/conversations` and `/users/me/activity`) |
| **`DashboardHeader` hardcoded stats** | 4 stat cards use hardcoded values ("7 days", "85%") | Wire up to `statsService.getUserStats()` |

---

## 10. API Call Patterns

### The axios client — always use this, never create your own
```javascript
import apiClient from '@/services/apiClient'

// Pre-configured with:
// - baseURL: import.meta.env.VITE_API_URL || '/api/v1'
// - Authorization: Bearer ${token} header (request interceptor, auto-injected)
// - 401 handler: clears token + dispatches 'auth:unauthorized' → redirects to /login
```

### Service module pattern
```javascript
// services/exampleService.js
import apiClient from './apiClient'

const exampleService = {
  async getAll(params = {}) {
    const response = await apiClient.get('/resource', { params })
    return response.data
  },
  async getById(id) {
    const response = await apiClient.get(`/resource/${id}`)
    return response.data
  },
  async create(data) {
    const response = await apiClient.post('/resource', data)
    return response.data
  },
  async update(id, data) {
    const response = await apiClient.put(`/resource/${id}`, data)
    return response.data
  },
  async remove(id) {
    await apiClient.delete(`/resource/${id}`)
  }
}

export default exampleService
```

### Error handling in components — standard pattern
```javascript
try {
  setIsLoading(true)
  const data = await someService.create(payload)
  setData(data)
  showSuccess('Created successfully!')
} catch (err) {
  const message = err.response?.data?.detail || err.message || 'Something went wrong'
  showError(message)
} finally {
  setIsLoading(false)
}
```

### Which loading pattern to use

| Scenario | Pattern |
|----------|---------|
| Initial page data load | `isLoading` → render `<SkeletonCard />` or `<Loading />` instead of content |
| Button action (save, submit, delete) | `loading={isLoading}` prop on `<Button>` — auto-disables + spinner |
| Silent background update | No indicator — show toast on success/failure |
| Full-page blocking operation | `<Loading fullScreen message="..." />` |

### Which error pattern to use

| Scenario | Pattern |
|----------|---------|
| API call failure | `showError(message)` toast — non-blocking, bottom-right |
| Form field validation | `variant="error"` on `<Input>` + small helper text below field |
| Page-level fetch failure | Inline `<Alert variant="destructive">` with a retry button |
| 401 Unauthorized | Auto-handled by `apiClient.js` interceptor — no manual handling needed |

### Backend response notes
- Backend returns `id` (string) after `from_doc()` conversion — not `_id`
- Pagination uses `skip` + `limit` query params (not `page` + `pageSize`)
- Error body: `{ "detail": "Human-readable message" }` — always extract via `err.response?.data?.detail`
