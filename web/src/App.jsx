import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import LandingPage from './pages/Landing/LandingPageV0';
import Login from './pages/Auth/LoginV0';
import Signup from './pages/Auth/SignupV0';
import Dashboard from './pages/Dashboard/DashboardV0';
import Journal from './pages/Journal/JournalV0';
import JournalDetail from './pages/Journal/JournalDetailV0';
import MoodTracker from './pages/MoodTracker/MoodTrackerV0';
import Chat from './pages/Chat/ChatV0';
import Profile from './pages/Profile/ProfileV0';
import Settings from './pages/Settings/SettingsV0';
import Assessments from './pages/Assessments/AssessmentsV0';
import Appointments from './pages/Appointments/AppointmentsV0';
import './App.css';

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

            {/* Protected Routes - require authentication */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Role-based Protected Routes */}
            <Route
              path="/patients"
              element={
                <ProtectedRoute roles={['psychiatrist', 'admin']}>
                  <div className="page-placeholder">
                    <h2>Patients Management</h2>
                    <p>This page is available for psychiatrists and admins.</p>
                  </div>
                </ProtectedRoute>
              }
            />

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
                  <div className="page-placeholder">
                    <h2>Progress Tracking</h2>
                    <p>Track your mental health progress over time.</p>
                  </div>
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
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;