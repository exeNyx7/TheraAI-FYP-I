import { useEffect, useMemo, useState } from 'react';
import { Search, X, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import apiClient from '../../apiClient';

/**
 * SessionHistoryModal
 * Lists prior conversations (GET /conversations) with search.
 * On select, calls onSelect(conversation) and closes.
 */
export default function SessionHistoryModal({ open, onClose, onSelect }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .get('/conversations')
      .then((res) => {
        if (cancelled) return;
        setConversations(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.detail || 'Failed to load conversations');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.preview || '').toLowerCase().includes(q)
    );
  }, [conversations, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Session History</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-5 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          )}
          {error && !loading && (
            <p className="text-sm text-destructive text-center py-6">{error}</p>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No sessions found</p>
            </div>
          )}
          {!loading && !error && filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onSelect?.(c);
                onClose?.();
              }}
              className="w-full text-left px-3 py-3 rounded-xl hover:bg-muted/70 transition-colors mb-1"
            >
              <div className="font-medium text-sm truncate">{c.title || 'Untitled session'}</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span>{c.message_count ?? 0} messages</span>
                {c.updated_at && (
                  <span>· {new Date(c.updated_at).toLocaleDateString()}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
