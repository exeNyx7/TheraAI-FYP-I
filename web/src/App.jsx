import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import ForgotPassword from './pages/Auth/ForgotPassword';
import OTPVerification from './pages/Auth/OTPVerification';
import ResetPassword from './pages/Auth/ResetPassword';
import './App.css';

function AuthAwareRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />;
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <div className="app">
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

            {/* Onboarding — protected, patient-only wizard */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - require authentication */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Legacy redirect — therapist-dashboard now served at /dashboard */}
            <Route
              path="/therapist-dashboard"
              element={<Navigate to="/dashboard" replace />}
            />

            <Route path="/patients" element={<Navigate to="/dashboard" replace />} />

            <Route
              path="/sessions"
              element={
                <ProtectedRoute roles="patient">
                  <div className="page-placeholder">
                    <h2>My Sessions</h2>
                    <p>View and manage your wellness sessions and consultations.</p>
                  </div>
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
                <ProtectedRoute>
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
              path="/resources"
              element={
                <ProtectedRoute>
                  <div className="page-placeholder">
                    <h2>Resources</h2>
                    <p>Mental health resources and educational materials.</p>
                  </div>
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