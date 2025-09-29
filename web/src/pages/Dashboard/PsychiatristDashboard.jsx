/**
 * Psychiatrist Dashboard Component
 * Specialized dashboard for psychiatrist users
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

function PsychiatristDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);

  // Mock data for demonstration
  useEffect(() => {
    // In a real app, this would fetch from your API
    setPatients([
      {
        id: 1,
        name: 'John Doe',
        lastSession: '2024-03-12',
        nextSession: '2024-03-19',
        status: 'active',
        riskLevel: 'low'
      },
      {
        id: 2,
        name: 'Jane Smith',
        lastSession: '2024-03-13',
        nextSession: '2024-03-20',
        status: 'active',
        riskLevel: 'medium'
      },
      {
        id: 3,
        name: 'Mike Johnson',
        lastSession: '2024-03-10',
        nextSession: '2024-03-17',
        status: 'needs_attention',
        riskLevel: 'high'
      }
    ]);

    setTodayAppointments([
      {
        id: 1,
        patientName: 'Alice Brown',
        time: '10:00 AM',
        type: 'Initial Consultation',
        status: 'confirmed'
      },
      {
        id: 2,
        patientName: 'Bob Wilson',
        time: '2:00 PM',
        type: 'Follow-up Session',
        status: 'confirmed'
      },
      {
        id: 3,
        patientName: 'Carol Davis',
        time: '4:00 PM',
        type: 'Therapy Session',
        status: 'pending'
      }
    ]);
  }, []);

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="psychiatrist-dashboard">
      <div className="dashboard-grid">
        {/* Statistics Overview */}
        <div className="dashboard-card stats-card">
          <h3>Practice Overview</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">28</span>
              <span className="stat-label">Active Patients</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">5</span>
              <span className="stat-label">Today's Sessions</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">2</span>
              <span className="stat-label">Urgent Cases</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">94%</span>
              <span className="stat-label">Attendance Rate</span>
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="dashboard-card appointments-card">
          <h3>Today's Appointments</h3>
          <div className="appointments-list">
            {todayAppointments.map(appointment => (
              <div key={appointment.id} className="appointment-item">
                <div className="appointment-time">
                  <span className="time">{appointment.time}</span>
                </div>
                <div className="appointment-details">
                  <h4>{appointment.patientName}</h4>
                  <p>{appointment.type}</p>
                  <span className={`status ${appointment.status}`}>
                    {appointment.status}
                  </span>
                </div>
                <div className="appointment-actions">
                  <button className="btn-small">Join</button>
                  <button className="btn-small secondary">Notes</button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-secondary full-width">View All Appointments</button>
        </div>

        {/* Patient Management */}
        <div className="dashboard-card patients-card">
          <h3>Recent Patients</h3>
          <div className="patients-list">
            {patients.map(patient => (
              <div key={patient.id} className="patient-item">
                <div className="patient-avatar">
                  {patient.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="patient-info">
                  <h4>{patient.name}</h4>
                  <p>Last session: {patient.lastSession}</p>
                  <p>Next session: {patient.nextSession}</p>
                </div>
                <div className="patient-status">
                  <div 
                    className="risk-indicator"
                    style={{ backgroundColor: getRiskLevelColor(patient.riskLevel) }}
                  ></div>
                  <span className={`status ${patient.status}`}>
                    {patient.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-secondary full-width">View All Patients</button>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card actions-card">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button className="action-btn">
              <span className="action-icon">👥</span>
              <span>Add New Patient</span>
            </button>
            <button className="action-btn">
              <span className="action-icon">📅</span>
              <span>Schedule Appointment</span>
            </button>
            <button className="action-btn">
              <span className="action-icon">📝</span>
              <span>Clinical Notes</span>
            </button>
            <button className="action-btn">
              <span className="action-icon">📊</span>
              <span>Generate Reports</span>
            </button>
            <button className="action-btn">
              <span className="action-icon">💊</span>
              <span>Prescriptions</span>
            </button>
            <button className="action-btn">
              <span className="action-icon">🔔</span>
              <span>Notifications</span>
            </button>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="dashboard-card alerts-card">
          <h3>Alerts & Notifications</h3>
          <div className="alerts-list">
            <div className="alert-item high">
              <span className="alert-icon">⚠️</span>
              <div className="alert-content">
                <h4>High Risk Patient</h4>
                <p>Mike Johnson missed last appointment and shows concerning mood patterns</p>
                <span className="alert-time">2 hours ago</span>
              </div>
            </div>
            <div className="alert-item medium">
              <span className="alert-icon">📋</span>
              <div className="alert-content">
                <h4>Assessment Due</h4>
                <p>Jane Smith's quarterly assessment is due next week</p>
                <span className="alert-time">1 day ago</span>
              </div>
            </div>
            <div className="alert-item low">
              <span className="alert-icon">✅</span>
              <div className="alert-content">
                <h4>Progress Update</h4>
                <p>John Doe completed all homework assignments</p>
                <span className="alert-time">3 days ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Resources */}
        <div className="dashboard-card resources-card">
          <h3>Clinical Resources</h3>
          <div className="resource-links">
            <a href="#" className="resource-link">
              <span className="resource-icon">📚</span>
              <span>Treatment Guidelines</span>
            </a>
            <a href="#" className="resource-link">
              <span className="resource-icon">🧠</span>
              <span>Assessment Tools</span>
            </a>
            <a href="#" className="resource-link">
              <span className="resource-icon">💊</span>
              <span>Medication Database</span>
            </a>
            <a href="#" className="resource-link">
              <span className="resource-icon">👥</span>
              <span>Peer Consultation</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PsychiatristDashboard;