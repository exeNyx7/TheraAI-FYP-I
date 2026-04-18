import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Modal } from '../../components/ui/modal';
import {
  TrendingUp, Calendar, Heart, BarChart3, Sparkles,
  Smile, Frown, CloudRain, Angry, Zap, Wind, Meh,
  Loader2, AlertCircle, ArrowLeft, Trophy, Target, Plus
} from 'lucide-react';
import { moodService } from '../../services/moodService';
import { useToast } from '../../contexts/ToastContext';
import { BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const MOOD_CONFIG = {
  happy: { 
    icon: Smile, 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-50',
    chartColor: '#eab308',
    label: 'Happy',
    emoji: '😊'
  },
  sad: { 
    icon: Frown, 
    color: 'text-blue-500', 
    bg: 'bg-blue-50',
    chartColor: '#3b82f6',
    label: 'Sad',
    emoji: '😢'
  },
  anxious: { 
    icon: CloudRain, 
    color: 'text-purple-500', 
    bg: 'bg-purple-50',
    chartColor: '#a855f7',
    label: 'Anxious',
    emoji: '😰'
  },
  angry: { 
    icon: Angry, 
    color: 'text-red-500', 
    bg: 'bg-red-50',
    chartColor: '#ef4444',
    label: 'Angry',
    emoji: '😠'
  },
  calm: { 
    icon: Heart, 
    color: 'text-green-500', 
    bg: 'bg-green-50',
    chartColor: '#22c55e',
    label: 'Calm',
    emoji: '😌'
  },
  excited: { 
    icon: Zap, 
    color: 'text-orange-500', 
    bg: 'bg-orange-50',
    chartColor: '#f97316',
    label: 'Excited',
    emoji: '🤩'
  },
  stressed: { 
    icon: Wind, 
    color: 'text-gray-600', 
    bg: 'bg-gray-50',
    chartColor: '#6b7280',
    label: 'Stressed',
    emoji: '😫'
  },
  neutral: { 
    icon: Meh, 
    color: 'text-gray-400', 
    bg: 'bg-gray-50',
    chartColor: '#9ca3af',
    label: 'Neutral',
    emoji: '😐'
  },
};

export default function MoodTrackerV0() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchStatistics();
  }, [user, navigate]);

  const fetchStatistics = async () => {
    try {
      setIsLoading(true);
      const data = await moodService.getMoodStats('7d');
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch mood statistics:', err);
      setError('Failed to load mood statistics');
      showError('Failed to load mood statistics');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex">
        <SidebarNav />
        <main className="flex-1 sidebar-content">
          <div className="bg-background min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Card className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={fetchStatistics} className="mt-4">
                  Try Again
                </Button>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const moodCounts = stats?.mood_counts || {};
  const moodPercentages = stats?.mood_percentages || {};
  const totalEntries = stats?.total_entries || 0;
  const mostCommonMood = stats?.most_common_mood || 'neutral';
  const recentMoods = stats?.recent_moods || [];
  const recentMood = recentMoods.length > 0 ? recentMoods[0].mood : 'neutral';

  // Calculate streak (consecutive days with entries)
  const calculateStreak = () => {
    if (recentMoods.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < recentMoods.length; i++) {
      const moodDate = new Date(recentMoods[i].timestamp);
      moodDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today - moodDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Calculate average sentiment (positive moods vs negative moods)
  const calculateSentiment = () => {
    if (totalEntries === 0) return 0;
    
    const positiveMoods = ['happy', 'calm', 'excited'];
    const negativeMoods = ['sad', 'anxious', 'angry', 'stressed'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    Object.entries(moodCounts).forEach(([mood, count]) => {
      if (positiveMoods.includes(mood)) {
        positiveCount += count;
      } else if (negativeMoods.includes(mood)) {
        negativeCount += count;
      }
    });
    
    // Score from -1 (all negative) to +1 (all positive)
    const sentiment = (positiveCount - negativeCount) / totalEntries;
    // Convert to 0-10 scale
    return ((sentiment + 1) * 5).toFixed(1);
  };

  const streak = calculateStreak();
  const avgSentiment = calculateSentiment();

  const recentMoodConfig = MOOD_CONFIG[recentMood.toLowerCase()] || MOOD_CONFIG.neutral;
  const RecentIcon = recentMoodConfig.icon;

  // Prepare Pie chart data
  const moodChartData = Object.entries(moodCounts).map(([mood, count]) => ({
    name: MOOD_CONFIG[mood.toLowerCase()]?.label || mood,
    value: count,
    color: MOOD_CONFIG[mood.toLowerCase()]?.chartColor || '#9ca3af'
  }));

  // Prepare Radar chart data for mood analysis
  const radarData = Object.keys(MOOD_CONFIG).map(mood => ({
    mood: MOOD_CONFIG[mood].label,
    value: moodPercentages[mood] || 0,
    fullMark: 100
  }));

  const handleMoodLog = async (mood) => {
    try {
      setSelectedMood(mood);
      
      // Save mood directly to backend
      await moodService.logMood({
        mood,
        timestamp: new Date().toISOString(),
      });
      
      setShowMoodModal(false);
      showSuccess(`Mood logged successfully! ${MOOD_CONFIG[mood]?.emoji}`);
      
      // Refresh statistics to show the new mood entry
      await fetchStatistics();
    } catch (error) {
      console.error('Error logging mood:', error);
      showError('Failed to log mood. Please try again.');
    }
  };

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 sidebar-content">
        <div className="bg-background min-h-screen">
          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </div>
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                  Mood Tracker
                </h1>
                <p className="text-muted-foreground mt-2">
                  Track your emotional journey and patterns
                </p>
              </div>
              <div>
                <Button 
                  onClick={() => setShowMoodModal(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  How are you feeling today?
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Entries</p>
                    <p className="text-2xl font-bold mt-1">{totalEntries}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Streak</p>
                    <p className="text-2xl font-bold mt-1">{streak} {streak === 1 ? 'day' : 'days'}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Sentiment</p>
                    <p className="text-2xl font-bold mt-1">{avgSentiment}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Recent Mood</p>
                    <p className="text-2xl font-bold mt-1">{recentMoodConfig.emoji}</p>
                  </div>
                  <div className={`w-12 h-12 ${recentMoodConfig.bg} rounded-full flex items-center justify-center`}>
                    <RecentIcon className={`h-6 w-6 ${recentMoodConfig.color}`} />
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <Card>
                <div className="p-6 border-b border-border">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Mood Overview
                  </h3>
                </div>
                <div className="p-6">
                  {moodChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={moodChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {moodChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Heart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Start tracking to see your mood overview</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Radar Chart - Mood Analysis */}
              <Card>
                <div className="p-6 border-b border-border">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Mood Analysis
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your emotional pattern distribution
                  </p>
                </div>
                <div className="p-6">
                  {radarData.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis 
                          dataKey="mood" 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <PolarRadiusAxis 
                          angle={90} 
                          domain={[0, 100]}
                          tick={{ fill: '#9ca3af', fontSize: 10 }}
                        />
                        <Radar 
                          name="Mood Distribution" 
                          dataKey="value" 
                          stroke="#8b5cf6" 
                          fill="#8b5cf6" 
                          fillOpacity={0.6}
                        />
                        <RechartsTooltip 
                          formatter={(value) => `${value.toFixed(1)}%`}
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Start tracking to see your mood analysis</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Insights */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-purple-900 mb-2">Wellness Insight</h3>
                    <p className="text-purple-700 text-sm">
                      Keep up the great work! Tracking your moods helps you understand patterns and make positive changes in your life.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Mood Selection Modal */}
      <Modal
        open={showMoodModal}
        onOpenChange={setShowMoodModal}
        size="lg"
      >
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Montserrat' }}>
              How are you feeling today?
            </h2>
            <p className="text-muted-foreground">
              Select your current mood to create a diary entry
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(MOOD_CONFIG).map(([key, config]) => {
              return (
                <button
                  key={key}
                  onClick={() => handleMoodLog(key)}
                  className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg ${config.bg} border-transparent hover:border-current ${config.color}`}
                >
                  <span className="text-5xl mb-3">{config.emoji}</span>
                  <span className="font-semibold text-sm">{config.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowMoodModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
