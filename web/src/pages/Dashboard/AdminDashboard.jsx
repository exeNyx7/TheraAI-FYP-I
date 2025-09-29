/**
 * Admin Dashboard Component
 * Specialized dashboard for admin users
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

function AdminDashboard() {
  const { user } = useAuth();
  const [systemStats, setSystemStats] = useState({});
  const [recentUsers, setRecentUsers] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);

  // Mock data for demonstration
  useEffect(() => {
    setSystemStats({
      totalUsers: 1247,
      activePatients: 892,
      activePsychiatrists: 34,
      totalSessions: 5623,
      monthlyGrowth: 12.5,
      systemUptime: '99.9%',
      avgResponseTime: '120ms',
      storageUsed: '68%'
    });

    setRecentUsers([
      {
        id: 1,
        name: 'Dr. Emma Wilson',
        email: 'emma.wilson@example.com',
        role: 'psychiatrist',
        joinDate: '2024-03-14',
        status: 'active'
      },
      {
        id: 2,
        name: 'John Patient',
        email: 'john.patient@example.com',
        role: 'patient',
        joinDate: '2024-03-14',
        status: 'pending'
      },
      {
        id: 3,
        name: 'Sarah Therapist',
        email: 'sarah.therapist@example.com',
        role: 'psychiatrist',
        joinDate: '2024-03-13',
        status: 'active'
      }
    ]);

    setSystemAlerts([
      {
        id: 1,
        type: 'warning',
        title: 'High Server Load',
        message: 'CPU usage at 85% for the past 30 minutes',
        timestamp: '5 minutes ago'
      },
      {
        id: 2,
        type: 'info',
        title: 'Scheduled Maintenance',
        message: 'System maintenance scheduled for tonight at 2:00 AM',
        timestamp: '2 hours ago'
      },
      {
        id: 3,
        type: 'success',
        title: 'Backup Completed',
        message: 'Daily database backup completed successfully',
        timestamp: '6 hours ago'
      }
    ]);
  }, []);

  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#8b5cf6';
      case 'psychiatrist': return '#06b6d4';
      case 'patient': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-grid">
        {/* System Overview */}
        <div className="dashboard-card stats-overview">
          <h3>System Overview</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">{systemStats.totalUsers?.toLocaleString()}</span>
              <span className="stat-label">Total Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{systemStats.activePatients?.toLocaleString()}</span>
              <span className="stat-label">Active Patients</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{systemStats.activePsychiatrists}</span>
              <span className="stat-label">Psychiatrists</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{systemStats.totalSessions?.toLocaleString()}</span>
              <span className="stat-label">Total Sessions</span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="dashboard-card performance-card">
          <h3>Performance Metrics</h3>
          <div className="metrics-list">
            <div className="metric-item">
              <span className="metric-label">Monthly Growth</span>
              <span className="metric-value positive">+{systemStats.monthlyGrowth}%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">System Uptime</span>
              <span className="metric-value">{systemStats.systemUptime}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Avg Response Time</span>
              <span className="metric-value">{systemStats.avgResponseTime}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Storage Used</span>
              <span className="metric-value warning">{systemStats.storageUsed}</span>
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="dashboard-card users-card">
          <h3>Recent User Registrations</h3>
          <div className="users-list">
            {recentUsers.map(user => (
              <div key={user.id} className="user-item">
                <div className="user-avatar">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="user-info">
                  <h4>{user.name}</h4>
                  <p>{user.email}</p>
                  <span className="join-date">Joined: {user.joinDate}</span>
                </div>
                <div className="user-badges">
                  <span 
                    className="role-badge"
                    style={{ backgroundColor: getRoleColor(user.role) }}
                  >
                    {user.role}
                  </span>
                  <span className={`status-badge ${user.status}`}>
                    {user.status}
                  </span>
                </div>
                <div className="user-actions">
                  <button className="btn-small">View</button>
                  <button className="btn-small secondary">Edit</button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-secondary full-width">View All Users</button>
        </div>

        {/* System Alerts */}
        <div className="dashboard-card alerts-card">
          <h3>System Alerts</h3>
          <div className="alerts-list">
            {systemAlerts.map(alert => (
              <div key={alert.id} className={`alert-item ${alert.type}`}>
                <span className="alert-icon">{getAlertIcon(alert.type)}</span>
                <div className="alert-content">
                  <h4>{alert.title}</h4>
                  <p>{alert.message}</p>
                  <span className="alert-time">{alert.timestamp}</span>
                </div>
                <button className="alert-dismiss">×</button>
              </div>
            ))}
          </div>
          <button className="btn-secondary full-width">View All Alerts</button>
        </div>

        {/* Admin Actions */}
        <div className="dashboard-card admin-actions">
          <h3>Admin Actions</h3>
          <div className="action-buttons">
            <button className="action-btn">
              <span className="action-icon">👥</span>
              <span>User Management</span>
            </button>
            <button className="action-btn">
              <span className="action-icon">🔧</span>
              <span>System Settings</span>
            </button>
            <button className="action-btn">
              <span className="action-icon">📊</span>
              <span>Analytics</span>
            </button>
            <button className="action-btn">
              <span className="action-icon">🔐</span>
              <span>Security Logs</span>
            </button>
            <button className="action-btn">
              <span className="action-icon">💾</span>
              <span>Backup & Restore</span>
            </button>
            <button className="action-btn">
              <span className="action-icon">📋</span>
              <span>System Reports</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="dashboard-card quick-stats">
          <h3>Today's Activity</h3>
          <div className="stats-list">
            <div className="stat-row">
              <span className="stat-label">New Registrations</span>
              <span className="stat-value">23</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Active Sessions</span>
              <span className="stat-value">156</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">API Calls</span>
              <span className="stat-value">12.3K</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Error Rate</span>
              <span className="stat-value">0.02%</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Data Transfer</span>
              <span className="stat-value">2.1 GB</span>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="dashboard-card health-card">
          <h3>System Health</h3>
          <div className="health-indicators">
            <div className="health-item">
              <div className="health-icon good">✓</div>
              <div className="health-info">
                <h4>Database</h4>
                <p>All connections healthy</p>
              </div>
            </div>
            <div className="health-item">
              <div className="health-icon good">✓</div>
              <div className="health-info">
                <h4>API Services</h4>
                <p>All endpoints responding</p>
              </div>
            </div>
            <div className="health-item">
              <div className="health-icon warning">!</div>
              <div className="health-info">
                <h4>Storage</h4>
                <p>68% capacity reached</p>
              </div>
            </div>
            <div className="health-item">
              <div className="health-icon good">✓</div>
              <div className="health-info">
                <h4>Authentication</h4>
                <p>JWT service operational</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;