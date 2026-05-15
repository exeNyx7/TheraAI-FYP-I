import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Smile, Frown, Heart, Wind, Circle, Sparkles, Loader2, Mic, MicOff } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../apiClient';


const moods = [
  { value: 'happy', label: 'Happy', icon: Smile, color: 'text-yellow-500' },
  { value: 'sad', label: 'Sad', icon: Frown, color: 'text-blue-500' },
  { value: 'anxious', label: 'Anxious', icon: Heart, color: 'text-red-500' },
  { value: 'calm', label: 'Calm', icon: Wind, color: 'text-teal-500' },
  { value: 'neutral', label: 'Neutral', icon: Circle, color: 'text-gray-500' },
];

export function AddJournalModal({ open, onOpenChange, onSubmit }) {
  const { showError } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);   // { insight, suggestion }
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      setContent((prev) => {
        const base = prev.trimEnd();
        return base ? `${base} ${transcript}` : transcript;
      });
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const reset = () => {
    stopListening();
    setTitle('');
    setContent('');
    setSelectedMood('neutral');
    setAiInsight(null);
    setAnalyzingAI(false);
    setSaved(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showError('Please fill in both title and content.');
      return;
    }
    setIsSubmitting(true);
    try {
      const journal = await onSubmit?.({ title, content, mood: selectedMood });
      setSaved(true);

      // Fire off AI analysis in the background
      if (journal?.id || journal?._id) {
        const journalId = journal.id || journal._id;
        setAnalyzingAI(true);
        try {
          const res = await apiClient.post(`/journals/${journalId}/analyze`);
          setAiInsight({ insight: res.data.ai_insight, suggestion: res.data.ai_suggestion });
        } catch {
          // AI analysis failed silently — don't block the user
        } finally {
          setAnalyzingAI(false);
        }
      }
    } catch (err) {
      showError(err?.response?.data?.detail || 'Failed to save entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={saved ? handleClose : undefined}
      />
      {/* Modal — full-screen on mobile, card on sm+ */}
      <div className="relative bg-card border-t sm:border border-border rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Montserrat' }}>
          Write a New Entry
        </h2>

        {!saved ? (
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
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
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
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="journal-content" className="text-sm font-medium">Your Thoughts</label>
                <div className="flex items-center gap-2">
                  {isListening && (
                    <span className="flex items-center gap-1.5 text-xs text-red-500">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      Listening…
                    </span>
                  )}
                  <Button
                    type="button"
                    variant={isListening ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={isListening ? stopListening : startListening}
                    className="gap-1.5 h-8 text-xs"
                  >
                    {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    {isListening ? 'Stop' : 'Voice'}
                  </Button>
                </div>
              </div>
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
              <Button type="button" variant="outline" onClick={handleClose} className="bg-transparent">
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
        ) : (
          /* Post-save state — show AI insight */
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Entry saved!</span>
            </div>

            {/* AI reflection card */}
            <div className="border border-primary/20 rounded-xl p-4 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">AI Reflection</span>
              </div>

              {analyzingAI && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating your personalised insight…
                </div>
              )}

              {!analyzingAI && aiInsight && (
                <div className="space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">{aiInsight.insight}</p>
                  {aiInsight.suggestion && (
                    <div className="border-t border-primary/10 pt-3">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Gentle Suggestion</p>
                      <p className="text-sm text-foreground leading-relaxed">{aiInsight.suggestion}</p>
                    </div>
                  )}
                </div>
              )}

              {!analyzingAI && !aiInsight && (
                <p className="text-sm text-muted-foreground">AI reflection unavailable right now.</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose} className="bg-primary hover:bg-primary/90">
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
