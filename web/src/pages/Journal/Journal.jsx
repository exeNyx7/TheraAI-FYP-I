/**
 * Journal Page - Modern Diary Experience  
 * Gamified mental health journaling with streaks, insights, and mood calendar
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Sparkles, Loader2, AlertCircle, Calendar, Flame, Award, 
  TrendingUp, Filter, Search, Plus, X, ChevronRight, Target, Trophy,
  Heart, Zap, Moon, Sun, CloudRain, Wind, Check, Lock, Star, ArrowLeft
} from 'lucide-react';
import JournalForm from '../../components/Journal/JournalForm';
import JournalCard from '../../components/Journal/JournalCard';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/modal';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { createJournal, getJournals, deleteJournal } from '../../services/journalService';
import { useToast } from '../../contexts/ToastContext';
import './Journal.css';

const Journal = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [journals, setJournals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, journalId: null });
  const [filterMood, setFilterMood] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('timeline'); // timeline, calendar, grid

  // Gamification stats
  const [stats, setStats] = useState({
    currentStreak: 0,
    totalEntries: 0,
    weeklyGoal: 7,
    weeklyProgress: 0,
    badges: []
  });

  useEffect(() => {
    fetchJournals();
    calculateStats();
  }, []);

  const fetchJournals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getJournals(0, 100);
      setJournals(data);
    } catch (err) {
      console.error('Failed to fetch journals:', err);
      setError(err.message || 'Failed to load journal entries');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = () => {
    // Calculate streaks and stats from journals
    const today = new Date();
    const thisWeek = journals.filter(j => {
      const entryDate = new Date(j.created_at);
      const diffDays = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
      return diffDays < 7;
    });

    setStats({
      currentStreak: calculateStreak(journals),
      totalEntries: journals.length,
      weeklyGoal: 7,
      weeklyProgress: thisWeek.length,
      badges: calculateBadges(journals)
    });
  };

  const calculateStreak = (entries) => {
    if (entries.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < entries.length; i++) {
      const entryDate = new Date(entries[i].created_at);
      entryDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - streak);
      
      if (entryDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const calculateBadges = (entries) => {
    const badges = [];
    if (entries.length >= 1) badges.push({ icon: Star, label: 'First Entry', color: 'yellow' });
    if (entries.length >= 7) badges.push({ icon: Trophy, label: '7 Day Writer', color: 'blue' });
    if (entries.length >= 30) badges.push({ icon: Award, label: 'Month Strong', color: 'purple' });
    if (entries.length >= 100) badges.push({ icon: Flame, label: 'Century Club', color: 'orange' });
    return badges;
  };

  const handleCreateJournal = async (journalData) => {
    try {
      const newJournal = await createJournal(journalData);
      setJournals(prev => [newJournal, ...prev]);
      setIsCreating(false);
      calculateStats();
      showToast('✨ Journal entry created with AI insights!', 'success');
    } catch (err) {
      console.error('Failed to create journal:', err);
      throw err;
    }
  };

  const handleDeleteJournal = async () => {
    try {
      await deleteJournal(deleteModal.journalId);
      setJournals(prev => prev.filter(j => j.id !== deleteModal.journalId));
      setDeleteModal({ open: false, journalId: null });
      calculateStats();
      showToast('Journal entry deleted', 'success');
    } catch (err) {
      console.error('Failed to delete journal:', err);
      showToast('Failed to delete journal entry', 'error');
    }
  };

  // Generate calendar heatmap data
  const generateCalendarData = () => {
    const data = {};
    journals.forEach(journal => {
      const date = new Date(journal.created_at).toISOString().split('T')[0];
      data[date] = {
        count: (data[date]?.count || 0) + 1,
        mood: journal.mood,
        sentiment: journal.sentiment_label
      };
    });
    return data;
  };

  // Filter journals
  const filteredJournals = journals.filter(j => {
    const matchesMood = filterMood === 'all' || j.mood === filterMood;
    const matchesSearch = searchQuery === '' || 
      j.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMood && matchesSearch;
  });

  return (
    <div className="journal-container">
      {/* Hero Section with Gamification */}
      <div className="journal-hero">
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
            <h1 className="hero-title">
              <BookOpen className="inline-block mr-3" size={36} />
              Your Mindful Journal
            </h1>
            <p className="hero-subtitle">
              Document your journey, track your mood, unlock insights
            </p>
          </div>
          
          {!isCreating && (
            <Button 
              variant="gradient"
              size="lg"
              onClick={() => setIsCreating(true)}
              className="hero-cta"
            >
              <Plus size={20} className="mr-2" />
              New Entry
            </Button>
          )}
        </div>

        {/* Gamification Stats Bar */}
        <div className="stats-bar">
          {/* Streak Card */}
          <Card className="stat-card streak-card">
            <div className="stat-icon">
              <Flame size={24} className="text-orange-500" />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.currentStreak}</div>
              <div className="stat-label">Day Streak</div>
            </div>
          </Card>

          {/* Weekly Goal Card */}
          <Card className="stat-card goal-card">
            <div className="stat-icon">
              <Target size={24} className="text-green-500" />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.weeklyProgress}/{stats.weeklyGoal}</div>
              <div className="stat-label">Weekly Goal</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(stats.weeklyProgress / stats.weeklyGoal) * 100}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Total Entries Card */}
          <Card className="stat-card entries-card">
            <div className="stat-icon">
              <BookOpen size={24} className="text-blue-500" />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.totalEntries}</div>
              <div className="stat-label">Total Entries</div>
            </div>
          </Card>

          {/* Badges */}
          <Card className="stat-card badges-card">
            <div className="stat-info">
              <div className="stat-label mb-2">Achievements</div>
              <div className="badges-grid">
                {stats.badges.slice(0, 4).map((badge, idx) => {
                  const BadgeIcon = badge.icon;
                  return (
                    <div key={idx} className={`badge-item badge-${badge.color}`} title={badge.label}>
                      <BadgeIcon size={16} />
                    </div>
                  );
                })}
                {stats.badges.length === 0 && (
                  <span className="text-xs text-gray-400">No badges yet</span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Create Entry Section */}
      {isCreating && (
        <div className="create-entry-section">
          <div className="form-container">
            <JournalForm
              onSubmit={handleCreateJournal}
              onCancel={() => setIsCreating(false)}
            />
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="controls-section">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search your entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="search-clear">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="filter-tabs">
          {['all', 'happy', 'calm', 'anxious', 'sad'].map(mood => (
            <button
              key={mood}
              onClick={() => setFilterMood(mood)}
              className={`filter-tab ${filterMood === mood ? 'active' : ''}`}
            >
              {mood === 'all' ? 'All' : mood.charAt(0).toUpperCase() + mood.slice(1)}
            </button>
          ))}
        </div>

        <div className="view-toggle">
          <button 
            onClick={() => setViewMode('timeline')}
            className={`view-btn ${viewMode === 'timeline' ? 'active' : ''}`}
            title="Timeline View"
          >
            <BookOpen size={18} />
          </button>
          <button 
            onClick={() => setViewMode('calendar')}
            className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            title="Calendar View"
          >
            <Calendar size={18} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="journal-main">
        {isLoading && (
          <div className="loading-state">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-card">
                <Skeleton variant="rect" height={200} />
              </div>
            ))}
          </div>
        )}

        {error && !isLoading && (
          <Alert variant="error" icon={AlertCircle} className="mb-6">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchJournals}>
                Retry
              </Button>
            </div>
          </Alert>
        )}

        {!isLoading && !error && filteredJournals.length === 0 && (
          <div className="empty-state">
            <div className="empty-content">
              <div className="empty-icon">
                <BookOpen size={64} />
              </div>
              <h3 className="empty-title">
                {searchQuery || filterMood !== 'all' 
                  ? 'No entries found' 
                  : 'Begin Your Mindful Journey'}
              </h3>
              <p className="empty-description">
                {searchQuery || filterMood !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Start writing your first entry and unlock AI-powered insights about your emotional well-being'}
              </p>
              {!searchQuery && filterMood === 'all' && !isCreating && (
                <Button 
                  variant="gradient" 
                  size="lg" 
                  onClick={() => setIsCreating(true)}
                  className="mt-6"
                >
                  <Sparkles size={18} className="mr-2" />
                  Write First Entry
                </Button>
              )}
            </div>
          </div>
        )}

        {!isLoading && !error && filteredJournals.length > 0 && (
          <>
            {viewMode === 'timeline' && (
              <div className="timeline-view">
                <div className="entries-grid">
                  {filteredJournals.map(journal => (
                    <JournalCard
                      key={journal.id}
                      journal={journal}
                      onDelete={(id) => setDeleteModal({ open: true, journalId: id })}
                    />
                  ))}
                </div>
              </div>
            )}

            {viewMode === 'calendar' && (
              <div className="calendar-view">
                <CalendarHeatmap data={generateCalendarData()} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ open, journalId: null })}
        title="Delete Journal Entry?"
        description="This action cannot be undone. Your entry and AI insights will be permanently deleted."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteJournal}
        variant="destructive"
      />
    </div>
  );
};

// Calendar Heatmap Component
const CalendarHeatmap = ({ data }) => {
  const today = new Date();
  const days = [];
  
  // Generate last 12 weeks
  for (let i = 83; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      dayOfWeek: date.getDay(),
      hasEntry: !!data[dateStr],
      count: data[dateStr]?.count || 0,
      mood: data[dateStr]?.mood
    });
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getIntensityClass = (count) => {
    if (count === 0) return 'intensity-0';
    if (count === 1) return 'intensity-1';
    if (count === 2) return 'intensity-2';
    if (count >= 3) return 'intensity-3';
    return 'intensity-0';
  };

  return (
    <div className="heatmap-container">
      <h3 className="heatmap-title">Your Journal Activity</h3>
      <div className="heatmap-grid">
        <div className="heatmap-labels">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>
        <div className="heatmap-weeks">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="heatmap-week">
              {week.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className={`heatmap-day ${getIntensityClass(day.count)} ${day.hasEntry ? 'has-entry' : ''}`}
                  title={`${day.date}: ${day.count} entries`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-legend">
        <span className="legend-label">Less</span>
        <div className="intensity-0" />
        <div className="intensity-1" />
        <div className="intensity-2" />
        <div className="intensity-3" />
        <span className="legend-label">More</span>
      </div>
    </div>
  );
};

export default Journal;
