/**
 * PreSessionBriefingModal
 * Displays patient's recent mood trend, crisis events, latest journal excerpt, and AI notes
 * before a therapy session.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  X, AlertTriangle, TrendingDown, TrendingUp, Minus, FileText,
  ShieldAlert, Sparkles, Loader2,
} from 'lucide-react';
import apiClient from '../../apiClient';

const RISK_COLORS = {
  low: 'bg-green-500/10 text-green-600 border-green-500/20',
  moderate: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  crisis: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const SEVERITY_COLORS = {
  moderate: 'bg-yellow-500/20 text-yellow-700',
  high: 'bg-orange-500/20 text-orange-700',
  emergency: 'bg-red-500/20 text-red-700',
};

const MOOD_BAR_COLORS = {
  happy: 'bg-green-400', excited: 'bg-green-300', calm: 'bg-blue-400',
  neutral: 'bg-gray-400', anxious: 'bg-yellow-400', sad: 'bg-orange-400',
  stressed: 'bg-orange-500', angry: 'bg-red-400',
};

export function PreSessionBriefingModal({ appointmentId, patientName, isOpen, onClose }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !appointmentId) return;
    setLoading(true);
    setError(null);
    apiClient.get(`/therapist/appointments/${appointmentId}/briefing`)
      .then(res => setBriefing(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load briefing.'))
      .finally(() => setLoading(false));
  }, [isOpen, appointmentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Pre-Session Briefing</h2>
            <p className="text-sm text-muted-foreground">{patientName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">{error}</div>
          )}

          {briefing && (
            <>
              {/* Risk + Appointment time */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={`border ${RISK_COLORS[briefing.risk_level] || RISK_COLORS.low}`}>
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  Risk: {briefing.risk_level}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Session: {briefing.appointment_time ? new Date(briefing.appointment_time).toLocaleString() : '—'}
                </span>
              </div>

              {/* AI Notes */}
              <div className="flex items-start gap-3 bg-primary/5 border border-primary/10 rounded-xl p-4">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-primary mb-1">AI Insight</p>
                  <p className="text-sm text-foreground leading-relaxed">{briefing.ai_notes}</p>
                </div>
              </div>

              {/* Recent Mood Trend */}
              {briefing.recent_mood_trend?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      Recent Mood (7 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {briefing.recent_mood_trend.map((point, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
                          <div className={`h-2.5 w-2.5 rounded-full ${MOOD_BAR_COLORS[point.mood] || 'bg-muted-foreground'}`} />
                          <span className="text-xs capitalize">{point.mood}</span>
                          <span className="text-xs text-muted-foreground">{point.date}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Crisis Events */}
              {briefing.crisis_events?.length > 0 && (
                <Card className="border-red-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Crisis Events (last 30 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {briefing.crisis_events.map((ev, i) => (
                      <div key={i} className="rounded-lg p-3 border border-red-500/10 bg-red-500/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_COLORS[ev.severity] || SEVERITY_COLORS.moderate}`}>
                            {ev.severity}
                          </span>
                          <span className="text-xs text-muted-foreground">{ev.created_at}</span>
                        </div>
                        <p className="text-xs text-muted-foreground italic">"{ev.message}"</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Last Journal Excerpt */}
              {briefing.last_journal_excerpt && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Latest Journal Entry
                      {briefing.last_journal_date && (
                        <span className="text-xs text-muted-foreground font-normal ml-1">{briefing.last_journal_date}</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      "{briefing.last_journal_excerpt}"
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <Button onClick={onClose} variant="outline" className="w-full bg-transparent">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
