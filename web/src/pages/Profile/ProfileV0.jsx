import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { User, Mail, Calendar, Shield, Check, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ProfileV0() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      setFormData({
        full_name: user.full_name || user.name || '',
        email: user.email || '',
      });
    }
  }, [user, navigate]);

  const handleSave = async () => {
    if (!formData.full_name.trim() || !formData.email.trim()) {
      showError('Please fill in all fields');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('theraai_auth_token');
      
      if (!token) {
        showError('Authentication required. Please log in again.');
        navigate('/login');
        return;
      }

      const response = await axios.patch(
        `${API_URL}/api/v1/users/me`,
        {
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Update user in auth context
      if (updateUser) {
        updateUser(response.data);
      }
      showSuccess('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      if (error.response?.status === 401) {
        showError('Session expired. Please log in again.');
        navigate('/login');
      } else {
        showError(error.response?.data?.detail || 'Failed to update profile');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const formatMemberSince = () => {
    if (user?.created_at) {
      const date = new Date(user.created_at);
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
    }
    return 'Recently';
  };

  if (!user || user.role !== 'patient') {
    return null;
  }

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 sidebar-content">
        <div className="bg-background min-h-screen">
          <div className="max-w-2xl mx-auto p-6 md:p-8 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                Profile
              </h1>
              <p className="text-muted-foreground mt-2">Manage your account information</p>
            </div>

            {/* Profile info card */}
            <Card>
              <div className="p-6 border-b border-border flex flex-row items-center justify-between">
                <h3 className="text-xl font-semibold">Personal Information</h3>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(!isEditing)} 
                  className="bg-transparent"
                  disabled={isSaving}
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </div>
              <div className="p-6 space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                    <User className="h-10 w-10 text-primary-foreground" />
                  </div>
                  {isEditing && (
                    <Button variant="outline" className="bg-transparent" disabled>
                      Change Avatar
                    </Button>
                  )}
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Full Name
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="text-lg"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-lg">{formData.full_name}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Address
                  </label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="text-lg"
                      placeholder="Enter your email"
                    />
                  ) : (
                    <p className="text-lg">{formData.email}</p>
                  )}
                </div>

                {/* Member since */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Member Since
                  </label>
                  <p className="text-lg text-muted-foreground">{formatMemberSince()}</p>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Account Type
                  </label>
                  <p className="text-lg text-muted-foreground capitalize">{user.role}</p>
                </div>

                {isEditing && (
                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          full_name: user.full_name || user.name || '',
                          email: user.email || '',
                        });
                      }}
                      className="flex-1 bg-transparent"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 bg-primary hover:bg-primary/90 gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Account security */}
            <Card>
              <div className="p-6 border-b border-border">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Manage your account security</p>
              </div>
              <div className="p-6 space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-transparent"
                  disabled
                >
                  Change Password
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-transparent"
                  disabled
                >
                  Two-Factor Authentication
                </Button>
                <p className="text-xs text-muted-foreground">
                  Security features coming soon
                </p>
              </div>
            </Card>

            {/* Account Stats */}
            <Card>
              <div className="p-6 border-b border-border">
                <h3 className="text-xl font-semibold">Account Activity</h3>
                <p className="text-sm text-muted-foreground mt-1">Your platform usage statistics</p>
              </div>
              <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <p className="text-2xl font-bold text-primary">Active</p>
                  <p className="text-sm text-muted-foreground mt-1">Account Status</p>
                </div>
                <div className="text-center p-4 bg-blue-500/5 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{user.email_verified ? 'Verified' : 'Pending'}</p>
                  <p className="text-sm text-muted-foreground mt-1">Email Status</p>
                </div>
                <div className="text-center p-4 bg-emerald-500/5 rounded-lg col-span-2 md:col-span-1">
                  <p className="text-2xl font-bold text-emerald-600">{user.is_active ? 'Enabled' : 'Disabled'}</p>
                  <p className="text-sm text-muted-foreground mt-1">Account Access</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
