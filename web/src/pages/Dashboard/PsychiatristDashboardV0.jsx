import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Avatar } from '../../components/ui/avatar';
import {
  Users, Calendar, Clock, Star, Plus, FileText, MessageSquare,
  TrendingUp, AlertCircle, CheckCircle, Activity, Search, BarChart3
} from 'lucide-react';

export default function PsychiatristDashboardV0() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user || !['psychiatrist', 'admin'].includes(user.role)) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      // TODO: Replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 800));
      
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
          type: 'Follow-up',
          status: 'confirmed'
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  const getRiskBadgeVariant = (level) => {
    switch (level) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                Psychiatrist Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Welcome back, Dr. {user.full_name || user.name}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Patients</p>
                    <p className="text-2xl font-bold mt-1">{stats?.totalPatients || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Appointments Today</p>
                    <p className="text-2xl font-bold mt-1">{stats?.appointmentsToday || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Reviews</p>
                    <p className="text-2xl font-bold mt-1">{stats?.pendingReviews || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average Rating</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold">{stats?.averageRating || 0}</p>
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Today's Appointments */}
              <Card className="lg:col-span-2">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Today's Appointments</h3>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New
                    </Button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {todayAppointments.length > 0 ? (
                    todayAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <Avatar>{appointment.patientInitials}</Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{appointment.patientName}</p>
                          <p className="text-sm text-muted-foreground">{appointment.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{appointment.time}</p>
                          <p className="text-sm text-muted-foreground">{appointment.duration}</p>
                        </div>
                        <Badge variant="success">{appointment.status}</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No appointments scheduled for today</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Quick Actions */}
              <Card>
                <div className="p-6 border-b border-border">
                  <h3 className="text-xl font-semibold">Quick Actions</h3>
                </div>
                <div className="p-6 space-y-3">
                  <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/appointments')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    View Calendar
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/patients')}>
                    <Users className="h-4 w-4 mr-2" />
                    Patient List
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Messages
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Reports
                  </Button>
                </div>
              </Card>
            </div>

            {/* Patient List */}
            <Card>
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">My Patients</h3>
                  <Button variant="outline" size="sm">View All</Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {filteredPatients.map((patient) => (
                    <div key={patient.id} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                      <Avatar>{patient.initials}</Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{patient.name}</p>
                          <Badge variant={getRiskBadgeVariant(patient.riskLevel)} className="text-xs">
                            {patient.riskLevel} risk
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {patient.sessionsCount} sessions • Last: {patient.lastSession}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Next Session</p>
                        <p className="font-semibold">{patient.nextSession}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
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
