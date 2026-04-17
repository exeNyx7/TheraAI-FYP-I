/**
 * AchievementUnlockedModal — celebrates newly unlocked achievements.
 * Usage: <AchievementUnlockedModal achievements={[{id, title, xp}]} onClose={() => {}} />
 */
import { Trophy, X } from 'lucide-react';
import { Button } from '../ui/button';

export function AchievementUnlockedModal({ achievements = [], onClose }) {
  if (!achievements || achievements.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full
                      animate-in zoom-in-90 fade-in duration-300 text-center">
        <div className="h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
          <Trophy className="h-8 w-8 text-yellow-500" />
        </div>

        <h2 className="text-xl font-bold mb-1">Achievement Unlocked!</h2>
        <p className="text-muted-foreground text-sm mb-4">
          {achievements.length === 1
            ? 'You earned a new achievement.'
            : `You earned ${achievements.length} new achievements!`}
        </p>

        <div className="space-y-2 mb-5">
          {achievements.map(a => (
            <div
              key={a.id}
              className="flex items-center justify-between px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
            >
              <span className="font-medium text-sm">{a.title}</span>
              <span className="text-xs text-yellow-600 font-bold">+{a.xp} XP</span>
            </div>
          ))}
        </div>

        <Button className="w-full" onClick={onClose}>
          Awesome!
        </Button>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
