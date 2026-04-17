import { useState, useEffect } from 'react';
import { MessageSquare, Clock, Loader2, Plus, Trash2 } from 'lucide-react';
import { getConversations, createConversation, deleteConversation } from '../../services/chatService';

export function SessionHistory({ onSelectSession, onNewConversation }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const data = await getConversations();
      // API returns array directly or {conversations: [...]}
      setSessions(Array.isArray(data) ? data : (data.conversations || []));
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = async () => {
    setCreating(true);
    try {
      const conv = await createConversation('New Conversation');
      setSessions(prev => [conv, ...prev]);
      onNewConversation?.(conv);
      onSelectSession?.(conv);
    } catch {
      // silently fail — backend may not support it yet
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteConversation(id);
      setSessions(prev => prev.filter(s => (s.id || s._id) !== id));
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">Recent conversations</p>
        <button
          onClick={handleNew}
          disabled={creating}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          New
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No conversations yet. Start chatting!</p>
      ) : (
        sessions.map((session) => {
          const id = session.id || session._id;
          const title = session.title || 'Untitled Conversation';
          const date = session.updated_at || session.created_at || session.date;
          const msgCount = session.message_count ?? session.messages ?? 0;
          return (
            <button
              key={id}
              onClick={() => onSelectSession?.(session)}
              className="w-full text-left p-3 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 group"
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {date && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(date).toLocaleDateString()}
                      </p>
                    )}
                    {msgCount > 0 && (
                      <span className="text-xs text-muted-foreground">· {msgCount} msgs</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  disabled={deletingId === id}
                >
                  {deletingId === id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Trash2 className="h-3 w-3" />}
                </button>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
