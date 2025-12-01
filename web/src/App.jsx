import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import Login from './components/Auth/LoginModern';
import Signup from './components/Auth/Signup';
import Dashboard from './pages/Dashboard/ModernDashboard';
import Journal from './pages/Journal/Journal';
import MoodTracker from './pages/MoodTracker/MoodTracker';
import './App.css';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <div className="app">
            <Routes>
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
              path="/mood-tracker"
              element={
                <ProtectedRoute>
                  <MoodTracker />
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
                  <div className="page-placeholder">
                    <h2>Appointments</h2>
                    <p>Manage your appointments and scheduling.</p>
                  </div>
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
                  <div className="page-placeholder">
                    <h2>Profile Settings</h2>
                    <p>Manage your account settings and preferences.</p>
                  </div>
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;