/**
 * Psychiatrist Dashboard Component
 * Modern dashboard for psychiatrist users with gradient theme
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, Calendar, Clock, Star, Plus, FileText, MessageSquare,
  TrendingUp, AlertCircle, CheckCircle, Activity, Search,
  Bell, Settings, LogOut, ChevronRight, BarChart3
} from 'lucide-react';
import './PsychiatristDashboard.css';

function PsychiatristDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // TODO: Replace with actual API calls
      // Simulating API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        totalPatients: 28,
        appointmentsToday: 5,
        pendingReviews: 3,
        averageRating: 4.8,
        activePatients: 24,
        completedSessions: 156
      });

      setPatients([
        {
          id: 1,
          name: 'John Doe',
          initials: 'JD',
          lastSession: '2025-12-08',
          nextSession: '2025-12-15',
          status: 'active',
          riskLevel: 'low',
          sessionsCount: 12
        },
        {
          id: 2,
          name: 'Jane Smith',
          initials: 'JS',
          lastSession: '2025-12-09',
          nextSession: '2025-12-16',
          status: 'active',
          riskLevel: 'medium',
          sessionsCount: 8
        },
        {
          id: 3,
          name: 'Mike Johnson',
          initials: 'MJ',
          lastSession: '2025-12-07',
          nextSession: '2025-12-14',
          status: 'needs_attention',
          riskLevel: 'high',
          sessionsCount: 15
        },
        {
          id: 4,
          name: 'Emily Davis',
          initials: 'ED',
          lastSession: '2025-12-06',
          nextSession: '2025-12-13',
          status: 'active',
          riskLevel: 'low',
          sessionsCount: 6
        }
      ]);

      setTodayAppointments([
        {
          id: 1,
          patientName: 'Alice Brown',
          patientInitials: 'AB',
          time: '10:00 AM',
          duration: '60 min',
          type: 'Initial Consultation',
          status: 'confirmed'
        },
        {
          id: 2,
          patientName: 'Bob Wilson',
          patientInitials: 'BW',
          time: '2:00 PM',
          duration: '45 min',
          type: 'Follow-up Session',
          status: 'confirmed'
        },
        {
          id: 3,
          patientName: 'Carol Davis',
          patientInitials: 'CD',
          time: '4:00 PM',
          duration: '60 min',
          type: 'Therapy Session',
          status: 'pending'
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getRiskLevelLabel = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return 'Low Risk';
      case 'medium': return 'Medium';
      case 'high': return 'High Risk';
      default: return 'Unknown';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `In ${diffDays} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="psychiatrist-dashboard">
        <div className="loading-container">
          <Activity className="loading-icon spin" size={48} />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="psychiatrist-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Welcome back, Dr. {user?.full_name?.split(' ')[user?.full_name?.split(' ').length - 1] || 'Psychiatrist'}</h1>
            <p>Here's what's happening with your practice today</p>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={() => navigate('/settings')}>
              <Settings size={20} />
            </button>
            <button className="icon-btn" onClick={handleLogout}>
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Statistics Cards */}
        <div className="stats-row">
          <div className="stat-card stat-purple">
            <div className="stat-icon-wrapper">
              <Users size={32} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalPatients}</div>
              <div className="stat-label">Total Patients</div>
            </div>
          </div>

          <div className="stat-card stat-blue">
            <div className="stat-icon-wrapper">
              <Calendar size={32} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.appointmentsToday}</div>
              <div className="stat-label">Today's Appointments</div>
            </div>
          </div>

          <div className="stat-card stat-orange">
            <div className="stat-icon-wrapper">
              <Clock size={32} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.pendingReviews}</div>
              <div className="stat-label">Pending Reviews</div>
            </div>
          </div>

          <div className="stat-card stat-green">
            <div className="stat-icon-wrapper">
              <Star size={32} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.averageRating}</div>
              <div className="stat-label">Average Rating</div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="dashboard-grid">
          {/* Today's Appointments */}
          <div className="dashboard-card appointments-card">
            <div className="card-header">
              <div className="card-title">
                <Calendar size={24} />
                <h3>Today's Appointments</h3>
              </div>
              <button className="view-all-btn" onClick={() => navigate('/appointments')}>
                View All <ChevronRight size={16} />
              </button>
            </div>
            <div className="appointments-list">
              {todayAppointments.length > 0 ? (
                todayAppointments.map(appointment => (
                  <div key={appointment.id} className="appointment-item">
                    <div className="appointment-avatar">
                      {appointment.patientInitials}
                    </div>
                    <div className="appointment-info">
                      <h4>{appointment.patientName}</h4>
                      <p className="appointment-type">{appointment.type}</p>
                      <div className="appointment-meta">
                        <span className="time"><Clock size={14} /> {appointment.time}</span>
                        <span className="duration">{appointment.duration}</span>
                      </div>
                    </div>
                    <div className="appointment-status">
                      <span className={`status-badge ${appointment.status}`}>
                        {appointment.status === 'confirmed' ? <CheckCircle size={14} /> : <Clock size={14} />}
                        {appointment.status}
                      </span>
                      <button className="btn-icon" title="View Details">
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Calendar size={48} />
                  <p>No appointments scheduled for today</p>
                </div>
              )}
            </div>
          </div>

          {/* Patient Management */}
          <div className="dashboard-card patients-card">
            <div className="card-header">
              <div className="card-title">
                <Users size={24} />
                <h3>Patient List</h3>
              </div>
              <div className="search-bar">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="patients-list">
              {filteredPatients.length > 0 ? (
                filteredPatients.map(patient => (
                  <div key={patient.id} className="patient-item">
                    <div className="patient-avatar">
                      {patient.initials}
                    </div>
                    <div className="patient-info">
                      <div className="patient-header">
                        <h4>{patient.name}</h4>
                        <span 
                          className="risk-badge"
                          style={{ 
                            backgroundColor: `${getRiskLevelColor(patient.riskLevel)}20`,
                            color: getRiskLevelColor(patient.riskLevel)
                          }}
                        >
                          {getRiskLevelLabel(patient.riskLevel)}
                        </span>
                      </div>
                      <div className="patient-meta">
                        <span className="meta-item">
                          <Activity size={14} />
                          {patient.sessionsCount} sessions
                        </span>
                        <span className="meta-item">
                          <Calendar size={14} />
                          Next: {formatDate(patient.nextSession)}
                        </span>
                      </div>
                    </div>
                    <button className="btn-view" onClick={() => navigate(`/patients/${patient.id}`)}>
                      View Details
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Users size={48} />
                  <p>No patients found</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card actions-card">
            <div className="card-header">
              <div className="card-title">
                <Activity size={24} />
                <h3>Quick Actions</h3>
              </div>
            </div>
            <div className="action-buttons-grid">
              <button className="action-button action-purple">
                <Plus size={24} />
                <span>Schedule Appointment</span>
              </button>
              <button className="action-button action-blue">
                <FileText size={24} />
                <span>View Notes</span>
              </button>
              <button className="action-button action-orange">
                <MessageSquare size={24} />
                <span>Message Patient</span>
              </button>
              <button className="action-button action-green">
                <BarChart3 size={24} />
                <span>Generate Report</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="dashboard-card activity-card">
            <div className="card-header">
              <div className="card-title">
                <Bell size={24} />
                <h3>Recent Activity</h3>
              </div>
            </div>
            <div className="activity-list">
              <div className="activity-item activity-urgent">
                <div className="activity-icon">
                  <AlertCircle size={20} />
                </div>
                <div className="activity-content">
                  <h4>High Risk Alert</h4>
                  <p>Mike Johnson missed last appointment</p>
                  <span className="activity-time">2 hours ago</span>
                </div>
              </div>

              <div className="activity-item activity-info">
                <div className="activity-icon">
                  <FileText size={20} />
                </div>
                <div className="activity-content">
                  <h4>Assessment Due</h4>
                  <p>Jane Smith's quarterly assessment is due next week</p>
                  <span className="activity-time">1 day ago</span>
                </div>
              </div>

              <div className="activity-item activity-success">
                <div className="activity-icon">
                  <CheckCircle size={20} />
                </div>
                <div className="activity-content">
                  <h4>Progress Update</h4>
                  <p>John Doe completed all homework assignments</p>
                  <span className="activity-time">3 days ago</span>
                </div>
              </div>

              <div className="activity-item activity-info">
                <div className="activity-icon">
                  <TrendingUp size={20} />
                </div>
                <div className="activity-content">
                  <h4>Positive Trend</h4>
                  <p>Emily Davis shows improvement in mood tracking</p>
                  <span className="activity-time">5 days ago</span>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}

export default PsychiatristDashboard;