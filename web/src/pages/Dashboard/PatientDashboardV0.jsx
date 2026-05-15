import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { DashboardHeader } from '../../components/Dashboard/DashboardHeader';
import { QuickActions } from '../../components/Dashboard/QuickActions';
import { ActivityHeatmap } from '../../components/Dashboard/ActivityHeatmap';
import { WeeklyMoodSummary } from '../../components/Dashboard/WeeklyMoodSummary';
import { getUserStats } from '../../services/statsService';
import apiClient from '../../apiClient';
import { Loader2 } from 'lucide-react';

export default function PatientDashboardV0() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch stats and most recent mood in parallel
      const [statsResult, moodsResult] = await Promise.allSettled([
        getUserStats(),
        apiClient.get('/moods', { params: { limit: 1 } }),
      ]);

      const s = statsResult.status === 'fulfilled' ? statsResult.value : {};

      // Extract most recent mood label
      let currentMood = 'neutral';
      if (moodsResult.status === 'fulfilled') {
        const raw = moodsResult.value.data;
        const list = Array.isArray(raw) ? raw : raw?.moods || [];
        if (list.length > 0) currentMood = list[0].mood || 'neutral';
      }

      setStats({
        streak:        s.streak         ?? 0,
        currentMood,
        goalsCompleted: s.weekly_progress ?? 0,
        totalGoals:    s.weekly_goal     ?? 5,
        wellnessScore: s.mood_score      ?? 0,
        journalEntries: s.journal_entries ?? 0,
        level:         s.level           ?? 1,
        totalPoints:   s.total_points    ?? 0,
      });
    } catch {
      setStats({
        streak: 0, currentMood: 'neutral',
        goalsCompleted: 0, totalGoals: 5,
        wellnessScore: 0, journalEntries: 0,
        level: 1, totalPoints: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 overflow-auto min-w-0 pt-16 lg:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
            <DashboardHeader stats={stats} />
            <QuickActions />
            <ActivityHeatmap />
            <WeeklyMoodSummary />
          </div>
        </div>
      </main>
    </div>
  );
}
