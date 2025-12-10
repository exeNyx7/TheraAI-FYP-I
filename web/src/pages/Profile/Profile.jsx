/**
 * Profile Page
 * User profile management with avatar, stats, and account settings
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft, User, Mail, Calendar, Award, BookOpen, Flame,
  Target, Camera, Edit2, Save, X, Shield, Clock, TrendingUp
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { getUserStats } from '../../services/statsService';
import './Profile.css';

function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || ''
  });

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const data = await getUserStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel - reset form
      setFormData({
        full_name: user?.full_name || '',
        email: user?.email || ''
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    // TODO: Implement profile update API call
    console.log('Saving profile:', formData);
    setIsEditing(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleBadge = (role) => {
    const badges = {
      patient: { label: 'Member', color: 'blue', emoji: '🌱' },
      psychiatrist: { label: 'Professional', color: 'purple', emoji: '👨‍⚕️' },
      admin: { label: 'Administrator', color: 'red', emoji: '⚡' }
    };
    return badges[role] || badges.patient;
  };

  const roleBadge = getRoleBadge(user?.role);

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>
        <h1 className="page-title">Profile</h1>
        <div className="header-actions">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                className="action-button cancel-btn"
                onClick={handleEditToggle}
              >
                <X size={18} />
                Cancel
              </Button>
              <Button
                className="action-button save-btn"
                onClick={handleSave}
              >
                <Save size={18} />
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              className="action-button edit-btn"
              onClick={handleEditToggle}
            >
              <Edit2 size={18} />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="profile-container">
        {/* Profile Card */}
        <Card className="profile-card">
          <div className="profile-avatar-section">
            <div className="avatar-wrapper">
              <div className="avatar-circle">
                <User size={48} />
              </div>
              <button className="avatar-upload-btn">
                <Camera size={16} />
              </button>
            </div>
            <div className="role-badge-wrapper">
              <div className={`role-badge role-${roleBadge.color}`}>
                <span className="role-emoji">{roleBadge.emoji}</span>
                <span className="role-label">{roleBadge.label}</span>
              </div>
            </div>
          </div>

          <CardContent className="profile-info">
            <div className="info-grid">
              <div className="info-item">
                <label className="info-label">
                  <User size={16} />
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="info-input"
                  />
                ) : (
                  <div className="info-value">{user?.full_name}</div>
                )}
              </div>

              <div className="info-item">
                <label className="info-label">
                  <Mail size={16} />
                  Email Address
                </label>
                <div className="info-value">{user?.email}</div>
                <span className="info-hint">Email cannot be changed</span>
              </div>

              <div className="info-item">
                <label className="info-label">
                  <Shield size={16} />
                  Account Role
                </label>
                <div className="info-value capitalize">{user?.role}</div>
              </div>

              <div className="info-item">
                <label className="info-label">
                  <Calendar size={16} />
                  Member Since
                </label>
                <div className="info-value">
                  {formatDate(stats?.member_since)}
                </div>
              </div>

              <div className="info-item">
                <label className="info-label">
                  <Clock size={16} />
                  Last Journal Entry
                </label>
                <div className="info-value">
                  {stats?.last_entry_date ? formatDate(stats.last_entry_date) : 'No entries yet'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="stats-grid">
          <Card className="stat-card">
            <div className="stat-icon-wrapper stat-purple">
              <Award size={32} />
            </div>
            <div className="stat-content">
              <div className="stat-value">Level {stats?.level || 1}</div>
              <div className="stat-label">{stats?.total_points || 0} XP</div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="stat-icon-wrapper stat-orange">
              <Flame size={32} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats?.streak || 0}</div>
              <div className="stat-label">Day Streak</div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="stat-icon-wrapper stat-blue">
              <BookOpen size={32} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats?.journal_entries || 0}</div>
              <div className="stat-label">Journal Entries</div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="stat-icon-wrapper stat-green">
              <Target size={32} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {stats?.weekly_progress || 0}/{stats?.weekly_goal || 5}
              </div>
              <div className="stat-label">Weekly Goal</div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="stat-icon-wrapper stat-pink">
              <TrendingUp size={32} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats?.mood_score?.toFixed(1) || '0.0'}/10</div>
              <div className="stat-label">Avg Mood Score</div>
            </div>
          </Card>
        </div>

        {/* Account Actions */}
        <Card className="actions-card">
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="action-buttons-grid">
              <Button
                variant="outline"
                className="action-btn"
                onClick={() => navigate('/settings')}
              >
                <Shield size={18} />
                Settings & Privacy
              </Button>
              <Button
                variant="outline"
                className="action-btn danger"
                onClick={logout}
              >
                <ArrowLeft size={18} />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Profile;
