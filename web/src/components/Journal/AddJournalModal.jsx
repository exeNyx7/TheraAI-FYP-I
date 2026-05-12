import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Smile, Frown, Heart, Wind, Circle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';


const moods = [
  { value: 'happy', label: 'Happy', icon: Smile, color: 'text-yellow-500' },
  { value: 'sad', label: 'Sad', icon: Frown, color: 'text-blue-500' },
  { value: 'anxious', label: 'Anxious', icon: Heart, color: 'text-red-500' },
  { value: 'calm', label: 'Calm', icon: Wind, color: 'text-teal-500' },
  { value: 'neutral', label: 'Neutral', icon: Circle, color: 'text-gray-500' },
];

export function AddJournalModal({ open, onOpenChange, onSubmit }) {
  const { showSuccess, showError } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showError('Please fill in both title and content.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit?.({ title, content, mood: selectedMood });
      showSuccess('Journal entry saved!');
      setTitle('');
      setContent('');
      setSelectedMood('neutral');
      onOpenChange(false);
    } catch {
      showError('Failed to save entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Montserrat' }}>
          Write a New Entry
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="journal-title" className="text-sm font-medium">Entry Title</label>
            <Input
              id="journal-title"
              placeholder="Give your entry a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg"
            />
          </div>

          {/* Mood selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium">How are you feeling?</label>
            <div className="grid grid-cols-5 gap-3">
              {moods.map((mood) => {
                const Icon = mood.icon;
                return (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => setSelectedMood(mood.value)}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 hover:shadow-md ${
                      selectedMood === mood.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${mood.color}`} />
                    <span className="text-xs font-medium text-center">{mood.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label htmlFor="journal-content" className="text-sm font-medium">Your Thoughts</label>
            <textarea
              id="journal-content"
              placeholder="Write what's on your mind... There are no rules or judgment here."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
