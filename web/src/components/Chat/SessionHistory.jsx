import { MessageSquare, Clock } from 'lucide-react';

const mockSessions = [
  { id: '1', title: 'Dealing with work stress', date: '2026-03-26', messages: 12 },
  { id: '2', title: 'Sleep anxiety discussion', date: '2026-03-24', messages: 8 },
  { id: '3', title: 'Breathing exercises', date: '2026-03-22', messages: 15 },
  { id: '4', title: 'Mindfulness practice', date: '2026-03-20', messages: 6 },
  { id: '5', title: 'Mood check-in', date: '2026-03-18', messages: 4 },
];

export function SessionHistory({ onSelectSession }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">Recent conversations</p>
      {mockSessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelectSession?.(session)}
          className="w-full text-left p-3 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 group"
        >
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{new Date(session.date).toLocaleDateString()}</p>
                <span className="text-xs text-muted-foreground">· {session.messages} messages</span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
