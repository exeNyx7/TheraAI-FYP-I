import { useState, useEffect } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { AchievementTracker } from '../../components/Gamification/AchievementTracker';
import { Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../apiClient';

export default function Achievements() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unlockedIds, setUnlockedIds] = useState([]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    apiClient.get('/users/me/achievements')
      .then(res => {
        const unlocked = (res.data.achievements || [])
          .filter(a => a.unlocked)
          .map(a => a.id);
        setUnlockedIds(unlocked);
      })
      .catch(() => {});
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
            <div>
              <h1
                className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent"
                style={{ fontFamily: 'Montserrat' }}
              >
                Achievements
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Earn XP and unlock achievements on your wellness journey
              </p>
            </div>

            <AchievementTracker unlockedIds={unlockedIds} />
          </div>
        </div>
      </main>
    </div>
  );
}
