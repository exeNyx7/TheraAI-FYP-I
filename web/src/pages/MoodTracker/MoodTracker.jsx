/**
 * MoodTracker Page
 * Visualizes mood statistics and sentiment trends
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Calendar, Heart, BarChart3, Sparkles, 
  Smile, Frown, CloudRain, Angry, Zap, Wind, Meh,
  Loader2, AlertCircle
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert } from '../../components/ui/alert';
import { Progress } from '../../components/ui/progress';
import { getMoodStatistics } from '../../services/journalService';
import { useToast } from '../../contexts/ToastContext';
import './MoodTracker.css';

// Mood icon and color mapping
const MOOD_CONFIG = {
  happy: { icon: Smile, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Happy' },
  sad: { icon: Frown, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Sad' },
  anxious: { icon: CloudRain, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Anxious' },
  angry: { icon: Angry, color: 'text-red-500', bg: 'bg-red-50', label: 'Angry' },
  calm: { icon: Heart, color: 'text-green-500', bg: 'bg-green-50', label: 'Calm' },
  excited: { icon: Zap, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Excited' },
  stressed: { icon: Wind, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Stressed' },
  neutral: { icon: Meh, color: 'text-gray-400', bg: 'bg-gray-50', label: 'Neutral' },
};

// Trend badge variants
const TREND_CONFIG = {
  improving: { variant: 'success', text: '📈 Improving', description: 'Your recent sentiment is more positive' },
  declining: { variant: 'error', text: '📉 Declining', description: 'Your recent sentiment shows some challenges' },
  stable: { variant: 'default', text: '➡️ Stable', description: 'Your sentiment has been consistent' },
  insufficient_data: { variant: 'default', text: 'ℹ️ Insufficient Data', description: 'Write more entries for trend analysis' },
};

const MoodTracker = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMoodStatistics();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
      setError(err.message || 'Failed to load statistics');
      showToast('Failed to load mood statistics', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate percentage for mood counts
  const getMoodPercentage = (count) => {
    if (!stats || stats.total_entries === 0) return 0;
    return Math.round((count / stats.total_entries) * 100);
  };

  // Get sentiment color
  const getSentimentColor = (label) => {
    switch (label) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="mood-tracker-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-green-500 to-teal-500 p-3 rounded-xl shadow-md">
              <BarChart3 size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mood Tracker</h1>
              <p className="text-gray-600 mt-1">
                Visualize your emotional patterns and trends
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="tracker-content">
        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="p-6">
                <Skeleton variant="text" width="50%" height={24} className="mb-4" />
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="80%" />
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Alert variant="error" icon={AlertCircle}>
            {error}
          </Alert>
        )}

        {/* Empty State */}
        {!isLoading && !error && stats && stats.total_entries === 0 && (
          <div className="empty-state">
            <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl p-12 text-center border-2 border-dashed border-green-200">
              <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
                <BarChart3 size={40} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No Data Yet
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Start writing journal entries to track your mood patterns and see your emotional journey over time.
              </p>
            </div>
          </div>
        )}

        {/* Statistics Dashboard */}
        {!isLoading && !error && stats && stats.total_entries > 0 && (
          <div className="statistics-grid">
            {/* Overview Card */}
            <Card className="overview-card">
              <div className="card-header">
                <Calendar className="text-blue-500" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Overview</h2>
              </div>
              <div className="stats-list">
                <div className="stat-item">
                  <span className="stat-label">Total Entries</span>
                  <span className="stat-value">{stats.total_entries}</span>
                </div>
                {stats.most_common_mood && (
                  <div className="stat-item">
                    <span className="stat-label">Most Common Mood</span>
                    <div className="flex items-center space-x-2">
                      {React.createElement(MOOD_CONFIG[stats.most_common_mood]?.icon || Meh, {
                        size: 20,
                        className: MOOD_CONFIG[stats.most_common_mood]?.color || 'text-gray-500'
                      })}
                      <span className="stat-value capitalize">{stats.most_common_mood}</span>
                    </div>
                  </div>
                )}
                {stats.average_sentiment_score !== null && (
                  <div className="stat-item">
                    <span className="stat-label">Average Sentiment</span>
                    <span className="stat-value">
                      {(stats.average_sentiment_score * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Trend Card */}
            {stats.recent_trend && (
              <Card className="trend-card">
                <div className="card-header">
                  <TrendingUp className="text-purple-500" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">Recent Trend</h2>
                </div>
                <div className="trend-content">
                  <Badge 
                    variant={TREND_CONFIG[stats.recent_trend]?.variant || 'default'}
                    size="lg"
                    className="mb-3"
                  >
                    {TREND_CONFIG[stats.recent_trend]?.text || stats.recent_trend}
                  </Badge>
                  <p className="text-sm text-gray-600">
                    {TREND_CONFIG[stats.recent_trend]?.description || 'Keep tracking your emotions'}
                  </p>
                </div>
              </Card>
            )}

            {/* Mood Distribution Card */}
            <Card className="mood-distribution-card">
              <div className="card-header">
                <Heart className="text-pink-500" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Mood Distribution</h2>
              </div>
              <div className="mood-list">
                {Object.entries(stats.mood_counts || {}).length > 0 ? (
                  Object.entries(stats.mood_counts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([mood, count]) => {
                      const config = MOOD_CONFIG[mood] || MOOD_CONFIG.neutral;
                      const Icon = config.icon;
                      const percentage = getMoodPercentage(count);

                      return (
                        <div key={mood} className="mood-item">
                          <div className="mood-info">
                            <div className={`${config.bg} p-2 rounded-lg`}>
                              <Icon size={20} className={config.color} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium capitalize text-gray-900">{config.label}</span>
                                <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                              </div>
                              <Progress value={percentage} variant="default" size="sm" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-gray-500 text-sm">No mood data available</p>
                )}
              </div>
            </Card>

            {/* Sentiment Distribution Card */}
            <Card className="sentiment-card">
              <div className="card-header">
                <Sparkles className="text-indigo-500" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Sentiment Analysis</h2>
              </div>
              <div className="sentiment-list">
                {Object.entries(stats.sentiment_distribution || {}).length > 0 ? (
                  Object.entries(stats.sentiment_distribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([sentiment, count]) => {
                      const percentage = getMoodPercentage(count);
                      const colorClass = getSentimentColor(sentiment);

                      return (
                        <div key={sentiment} className="sentiment-item">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-medium capitalize ${colorClass}`}>
                              {sentiment}
                            </span>
                            <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                          </div>
                          <Progress 
                            value={percentage} 
                            variant={sentiment === 'positive' ? 'success' : sentiment === 'negative' ? 'error' : 'default'} 
                            size="sm" 
                          />
                        </div>
                      );
                    })
                ) : (
                  <p className="text-gray-500 text-sm">No sentiment data available</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodTracker;
