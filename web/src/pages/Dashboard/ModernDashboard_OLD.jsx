/**
 * Modern Dashboard Component with shadcn/ui
 * Professional dashboard with role-based content and modern design
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  Users, 
  Heart, 
  BookOpen, 
  Settings, 
  Bell,
  Plus,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

function ModernDashboard() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const getUserGreeting = () => {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    if (hour >= 17) greeting = 'Good evening';
    
    return `${greeting}, ${user?.full_name?.split(' ')[0] || 'User'}!`;
  };

  const renderPatientDashboard = () => (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-indigo-50 to-indigo-100"
          onClick={() => window.location.href = '/journal'}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-600 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Journal</h3>
                <p className="text-sm text-gray-600">Write your thoughts with AI insights</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100"
          onClick={() => window.location.href = '/mood-tracker'}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-600 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Mood Tracker</h3>
                <p className="text-sm text-gray-600">View your emotional patterns</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Book Session</h3>
                <p className="text-sm text-gray-600">Schedule therapy session</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-600 rounded-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Messages</h3>
                <p className="text-sm text-gray-600">Chat with therapist</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Overview */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span>Your Wellness Journey</span>
              </CardTitle>
              <CardDescription>
                Track your progress over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Mood Check-ins</h4>
                    <p className="text-sm text-gray-600">5 this week</p>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">+12%</div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Sessions Completed</h4>
                    <p className="text-sm text-gray-600">2 this month</p>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">8</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Wellness Score</h4>
                    <p className="text-sm text-gray-600">Based on recent activities</p>
                  </div>
                  <div className="text-2xl font-bold text-green-600">7.8</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Next Session</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-sm text-gray-600">Tomorrow at 2:00 PM</div>
                <div className="font-medium">Dr. Sarah Johnson</div>
                <Button className="w-full">Join Session</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-green-600" />
                <span>Resources</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  Breathing Exercises
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  Meditation Guide
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  Support Community
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderPsychiatristDashboard = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Patients</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold">4.9</p>
              </div>
              <Heart className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Cases</p>
                <p className="text-2xl font-bold">18</p>
              </div>
              <Activity className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Recent Patient Activity</CardTitle>
              <CardDescription>
                Latest updates from your patients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Heart className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Patient checked in</p>
                      <p className="text-sm text-gray-600">Mood: Good, Energy: High</p>
                    </div>
                    <span className="text-xs text-gray-500">2h ago</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['9:00 AM - John D.', '11:00 AM - Sarah M.', '2:00 PM - Mike R.', '4:00 PM - Lisa K.'].map((session, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium">{session}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold">89</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Health</p>
                <p className="text-2xl font-bold">98%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>
            Platform performance and user analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Admin dashboard content coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderDashboardContent = () => {
    switch (user?.role) {
      case 'patient':
        return renderPatientDashboard();
      case 'psychiatrist':
        return renderPsychiatristDashboard();
      case 'admin':
        return renderAdminDashboard();
      default:
        return (
          <Card className="border-0 shadow-md">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Error</h2>
              <p className="text-gray-600">Unable to load dashboard. Invalid user role.</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">TheraAI</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{getUserGreeting()}</h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'patient' && 'Your wellness journey continues here. Take it one step at a time.'}
            {user?.role === 'psychiatrist' && 'Ready to make a difference today. Your expertise matters.'}
            {user?.role === 'admin' && 'System overview and management at your fingertips.'}
          </p>
        </div>

        {/* Dashboard Content */}
        {renderDashboardContent()}
      </main>
    </div>
  );
}

export default ModernDashboard;