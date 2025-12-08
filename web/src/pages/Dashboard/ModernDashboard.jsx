/**
 * Modern Dashboard - Gamified Mental Health Hub
 * Engaging interface for all user types with progress tracking
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Flame, Trophy, Target, TrendingUp, BookOpen, BarChart3, 
  Calendar, MessageSquare, Heart, Zap, Brain, Award, Star,
  Clock, Activity, Users, Shield, Settings, ChevronRight,
  Sparkles, Plus, ArrowRight, Lock, BotMessageSquare
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import './ModernDashboard.css';

function ModernDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    streak: 7,
    totalPoints: 450,
    level: 3,
    weeklyGoal: 5,
    weeklyProgress: 3,
    journalEntries: 12,
    moodScore: 7.2,
    achievements: ['🔥 Week Warrior', '📖 Story Teller', '🎯 Goal Setter']
  });

  const [timeOfDay, setTimeOfDay] = useState('morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setTimeOfDay('morning');
    else if (hour >= 12 && hour < 17) setTimeOfDay('afternoon');
    else if (hour >= 17 && hour < 21) setTimeOfDay('evening');
    else setTimeOfDay('night');
  }, []);

  const getGreeting = () => {
    const greetings = {
      morning: '☀️ Good Morning',
      afternoon: '🌤️ Good Afternoon',
      evening: '🌅 Good Evening',
      night: '🌙 Good Night'
    };
    return greetings[timeOfDay];
  };

  const getMotivationalQuote = () => {
    const quotes = [
      "Every step forward is progress",
      "Your mental health matters",
      "You're stronger than you think",
      "Take it one day at a time",
      "You've got this!"
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  };

  const quickActions = [
    {
      title: 'Journal',
      description: 'Write your thoughts',
      icon: BookOpen,
      gradient: 'from-indigo-500 to-purple-600',
      link: '/journal',
      badge: 'New AI insights'
    },
    {
      title: 'Mood Tracker',
      description: 'Check your patterns',
      icon: BarChart3,
      gradient: 'from-purple-500 to-pink-500',
      link: '/mood-tracker',
      badge: null
    },
    {
      title: 'AI Chatbot',
      description: 'Talk to Chatbot',
      icon: BotMessageSquare,
      gradient: 'from-purple-500 to-pink-500',
      link: '/chatbot',
      badge: null
    },
    {
      title: 'Activities',
      description: 'Try a mindful exercise',
      icon: Zap,
      gradient: 'from-orange-500 to-red-500',
      link: '/activities',
      badge: 'Coming Soon'
    },
    {
      title: 'Assessment',
      description: 'Mental health check-in',
      icon: Brain,
      gradient: 'from-green-500 to-teal-500',
      link: '/assessment',
      badge: 'Coming Soon'
    }
  ];

  return (
    <div className="modern-dashboard">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="hero-grid">
          {/* Welcome Card */}
          <Card className="welcome-card">
            <div className="welcome-content">
              <div className="greeting-section">
                <h1 className="greeting">{getGreeting()}, {user?.full_name?.split(' ')[0]}!</h1>
                <p className="motivational-quote">
                  <Sparkles size={16} className="inline mr-2 text-yellow-500" />
                  {getMotivationalQuote()}
                </p>
              </div>
              
              <div className="level-badge">
                <Award size={24} className="text-yellow-500" />
                <div className="level-info">
                  <span className="level-label">Level {stats.level}</span>
                  <span className="level-points">{stats.totalPoints} XP</span>
                </div>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-header">
                <span className="progress-label">Level Progress</span>
                <span className="progress-percent">
                  {Math.round((stats.totalPoints % 200) / 2)}%
                </span>
              </div>
              <Progress 
                value={(stats.totalPoints % 200) / 2} 
                className="level-progress"
              />
              <p className="progress-hint">
                {200 - (stats.totalPoints % 200)} XP to Level {stats.level + 1}
              </p>
            </div>
          </Card>

          {/* Streak Card */}
          <Card className="stat-card streak-card">
            <div className="stat-icon-wrapper">
              <Flame size={32} className="text-orange-500" />
            </div>
            <div className="stat-details">
              <div className="stat-value">{stats.streak}</div>
              <div className="stat-label">Day Streak</div>
              <p className="stat-sublabel">Keep it going! 🔥</p>
            </div>
          </Card>

          {/* Weekly Goal Card */}
          <Card className="stat-card goal-card">
            <div className="stat-icon-wrapper">
              <Target size={32} className="text-green-500" />
            </div>
            <div className="stat-details">
              <div className="stat-value">{stats.weeklyProgress}/{stats.weeklyGoal}</div>
              <div className="stat-label">Weekly Goal</div>
              <Progress 
                value={(stats.weeklyProgress / stats.weeklyGoal) * 100} 
                className="mini-progress"
              />
            </div>
          </Card>

          {/* Mood Score Card */}
          <Card className="stat-card mood-card">
            <div className="stat-icon-wrapper">
              <Heart size={32} className="text-pink-500" />
            </div>
            <div className="stat-details">
              <div className="stat-value">{stats.moodScore}/10</div>
              <div className="stat-label">Mood Score</div>
              <div className="mood-trend">
                <TrendingUp size={16} className="text-green-500" />
                <span>Improving</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <section className="quick-actions-section">
        <div className="section-header">
          <h2 className="section-title">Quick Actions</h2>
          <p className="section-subtitle">Start your wellness journey</p>
        </div>

        <div className="actions-grid">
          {quickActions.map((action, idx) => {
            const ActionIcon = action.icon;
            return (
              <Card 
                key={idx}
                className="action-card"
                onClick={() => {
                  if (!action.link.includes('Coming')) {
                    window.location.href = action.link;
                  }
                }}
                style={{ cursor: action.badge === 'Coming Soon' ? 'not-allowed' : 'pointer' }}
              >
                <div className={`action-icon bg-gradient-to-br ${action.gradient}`}>
                  <ActionIcon size={28} className="text-white" />
                </div>
                <div className="action-content">
                  <div className="action-header">
                    <h3 className="action-title">{action.title}</h3>
                    {action.badge && (
                      <Badge 
                        variant={action.badge === 'Coming Soon' ? 'secondary' : 'default'}
                        size="sm"
                      >
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="action-description">{action.description}</p>
                </div>
                <ChevronRight size={20} className="action-arrow" />
              </Card>
            );
          })}
        </div>
      </section>

      {/* Achievements Section */}
      <section className="achievements-section">
        <div className="section-header">
          <h2 className="section-title">
            <Trophy size={24} className="inline mr-2 text-yellow-500" />
            Recent Achievements
          </h2>
        </div>

        <div className="achievements-grid">
          {stats.achievements.map((achievement, idx) => (
            <Card key={idx} className="achievement-card">
              <div className="achievement-icon">
                <Award size={24} className="text-yellow-500" />
              </div>
              <span className="achievement-name">{achievement}</span>
            </Card>
          ))}
          <Card className="achievement-card locked">
            <div className="achievement-icon">
              <Lock size={24} className="text-gray-400" />
            </div>
            <span className="achievement-name">More to unlock...</span>
          </Card>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="activity-section">
        <div className="section-header">
          <h2 className="section-title">
            <Activity size={24} className="inline mr-2 text-blue-500" />
            Recent Activity
          </h2>
          <Button variant="ghost" size="sm">
            View All <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>

        <Card className="activity-feed">
          <div className="activity-item">
            <div className="activity-icon bg-blue-100">
              <BookOpen size={20} className="text-blue-600" />
            </div>
            <div className="activity-details">
              <p className="activity-text">Created a journal entry</p>
              <p className="activity-time">2 hours ago</p>
            </div>
            <Badge variant="default" size="sm">+10 XP</Badge>
          </div>
          
          <div className="activity-item">
            <div className="activity-icon bg-green-100">
              <Target size={20} className="text-green-600" />
            </div>
            <div className="activity-details">
              <p className="activity-text">Completed weekly goal</p>
              <p className="activity-time">1 day ago</p>
            </div>
            <Badge variant="success" size="sm">+50 XP</Badge>
          </div>

          <div className="activity-item">
            <div className="activity-icon bg-purple-100">
              <Trophy size={20} className="text-purple-600" />
            </div>
            <div className="activity-details">
              <p className="activity-text">Unlocked "Week Warrior"</p>
              <p className="activity-time">3 days ago</p>
            </div>
            <Badge variant="default" size="sm">Badge</Badge>
          </div>
        </Card>
      </section>

      {/* Daily Challenge (Future Feature) */}
      <section className="challenge-section">
        <Card className="challenge-card">
          <div className="challenge-content">
            <div className="challenge-header">
              <Zap size={28} className="text-yellow-500" />
              <div>
                <h3 className="challenge-title">Daily Challenge</h3>
                <p className="challenge-subtitle">Complete for bonus XP!</p>
              </div>
            </div>
            <div className="challenge-task">
              <div className="task-checkbox">
                <div className="checkbox"></div>
              </div>
              <p className="task-text">Write a journal entry about your day</p>
              <Badge variant="default" size="sm">+25 XP</Badge>
            </div>
          </div>
        </Card>
        
      </section>
      {/* AI Chatbot Floating Button */}
    {/* <ChatUI /> */}
    </div>
  );
}

export default ModernDashboard;
