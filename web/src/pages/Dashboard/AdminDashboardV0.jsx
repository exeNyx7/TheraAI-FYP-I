import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Users, Activity, Server, Database, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Shield, Settings, BarChart3, UserPlus
} from 'lucide-react';

export default function AdminDashboardV0() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [systemStats, setSystemStats] = useState({});
  const [recentUsers, setRecentUsers] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchAdminData();
  }, [user, navigate]);

  const fetchAdminData = async () => {
    try {
      // TODO: Replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 800));

      setSystemStats({
        totalUsers: 1247,
        activePatients: 892,
        activePsychiatrists: 34,
        totalSessions: 5623,
        monthlyGrowth: 12.5,
        systemUptime: '99.9%',
        avgResponseTime: '120ms',
        storageUsed: 68
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

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      setLoading(false);
    }
  };

  const getAlertVariant = (type) => {
    switch (type) {
      case 'warning': return 'warning';
      case 'error': return 'destructive';
      case 'success': return 'success';
      case 'info': return 'default';
      default: return 'default';
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin': return 'default';
      case 'psychiatrist': return 'info';
      case 'patient': return 'success';
      default: return 'default';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'inactive': return 'destructive';
      default: return 'default';
    }
  };

  if (!user) return null;

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 sidebar-content">
        <div className="bg-background min-h-screen">
          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                System overview and management
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold mt-1">{systemStats.totalUsers}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Patients</p>
                    <p className="text-2xl font-bold mt-1">{systemStats.activePatients}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Psychiatrists</p>
                    <p className="text-2xl font-bold mt-1">{systemStats.activePsychiatrists}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Growth</p>
                    <p className="text-2xl font-bold mt-1">+{systemStats.monthlyGrowth}%</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* System Health */}
              <Card className="lg:col-span-2">
                <div className="p-6 border-b border-border">
                  <h3 className="text-xl font-semibold">System Health</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">System Uptime</span>
                      <span className="font-semibold">{systemStats.systemUptime}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Avg Response Time</span>
                      <span className="font-semibold">{systemStats.avgResponseTime}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Storage Used</span>
                      <span className="font-semibold">{systemStats.storageUsed}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all" 
                        style={{ width: `${systemStats.storageUsed}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h4 className="font-semibold mb-4">System Alerts</h4>
                    <div className="space-y-3">
                      {systemAlerts.map((alert) => (
                        <div key={alert.id} className="flex items-start gap-3 p-4 rounded-lg border border-border">
                          <div className="mt-0.5">
                            {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                            {alert.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                            {alert.type === 'info' && <Clock className="h-5 w-5 text-blue-500" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <p className="font-semibold text-sm">{alert.title}</p>
                              <Badge variant={getAlertVariant(alert.type)} className="text-xs">
                                {alert.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">{alert.timestamp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <Card>
                <div className="p-6 border-b border-border">
                  <h3 className="text-xl font-semibold">Quick Actions</h3>
                </div>
                <div className="p-6 space-y-3">
                  <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/users')}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Server className="h-4 w-4 mr-2" />
                    Server Status
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Database Backup
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Security Logs
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    System Settings
                  </Button>
                </div>
              </Card>
            </div>

            {/* Recent Users */}
            <Card>
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Recent Users</h3>
                  <Button variant="outline" size="sm">View All</Button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {user.status}
                        </Badge>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {user.joinDate}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
