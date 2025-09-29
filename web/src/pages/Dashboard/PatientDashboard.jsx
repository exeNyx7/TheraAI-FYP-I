/**
 * Patient Dashboard Component
 * Modern, dynamic dashboard for patient wellness journey
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Progress, 
  Badge, 
  UserAvatar, 
  Alert, 
  AlertTitle, 
  AlertDescription,
  Tooltip,
  Separator 
} from '../../components/ui';
import { 
  Heart, 
  Calendar, 
  MessageCircle, 
  TrendingUp, 
  Clock, 
  Star,
  Target,
  Smile,
  Brain,
  BookOpen,
  Video,
  Award,
  Activity,
  Users,
  Zap,
  Sun,
  Moon,
  Coffee,
  Bell,
  CheckCircle
} from 'lucide-react';

function PatientDashboard() {
  const { user } = useAuth();
  const [selectedMood, setSelectedMood] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dailyGoals, setDailyGoals] = useState({
    meditation: false,
    exercise: false,
    journaling: false,
    social: false
  });

  // Dynamic greeting based on time
  const getTimeGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { text: 'Good morning', icon: Sun };
    if (hour < 17) return { text: 'Good afternoon', icon: Coffee };
    return { text: 'Good evening', icon: Moon };
  };

  // Update time every minute for dynamic greeting
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Mock dynamic data
  const wellnessScore = 8.4;
  const streakDays = 12;
  const upcomingSession = {
    therapist: 'Dr. Sarah Mitchell',
    time: 'Today at 3:00 PM',
    type: 'Cognitive Behavioral Therapy',
    duration: '50 minutes'
  };

  const moodOptions = [
    { emoji: '😔', label: 'Struggling', value: 1, color: 'text-red-500' },
    { emoji: '😐', label: 'Okay', value: 2, color: 'text-orange-500' },
    { emoji: '🙂', label: 'Good', value: 3, color: 'text-yellow-500' },
    { emoji: '😊', label: 'Great', value: 4, color: 'text-green-500' },
    { emoji: '😄', label: 'Amazing', value: 5, color: 'text-blue-500' }
  ];

  const recentAchievements = [
    { icon: Award, title: '7-Day Streak!', description: 'Consistent daily check-ins' },
    { icon: Target, title: 'Goal Crusher', description: 'Completed weekly wellness goals' },
    { icon: Star, title: 'Mindful Moment', description: '30 minutes of meditation' }
  ];

  const quickActions = [
    { icon: MessageCircle, label: 'Chat with AI', color: 'bg-blue-500 hover:bg-blue-600' },
    { icon: Video, label: 'Quick Session', color: 'bg-green-500 hover:bg-green-600' },
    { icon: BookOpen, label: 'Learn & Grow', color: 'bg-purple-500 hover:bg-purple-600' },
    { icon: Users, label: 'Community', color: 'bg-pink-500 hover:bg-pink-600' }
  ];

  const toggleGoal = (goal) => {
    setDailyGoals(prev => ({ ...prev, [goal]: !prev[goal] }));
  };

  const greeting = getTimeGreeting();
  const GreetingIcon = greeting.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Dynamic Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <GreetingIcon className="w-8 h-8 text-yellow-200" />
                <h1 className="text-3xl font-bold">{greeting.text}, {user?.full_name?.split(' ')[0] || 'Friend'}! 🌟</h1>
              </div>
              <p className="text-blue-100 text-lg">
                Ready to continue your wellness journey? You're doing amazing! 💪
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-1">{wellnessScore}</div>
              <div className="text-blue-100">Wellness Score</div>
              <div className="flex items-center gap-1 mt-2">
                <Zap className="w-4 h-4 text-yellow-300" />
                <span className="text-sm">{streakDays}-day streak!</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Next Session Card */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-green-800">
                  <Calendar className="w-6 h-6" />
                  Your Next Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <UserAvatar 
                        src="/api/placeholder/therapist-avatar" 
                        fallback="SM"
                        alt="Dr. Sarah Mitchell"
                        size="lg"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">{upcomingSession.therapist}</h3>
                        <p className="text-gray-600">{upcomingSession.type}</p>
                        <Badge variant="success" className="mt-1">Licensed Therapist</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {upcomingSession.time}
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="w-4 h-4" />
                        {upcomingSession.duration}
                      </div>
                    </div>
                  </div>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <Video className="w-4 h-4 mr-2" />
                    Join Session
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mood Check-in */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Brain className="w-6 h-6 text-purple-600" />
                  How are you feeling right now?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-3 mb-6">
                  {moodOptions.map((mood) => (
                    <button
                      key={mood.value}
                      onClick={() => setSelectedMood(mood.value)}
                      className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                        selectedMood === mood.value 
                          ? 'border-blue-500 bg-blue-50 shadow-lg' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-3xl mb-2">{mood.emoji}</span>
                      <span className={`text-sm font-medium ${mood.color}`}>{mood.label}</span>
                    </button>
                  ))}
                </div>
                {selectedMood && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-blue-800 mb-3">
                      Thanks for sharing! Would you like to add a note about your mood today?
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" size="sm">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Add Note
                      </Button>
                      <Button size="sm">
                        Save Mood
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-orange-600" />
                  Today's Wellness Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'meditation', label: 'Meditation', icon: Brain, bgColor: 'bg-purple-500', borderColor: 'border-purple-500', bgLight: 'bg-purple-50' },
                    { key: 'exercise', label: 'Exercise', icon: Activity, bgColor: 'bg-green-500', borderColor: 'border-green-500', bgLight: 'bg-green-50' },
                    { key: 'journaling', label: 'Journaling', icon: BookOpen, bgColor: 'bg-blue-500', borderColor: 'border-blue-500', bgLight: 'bg-blue-50' },
                    { key: 'social', label: 'Social Time', icon: Users, bgColor: 'bg-pink-500', borderColor: 'border-pink-500', bgLight: 'bg-pink-50' }
                  ].map((goal) => {
                    const IconComponent = goal.icon;
                    const completed = dailyGoals[goal.key];
                    return (
                      <button
                        key={goal.key}
                        onClick={() => toggleGoal(goal.key)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                          completed
                            ? `${goal.borderColor} ${goal.bgLight} shadow-md`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                          completed ? goal.bgColor : 'bg-gray-200'
                        }`}>
                          <IconComponent className={`w-4 h-4 ${completed ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <div className="text-sm font-medium text-gray-900">{goal.label}</div>
                        {completed && <div className="text-xs text-green-600 mt-1 font-semibold">✓ Complete!</div>}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-yellow-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action, index) => {
                    const IconComponent = action.icon;
                    return (
                      <Button
                        key={index}
                        variant="outline"
                        className={`h-auto p-4 flex flex-col gap-2 ${action.color} text-white border-0 hover:scale-105 transition-transform duration-200`}
                      >
                        <IconComponent className="w-6 h-6" />
                        <span className="text-sm font-medium">{action.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-yellow-500" />
                  Recent Wins! 🎉
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAchievements.map((achievement, index) => {
                    const IconComponent = achievement.icon;
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{achievement.title}</div>
                          <div className="text-sm text-gray-600">{achievement.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Wellness Insight with Reusable Components Showcase */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-purple-800">
                  <Smile className="w-6 h-6" />
                  Today's Insight
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <p className="text-purple-800 font-medium">
                    "Progress, not perfection" 💫
                  </p>
                  <p className="text-purple-700 text-sm">
                    Remember, every small step counts in your wellness journey. 
                    You're building habits that will serve you for life!
                  </p>
                </div>

                {/* Progress Bar Example */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-purple-700">Weekly Goal Progress</span>
                    <Badge variant="success">On Track</Badge>
                  </div>
                  <Progress value={75} color="purple" showPercentage />
                </div>

                <Separator />

                {/* Alert Example */}
                <Alert variant="info">
                  <Bell className="h-4 w-4" />
                  <AlertTitle>Reminder</AlertTitle>
                  <AlertDescription>
                    Your next mindfulness session is in 30 minutes.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Tooltip content="Track your daily progress and achievements">
                    <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-100">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View Progress
                    </Button>
                  </Tooltip>
                  
                  <Button variant="gradient" size="sm">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientDashboard;