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

  const renderDashboardContent = () => {
    switch (user?.role) {
      case 'patient':
        return <PatientDashboard />;
      case 'psychiatrist':
        return <PsychiatristDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return (
          <div className="dashboard-error">
            <h2>Access Error</h2>
            <p>Unable to load dashboard. Invalid user role.</p>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <Navigation />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Welcome back, {user?.full_name || 'User'}! 👋</h1>
            <p className="dashboard-subtitle">
              {user?.role === 'patient' && 'Your wellness journey continues here. Take it one step at a time.'}
              {user?.role === 'psychiatrist' && 'Ready to make a difference today. Your expertise matters.'}
              {user?.role === 'admin' && 'System overview and management at your fingertips.'}
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
          {renderDashboardContent()}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;