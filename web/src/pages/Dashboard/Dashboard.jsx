/**
 * Dashboard Component
 * Main dashboard that adapts based on user role
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Navigation from '../../components/Navigation/Navigation';
import Loading from '../../components/Loading/Loading';
import PatientDashboard from './PatientDashboard';
import PsychiatristDashboard from './PsychiatristDashboard';
import AdminDashboard from './AdminDashboard';
import './Dashboard.css';

function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen={true} message="Loading your dashboard..." size="large" />;
  }

  // Render role-specific dashboard directly
  // Psychiatrist and Admin dashboards have their own layout
  if (user?.role === 'psychiatrist') {
    return <PsychiatristDashboard />;
  }

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  // Patient dashboard uses the Navigation wrapper
  if (user?.role === 'patient') {
    return (
      <div className="dashboard-container">
        <Navigation />
        <main className="dashboard-main">
          <div className="dashboard-header">
            <div className="welcome-section">
              <h1>Welcome back, {user?.full_name || 'User'}! 👋</h1>
              <p className="dashboard-subtitle">
                Your wellness journey continues here. Take it one step at a time.
              </p>
            </div>
            <div className="quick-actions-header">
              <button className="btn-primary-small">
                <span>🎯</span> Set Today's Goal
              </button>
              <button className="btn-secondary-small">
                <span>📊</span> View Reports
              </button>
            </div>
          </div>
          
          <div className="dashboard-content">
            <PatientDashboard />
          </div>
        </main>
      </div>
    );
  }

  // Default error state
  return (
    <div className="dashboard-container">
      <Navigation />
      <main className="dashboard-main">
        <div className="dashboard-error">
          <h2>Access Error</h2>
          <p>Unable to load dashboard. Invalid user role.</p>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;