/**
 * Patient Dashboard Component V0
 * Modern, dynamic dashboard for patient wellness journey
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { DashboardHeader } from '../../components/Dashboard/DashboardHeader';
import { QuickActions } from '../../components/Dashboard/QuickActions';
import { ActivityHeatmap } from '../../components/Dashboard/ActivityHeatmap';
import { WeeklyMoodSummary } from '../../components/Dashboard/WeeklyMoodSummary';
import { getUserStats } from '../../services/statsService';
import { Loader2 } from 'lucide-react';

export default function PatientDashboardV0() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch user stats from backend
    fetchStats();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getUserStats();
      
      // Transform backend stats to dashboard format
      setStats({
        streak: data.streak || 0,
        currentMood: data.recent_mood || 'Neutral',
        goalsCompleted: data.weekly_progress || 0,
        totalGoals: data.weekly_goal || 5,
        wellnessScore: data.mood_score || 0,
        journalEntries: data.journal_count || 0,
        moodScore: data.mood_score || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Set default stats on error
      setStats({
        streak: 0,
        currentMood: 'Neutral',
        goalsCompleted: 0,
        totalGoals: 5,
        wellnessScore: 0,
        journalEntries: 0,
        moodScore: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 overflow-auto min-w-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
            <DashboardHeader stats={stats} />
            <QuickActions />
            
            {/* Activity Heatmap + Weekly Mood Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ActivityHeatmap />
              </div>
              <WeeklyMoodSummary />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
