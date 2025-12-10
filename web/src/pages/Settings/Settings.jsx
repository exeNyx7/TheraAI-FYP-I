/**
 * Settings Page
 * User preferences, notifications, privacy, and account settings
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft, Bell, Lock, Eye, Palette, Download, Trash2,
  Shield, Mail, Moon, Sun, Globe, Check, X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import './Settings.css';

function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState({
    // Notifications
    emailNotifications: true,
    weeklyDigest: true,
    achievementAlerts: true,
    reminderNotifications: false,
    
    // Privacy
    profileVisibility: 'private',
    dataSharing: false,
    analyticsTracking: true,
    
    // Appearance
    theme: 'light',
    fontSize: 'medium',
    compactMode: false,
    
    // Data & Privacy
    autoSave: true,
    dataRetention: '1year'
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleToggle = (key) => {
    setSettings({
      ...settings,
      [key]: !settings[key]
    });
    setHasChanges(true);
  };

  const handleSelect = (key, value) => {
    setSettings({
      ...settings,
      [key]: value
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    // TODO: Implement settings save API call
    console.log('Saving settings:', settings);
    setHasChanges(false);
  };

  const handleExportData = () => {
    // TODO: Implement data export
    console.log('Exporting user data...');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // TODO: Implement account deletion
      console.log('Deleting account...');
    }
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>
        <h1 className="page-title">Settings</h1>
        {hasChanges && (
          <Button className="save-button" onClick={handleSave}>
            <Check size={18} />
            Save Changes
          </Button>
        )}
      </div>

      <div className="settings-container">
        {/* Notifications Section */}
        <Card className="settings-card">
          <CardHeader>
            <div className="card-header-content">
              <Bell size={24} className="section-icon" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <p className="section-description">
                  Manage how you receive updates and reminders
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <Mail size={18} />
                  <div>
                    <div className="setting-label">Email Notifications</div>
                    <div className="setting-hint">Receive important updates via email</div>
                  </div>
                </div>
                <button
                  className={`toggle ${settings.emailNotifications ? 'active' : ''}`}
                  onClick={() => handleToggle('emailNotifications')}
                >
                  <div className="toggle-thumb"></div>
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <Globe size={18} />
                  <div>
                    <div className="setting-label">Weekly Digest</div>
                    <div className="setting-hint">Weekly summary of your progress</div>
                  </div>
                </div>
                <button
                  className={`toggle ${settings.weeklyDigest ? 'active' : ''}`}
                  onClick={() => handleToggle('weeklyDigest')}
                >
                  <div className="toggle-thumb"></div>
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <Bell size={18} />
                  <div>
                    <div className="setting-label">Achievement Alerts</div>
                    <div className="setting-hint">Get notified when you unlock achievements</div>
                  </div>
                </div>
                <button
                  className={`toggle ${settings.achievementAlerts ? 'active' : ''}`}
                  onClick={() => handleToggle('achievementAlerts')}
                >
                  <div className="toggle-thumb"></div>
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <Bell size={18} />
                  <div>
                    <div className="setting-label">Journal Reminders</div>
                    <div className="setting-hint">Daily reminders to journal</div>
                  </div>
                </div>
                <button
                  className={`toggle ${settings.reminderNotifications ? 'active' : ''}`}
                  onClick={() => handleToggle('reminderNotifications')}
                >
                  <div className="toggle-thumb"></div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Section */}
        <Card className="settings-card">
          <CardHeader>
            <div className="card-header-content">
              <Lock size={24} className="section-icon" />
              <div>
                <CardTitle>Privacy & Security</CardTitle>
                <p className="section-description">
                  Control your data and privacy preferences
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <Eye size={18} />
                  <div>
                    <div className="setting-label">Profile Visibility</div>
                    <div className="setting-hint">Who can see your profile</div>
                  </div>
                </div>
                <select
                  className="setting-select"
                  value={settings.profileVisibility}
                  onChange={(e) => handleSelect('profileVisibility', e.target.value)}
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends Only</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <Shield size={18} />
                  <div>
                    <div className="setting-label">Data Sharing</div>
                    <div className="setting-hint">Share anonymized data for research</div>
                  </div>
                </div>
                <button
                  className={`toggle ${settings.dataSharing ? 'active' : ''}`}
                  onClick={() => handleToggle('dataSharing')}
                >
                  <div className="toggle-thumb"></div>
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <Globe size={18} />
                  <div>
                    <div className="setting-label">Analytics Tracking</div>
                    <div className="setting-hint">Help us improve with usage data</div>
                  </div>
                </div>
                <button
                  className={`toggle ${settings.analyticsTracking ? 'active' : ''}`}
                  onClick={() => handleToggle('analyticsTracking')}
                >
                  <div className="toggle-thumb"></div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card className="settings-card">
          <CardHeader>
            <div className="card-header-content">
              <Palette size={24} className="section-icon" />
              <div>
                <CardTitle>Appearance</CardTitle>
                <p className="section-description">
                  Customize how TheraAI looks and feels
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <Moon size={18} />
                  <div>
                    <div className="setting-label">Theme</div>
                    <div className="setting-hint">Choose your preferred theme</div>
                  </div>
                </div>
                <div className="theme-buttons">
                  <button
                    className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
                    onClick={() => handleSelect('theme', 'light')}
                  >
                    <Sun size={16} />
                    Light
                  </button>
                  <button
                    className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                    onClick={() => handleSelect('theme', 'dark')}
                  >
                    <Moon size={16} />
                    Dark
                  </button>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <Palette size={18} />
                  <div>
                    <div className="setting-label">Font Size</div>
                    <div className="setting-hint">Adjust text size for readability</div>
                  </div>
                </div>
                <select
                  className="setting-select"
                  value={settings.fontSize}
                  onChange={(e) => handleSelect('fontSize', e.target.value)}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">Extra Large</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <Palette size={18} />
                  <div>
                    <div className="setting-label">Compact Mode</div>
                    <div className="setting-hint">Reduce spacing for more content</div>
                  </div>
                </div>
                <button
                  className={`toggle ${settings.compactMode ? 'active' : ''}`}
                  onClick={() => handleToggle('compactMode')}
                >
                  <div className="toggle-thumb"></div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy Section */}
        <Card className="settings-card">
          <CardHeader>
            <div className="card-header-content">
              <Download size={24} className="section-icon" />
              <div>
                <CardTitle>Data & Privacy</CardTitle>
                <p className="section-description">
                  Manage your data and account information
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <Download size={18} />
                  <div>
                    <div className="setting-label">Auto-Save</div>
                    <div className="setting-hint">Automatically save journal entries</div>
                  </div>
                </div>
                <button
                  className={`toggle ${settings.autoSave ? 'active' : ''}`}
                  onClick={() => handleToggle('autoSave')}
                >
                  <div className="toggle-thumb"></div>
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <Lock size={18} />
                  <div>
                    <div className="setting-label">Data Retention</div>
                    <div className="setting-hint">How long to keep your data</div>
                  </div>
                </div>
                <select
                  className="setting-select"
                  value={settings.dataRetention}
                  onChange={(e) => handleSelect('dataRetention', e.target.value)}
                >
                  <option value="3months">3 Months</option>
                  <option value="6months">6 Months</option>
                  <option value="1year">1 Year</option>
                  <option value="forever">Forever</option>
                </select>
              </div>
            </div>

            <div className="action-buttons">
              <Button
                variant="outline"
                className="action-btn"
                onClick={handleExportData}
              >
                <Download size={18} />
                Export My Data
              </Button>
              <Button
                variant="outline"
                className="action-btn danger"
                onClick={handleDeleteAccount}
              >
                <Trash2 size={18} />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Settings;
