/**
 * MoodTracker Page - Modern Redesign
 * Gamified mood tracking with consistent dashboard theme
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Calendar, Heart, BarChart3, Sparkles, 
  Smile, Frown, CloudRain, Angry, Zap, Wind, Meh,
  Loader2, AlertCircle, ArrowLeft, Trophy, Target,
  Activity, Award, LineChart
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert } from '../../components/ui/alert';
import { Progress } from '../../components/ui/progress';
import { Button } from '../../components/ui/button';
import { getMoodStatistics } from '../../services/journalService';
import { useToast } from '../../contexts/ToastContext';
import './MoodTracker_NEW.css';

// Mood icon and color mapping with gradients
const MOOD_CONFIG = {
  happy: { 
    icon: Smile, 
    gradient: 'from-yellow-400 to-orange-400', 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-50', 
    label: 'Happy',
    emoji: '😊'
  },
  sad: { 
    icon: Frown, 
    gradient: 'from-blue-400 to-indigo-400', 
    color: 'text-blue-500', 
    bg: 'bg-blue-50', 
    label: 'Sad',
    emoji: '😢'
  },
  anxious: { 
    icon: CloudRain, 
    gradient: 'from-purple-400 to-pink-400', 
    color: 'text-purple-500', 
    bg: 'bg-purple-50', 
    label: 'Anxious',
    emoji: '😰'
  },
  angry: { 
    icon: Angry, 
    gradient: 'from-red-400 to-rose-400', 
    color: 'text-red-500', 
    bg: 'bg-red-50', 
    label: 'Angry',
    emoji: '😠'
  },
  calm: { 
    icon: Heart, 
    gradient: 'from-green-400 to-teal-400', 
    color: 'text-green-500', 
    bg: 'bg-green-50', 
    label: 'Calm',
    emoji: '😌'
  },
  excited: { 
    icon: Zap, 
    gradient: 'from-orange-400 to-amber-400', 
    color: 'text-orange-500', 
    bg: 'bg-orange-50', 
    label: 'Excited',
    emoji: '🤩'
  },
  stressed: { 
    icon: Wind, 
    gradient: 'from-gray-400 to-slate-400', 
    color: 'text-gray-600', 
    bg: 'bg-gray-50', 
    label: 'Stressed',
    emoji: '😫'
  },
  neutral: { 
    icon: Meh, 
    gradient: 'from-gray-300 to-gray-400', 
    color: 'text-gray-400', 
    bg: 'bg-gray-50', 
    label: 'Neutral',
    emoji: '😐'
  },
};

const MoodTracker = () => {
  const navigate = useNavigate();
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

  // Get trend info
  const getTrendInfo = () => {
    if (!stats?.recent_trend) return null;
    
    const trends = {
      improving: { 
        icon: TrendingUp, 
        gradient: 'from-green-500 to-emerald-500',
        text: 'Improving Trend',
        description: 'Your mood has been getting better! Keep it up! 🌟'
      },
      declining: { 
        icon: TrendingUp, 
        gradient: 'from-red-500 to-rose-500',
        text: 'Needs Attention',
        description: 'Your mood shows some challenges. Consider talking to someone. 💜'
      },
      stable: { 
        icon: Activity, 
        gradient: 'from-blue-500 to-cyan-500',
        text: 'Stable Pattern',
        description: 'Your mood has been consistent. Great awareness! 👍'
      },
      insufficient_data: { 
        icon: BarChart3, 
        gradient: 'from-gray-400 to-gray-500',
        text: 'More Data Needed',
        description: 'Write more entries to see your mood trends 📝'
      },
    };
    
    return trends[stats.recent_trend] || trends.insufficient_data;
  };

  return (
    <div className="mood-tracker-modern">
      {/* Hero Section */}
      <div className="mood-hero">
        <div className="hero-background">
          <div className="gradient-overlay"></div>
        </div>
        
        <div className="hero-content">
          <Button 
            variant="ghost" 
            className="back-button"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </Button>

          <div className="hero-text">
            <div className="icon-wrapper">
              <Heart size={48} className="text-white" />
            </div>
            <h1>Mood Insights</h1>
            <p>Track your emotional journey and discover patterns</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mood-content">
        {/* Loading State */}
        {isLoading && (
          <div className="loading-grid">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="stat-card">
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="100%" height={80} />
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Alert variant="error" icon={AlertCircle} className="error-alert">
            <div className="error-content">
              <strong>Oops!</strong>
              <p>{error}</p>
              <Button onClick={fetchStatistics} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </Alert>
        )}

        {/* Empty State */}
        {!isLoading && !error && stats && stats.total_entries === 0 && (
          <div className="empty-state">
            <div className="empty-card">
              <div className="empty-icon">
                <BarChart3 size={64} />
              </div>
              <h2>Start Your Mood Journey</h2>
              <p>Write your first diary entry to begin tracking your emotional patterns and insights.</p>
              <Button 
                onClick={() => navigate('/journal')}
                className="cta-button"
                size="lg"
              >
                <Sparkles size={20} />
                Write First Entry
              </Button>
            </div>
          </div>
        )}

        {/* Statistics Dashboard */}
        {!isLoading && !error && stats && stats.total_entries > 0 && (
          <>
            {/* Quick Stats Bar */}
            <div className="quick-stats">
              <Card className="quick-stat-card">
                <div className="stat-icon-wrapper gradient-purple">
                  <Calendar size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{stats.total_entries}</span>
                  <span className="stat-label">Total Entries</span>
                </div>
              </Card>

              <Card className="quick-stat-card">
                <div className="stat-icon-wrapper gradient-green">
                  <Trophy size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value capitalize">
                    {stats.most_common_mood || 'N/A'}
                  </span>
                  <span className="stat-label">Common Mood</span>
                </div>
              </Card>

              <Card className="quick-stat-card">
                <div className="stat-icon-wrapper gradient-blue">
                  <Target size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">
                    {stats.average_sentiment_score !== null 
                      ? `${(stats.average_sentiment_score * 100).toFixed(0)}%`
                      : 'N/A'
                    }
                  </span>
                  <span className="stat-label">Avg Sentiment</span>
                </div>
              </Card>

              <Card className="quick-stat-card">
                <div className="stat-icon-wrapper gradient-orange">
                  <Activity size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">
                    {getTrendInfo()?.text.split(' ')[0] || 'N/A'}
                  </span>
                  <span className="stat-label">Mood Trend</span>
                </div>
              </Card>
            </div>

            {/* Main Grid */}
            <div className="mood-grid">
              {/* Mood Distribution Card */}
              <Card className="mood-distribution-card">
                <div className="card-header">
                  <div className="header-icon gradient-pink">
                    <Heart size={24} />
                  </div>
                  <div>
                    <h2>Mood Distribution</h2>
                    <p>How you've been feeling</p>
                  </div>
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
                            <div className="mood-icon-wrapper">
                              <div className={`mood-icon bg-gradient-to-br ${config.gradient}`}>
                                <Icon size={20} className="text-white" />
                              </div>
                            </div>
                            <div className="mood-details">
                              <div className="mood-header">
                                <span className="mood-name">
                                  {config.emoji} {config.label}
                                </span>
                                <span className="mood-count">
                                  {count} times ({percentage}%)
                                </span>
                              </div>
                              <Progress 
                                value={percentage} 
                                variant="default" 
                                size="sm"
                                className="mood-progress"
                              />
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <p className="no-data">No mood data available</p>
                  )}
                </div>
              </Card>

              {/* Trend Analysis Card */}
              {getTrendInfo() && (
                <Card className="trend-card">
                  <div className="card-header">
                    <div className={`header-icon bg-gradient-to-br ${getTrendInfo().gradient}`}>
                      {React.createElement(getTrendInfo().icon, { size: 24 })}
                    </div>
                    <div>
                      <h2>Trend Analysis</h2>
                      <p>Your recent patterns</p>
                    </div>
                  </div>

                  <div className="trend-content">
                    <div className="trend-badge">
                      <Badge variant="default" size="lg">
                        {getTrendInfo().text}
                      </Badge>
                    </div>
                    <p className="trend-description">
                      {getTrendInfo().description}
                    </p>

                    {stats.recent_trend === 'declining' && (
                      <div className="support-cta">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/chat')}
                        >
                          <Heart size={16} />
                          Talk to AI Companion
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Sentiment Distribution Card */}
              <Card className="sentiment-card">
                <div className="card-header">
                  <div className="header-icon gradient-indigo">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h2>Sentiment Analysis</h2>
                    <p>Emotional tone breakdown</p>
                  </div>
                </div>

                <div className="sentiment-list">
                  {Object.entries(stats.sentiment_distribution || {}).length > 0 ? (
                    Object.entries(stats.sentiment_distribution)
                      .sort(([, a], [, b]) => b - a)
                      .map(([sentiment, count]) => {
                        const percentage = getMoodPercentage(count);
                        
                        const sentimentConfig = {
                          positive: { color: 'text-green-600', gradient: 'from-green-400 to-emerald-400', emoji: '✨' },
                          negative: { color: 'text-red-600', gradient: 'from-red-400 to-rose-400', emoji: '💔' },
                          neutral: { color: 'text-gray-600', gradient: 'from-gray-400 to-slate-400', emoji: '➖' },
                        };
                        
                        const config = sentimentConfig[sentiment] || sentimentConfig.neutral;

                        return (
                          <div key={sentiment} className="sentiment-item">
                            <div className="sentiment-header">
                              <div className={`sentiment-badge bg-gradient-to-br ${config.gradient}`}>
                                <span>{config.emoji}</span>
                              </div>
                              <div className="sentiment-info">
                                <span className={`sentiment-label ${config.color}`}>
                                  {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                                </span>
                                <span className="sentiment-count">
                                  {count} entries ({percentage}%)
                                </span>
                              </div>
                            </div>
                            <Progress 
                              value={percentage} 
                              variant={sentiment === 'positive' ? 'success' : sentiment === 'negative' ? 'error' : 'default'} 
                              size="sm"
                              className="sentiment-progress"
                            />
                          </div>
                        );
                      })
                  ) : (
                    <p className="no-data">No sentiment data available</p>
                  )}
                </div>
              </Card>

              {/* Insights Card */}
              <Card className="insights-card">
                <div className="card-header">
                  <div className="header-icon gradient-yellow">
                    <Award size={24} />
                  </div>
                  <div>
                    <h2>Your Insights</h2>
                    <p>What your data tells us</p>
                  </div>
                </div>

                <div className="insights-content">
                  <div className="insight-item">
                    <div className="insight-icon">🎯</div>
                    <div className="insight-text">
                      <strong>Tracking Consistency</strong>
                      <p>You've logged {stats.total_entries} entries. Keep going!</p>
                    </div>
                  </div>

                  {stats.most_common_mood && (
                    <div className="insight-item">
                      <div className="insight-icon">
                        {MOOD_CONFIG[stats.most_common_mood]?.emoji || '😊'}
                      </div>
                      <div className="insight-text">
                        <strong>Dominant Emotion</strong>
                        <p>You've felt <span className="highlight">{stats.most_common_mood}</span> most often</p>
                      </div>
                    </div>
                  )}

                  {stats.average_sentiment_score !== null && (
                    <div className="insight-item">
                      <div className="insight-icon">
                        {stats.average_sentiment_score > 0.6 ? '🌟' : 
                         stats.average_sentiment_score > 0.4 ? '➖' : '💙'}
                      </div>
                      <div className="insight-text">
                        <strong>Overall Tone</strong>
                        <p>
                          Your sentiment is{' '}
                          {stats.average_sentiment_score > 0.6 ? 'mostly positive' :
                           stats.average_sentiment_score > 0.4 ? 'balanced' : 'needing support'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="insights-action">
                  <Button 
                    onClick={() => navigate('/journal')}
                    className="full-width-btn"
                    variant="outline"
                  >
                    <LineChart size={16} />
                    View All Entries
                  </Button>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MoodTracker;
