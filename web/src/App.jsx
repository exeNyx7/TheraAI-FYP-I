import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import LandingPage from './pages/Landing/LandingPageV0';
import Login from './pages/Auth/LoginV0';
import Signup from './pages/Auth/SignupV0';
import Dashboard from './pages/Dashboard/DashboardV0';
import Journal from './pages/Journal/Journal';
import JournalDetail from './pages/Journal/JournalDetailV0';
import MoodTracker from './pages/MoodTracker/MoodTracker';
import Chat from './pages/Chat/Chat';
import Profile from './pages/Profile/Profile';
import Settings from './pages/Settings/Settings';
import Assessments from './pages/Assessments/Assessments';
import Appointments from './pages/Appointments/Appointments';
import Achievements from './pages/Achievements/Achievements';
import Onboarding from './pages/Onboarding/Onboarding';
import TherapistOnboarding from './pages/Onboarding/TherapistOnboarding';
import ForgotPassword from './pages/Auth/ForgotPassword';
import OTPVerification from './pages/Auth/OTPVerification';
import ResetPassword from './pages/Auth/ResetPassword';
import BrowseTherapists from './pages/Therapists/BrowseTherapists';
import BookTherapist from './pages/Therapists/BookTherapist';
import WaitingRoom from './pages/Call/WaitingRoom';
import PostCallPatient from './pages/Call/PostCallPatient';
import PostCallTherapist from './pages/Call/PostCallTherapist';
import Patients from './pages/Therapist/Patients';
import PatientDetail from './pages/Therapist/PatientDetail';
import Schedule from './pages/Therapist/Schedule';
import TreatmentPlans from './pages/Therapist/TreatmentPlans';
import NotificationPopup from './components/Notifications/NotificationPopup';
import AchievementUnlockPopup from './components/Achievements/AchievementUnlockPopup';
import TherapistProgress from './pages/Therapist/TherapistProgress';
import SessionsPage from './pages/Sessions/SessionsPage';
import ResourcesPage from './pages/Resources/ResourcesPage';
import './App.css';

function AuthAwareRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />;
}

function FloatingChatButton() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Only show for authenticated patients, and not on the chat page itself
  if (!isAuthenticated || user?.role !== 'patient' || location.pathname === '/chat') return null;
  return (
    <button
      onClick={() => navigate('/chat')}
      title="Chat with AI"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:scale-105 hover:shadow-xl transition-all duration-200 flex items-center justify-center active:scale-95"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}

/** Redirects authenticated users who haven't completed onboarding. */
function OnboardingGate({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return children;
  if (user && !user.onboarding_completed) {
    const dest = user.role === 'psychiatrist' ? '/therapist-onboarding' : '/onboarding';
    return <Navigate to={dest} replace />;
  }
  return children;
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <div className="app">
            <NotificationPopup />
            <AchievementUnlockPopup />
            <FloatingChatButton />
            <Routes>
            {/* Landing Page - Public, no auth check */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Routes - only accessible when not authenticated */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route
              path="/otp-verification"
              element={
                <PublicRoute>
                  <OTPVerification />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              }
            />

            {/* Onboarding wizards — protected, not gated (new users land here) */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/therapist-onboarding"
              element={
                <ProtectedRoute>
                  <TherapistOnboarding />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - require authentication */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <Dashboard />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />

            {/* Legacy redirect — therapist-dashboard now served at /dashboard */}
            <Route
              path="/therapist-dashboard"
              element={<Navigate to="/dashboard" replace />}
            />

            <Route
              path="/patients"
              element={
                <ProtectedRoute roles={['psychiatrist', 'therapist', 'admin']}>
                  <Patients />
                </ProtectedRoute>
              }
            />

            <Route
              path="/patients/:id"
              element={
                <ProtectedRoute roles={['psychiatrist', 'therapist', 'admin']}>
                  <PatientDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/schedule"
              element={
                <ProtectedRoute roles={['psychiatrist', 'therapist', 'admin']}>
                  <Schedule />
                </ProtectedRoute>
              }
            />

            <Route
              path="/sessions"
              element={
                <ProtectedRoute roles="patient">
                  <SessionsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/community"
              element={
                <ProtectedRoute roles="patient">
                  <div className="page-placeholder">
                    <h2>Community Support</h2>
                    <p>Connect with others on their wellness journey. Share experiences and find support.</p>
                  </div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute roles="admin">
                  <div className="page-placeholder">
                    <h2>User Management</h2>
                    <p>Admin-only user management interface.</p>
                  </div>
                </ProtectedRoute>
              }
            />

            {/* Placeholder Protected Routes */}
            {/* Journal & Mood Tracking Routes */}
            <Route
              path="/journal"
              element={
                <ProtectedRoute>
                  <Journal />
                </ProtectedRoute>
              }
            />

            <Route
              path="/journal/:id"
              element={
                <ProtectedRoute>
                  <JournalDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/mood"
              element={
                <ProtectedRoute>
                  <MoodTracker />
                </ProtectedRoute>
              }
            />

            <Route
              path="/chat"
              element={
                <ProtectedRoute roles="patient">
                  <Chat />
                </ProtectedRoute>
              }
            />

            <Route
              path="/progress"
              element={
                <ProtectedRoute>
                  <Assessments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/achievements"
              element={
                <ProtectedRoute>
                  <Achievements />
                </ProtectedRoute>
              }
            />

            <Route
              path="/therapists"
              element={
                <ProtectedRoute>
                  <BrowseTherapists />
                </ProtectedRoute>
              }
            />

            <Route
              path="/book/:therapistId"
              element={
                <ProtectedRoute roles="patient">
                  <BookTherapist />
                </ProtectedRoute>
              }
            />

            <Route
              path="/appointments"
              element={
                <ProtectedRoute>
                  <Appointments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/assessments"
              element={
                <ProtectedRoute>
                  <Assessments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/treatment-plans"
              element={
                <ProtectedRoute roles={['psychiatrist', 'therapist', 'admin']}>
                  <TreatmentPlans />
                </ProtectedRoute>
              }
            />

            <Route
              path="/therapist-progress"
              element={
                <ProtectedRoute roles={['psychiatrist', 'therapist', 'admin']}>
                  <TherapistProgress />
                </ProtectedRoute>
              }
            />

            <Route
              path="/resources"
              element={
                <ProtectedRoute>
                  <ResourcesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/waiting-room/:appointmentId"
              element={
                <ProtectedRoute>
                  <WaitingRoom />
                </ProtectedRoute>
              }
            />
            <Route
              path="/call/:appointmentId/post-patient"
              element={
                <ProtectedRoute roles="patient">
                  <PostCallPatient />
                </ProtectedRoute>
              }
            />
            <Route
              path="/call/:appointmentId/post-therapist"
              element={
                <ProtectedRoute roles={['therapist', 'psychiatrist', 'admin']}>
                  <PostCallTherapist />
                </ProtectedRoute>
              }
            />

            {/* Unauthorized Route */}
            <Route
              path="/unauthorized"
              element={
                <div className="unauthorized-page">
                  <h2>Access Denied</h2>
                  <p>You don't have permission to access this page.</p>
                  <button onClick={() => window.history.back()}>Go Back</button>
                </div>
              }
            />

            {/* Default Routes */}
            <Route path="*" element={<AuthAwareRedirect />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;