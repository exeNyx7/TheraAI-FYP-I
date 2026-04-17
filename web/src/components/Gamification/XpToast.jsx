/**
 * XpToast — brief animated pop-up showing XP gained.
 * Usage: <XpToast xpDelta={20} levelUp={false} visible onDone={() => setVisible(false)} />
 */
import { useEffect } from 'react';
import { Star } from 'lucide-react';

export function XpToast({ xpDelta = 0, levelUp = false, visible, onDone }) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [visible, onDone]);

  if (!visible || xpDelta === 0) return null;

  return (
    <div
      className="fixed bottom-24 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg
                 bg-primary text-primary-foreground text-sm font-semibold
                 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <Star className="h-4 w-4 fill-current" />
      +{xpDelta} XP
      {levelUp && <span className="ml-1 text-yellow-300 font-bold">· Level Up!</span>}
    </div>
  );
}
