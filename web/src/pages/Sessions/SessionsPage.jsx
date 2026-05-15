import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Card } from '../../components/ui/card';
import {
  Calendar, Clock, Video, User, Star, ChevronRight,
  FileText, X, Loader2, CalendarDays, AlertCircle,
  CheckCircle2, XCircle, ClipboardList, Stethoscope,
} from 'lucide-react';
import apiClient from '../../apiClient';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function timeUntil(iso) {
  if (!iso) return '';
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return 'Now';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `in ${d} day${d > 1 ? 's' : ''}`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m} min`;
}

const STATUS_CONFIG = {
  completed: { label: 'Completed', icon: CheckCircle2, cls: 'bg-green-500/10 text-green-600 border-green-500/20' },
  cancelled:  { label: 'Cancelled', icon: XCircle,     cls: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  no_show:    { label: 'No Show',   icon: AlertCircle, cls: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  scheduled:  { label: 'Scheduled', icon: Clock,       cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function StarRating({ rating }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

// ─── Next Appointment card ─────────────────────────────────────────────────────

function NextAppointmentCard({ appt, onJoin }) {
  return (
    <Card className="p-6 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Next Session</p>
              <p className="text-xs text-muted-foreground">{timeUntil(appt.scheduled_at)}</p>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Montserrat' }}>
              {fmtDate(appt.scheduled_at)}
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">{fmtTime(appt.scheduled_at)}</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {appt.therapist_name}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {appt.duration_minutes} min
            </span>
            <span className="flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5" />
              {appt.type === 'video' ? 'Video Call' : 'In Person'}
            </span>
          </div>
        </div>
        {appt.jitsi_room_name && (
          <button
            onClick={onJoin}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <Video className="h-4 w-4" />
            Join Call
          </button>
        )}
      </div>
    </Card>
  );
}

// ─── Session Detail Modal ──────────────────────────────────────────────────────

function NoteSection({ label, icon: Icon, content }) {
  if (!content) return null;
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </h4>
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-lg px-3 py-2.5">
        {content}
      </p>
    </div>
  );
}

function ListSection({ label, icon: Icon, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </h4>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="text-primary mt-0.5 flex-shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SessionModal({ session, onClose }) {
  const note = session.note_detail;

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-bold" style={{ fontFamily: 'Montserrat' }}>
              Session Details
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{fmtDate(session.scheduled_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Session metadata */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: User,     label: 'Therapist', value: session.therapist_name },
              { icon: Clock,    label: 'Time',       value: fmtTime(session.scheduled_at) },
              { icon: CalendarDays, label: 'Duration', value: `${session.duration_minutes} min` },
              { icon: Video,    label: 'Type',       value: session.type === 'video' ? 'Video Call' : 'In Person' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <StatusBadge status={session.status} />

          {/* Session notes */}
          {note ? (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-semibold text-sm">
                <FileText className="h-4 w-4 text-primary" />
                Session Summary
                <span className="text-xs font-normal text-muted-foreground">(written by your therapist)</span>
              </h3>
              <NoteSection label="How you presented"   icon={User}          content={note.subjective} />
              <NoteSection label="Observations"         icon={Stethoscope}  content={note.objective} />
              <NoteSection label="Assessment"           icon={ClipboardList} content={note.assessment} />
              <NoteSection label="Plan / Next Steps"   icon={ChevronRight}  content={note.plan} />
              <NoteSection label="Conclusion"           icon={CheckCircle2}  content={note.conclusion} />
              <ListSection label="Prescriptions"        icon={FileText}      items={note.prescriptions} />
              <ListSection label="Exercises / Activities" icon={Star}        items={note.exercises} />
            </div>
          ) : session.status === 'completed' ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-xl p-4">
              <FileText className="h-4 w-4 flex-shrink-0" />
              No session summary was written for this session.
            </div>
          ) : null}

          {/* Patient's own feedback */}
          {(session.patient_rating || session.patient_comment) && (
            <div className="border-t border-border pt-4 space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Your Feedback
              </h3>
              <StarRating rating={session.patient_rating} />
              {session.patient_comment && (
                <p className="text-sm text-muted-foreground italic">"{session.patient_comment}"</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Session Row ───────────────────────────────────────────────────────────────

function SessionRow({ session, onClick }) {
  const canView = session.status === 'completed';

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border border-border transition-all ${
        canView ? 'hover:border-primary/30 hover:bg-primary/2 cursor-pointer' : 'opacity-80'
      }`}
      onClick={canView ? onClick : undefined}
    >
      {/* Date column */}
      <div className="w-20 flex-shrink-0 text-center">
        <p className="text-xs font-semibold text-muted-foreground uppercase">
          {new Date(session.scheduled_at).toLocaleString('en-US', { month: 'short' })}
        </p>
        <p className="text-2xl font-bold leading-tight">
          {new Date(session.scheduled_at).getDate()}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(session.scheduled_at).getFullYear()}
        </p>
      </div>

      {/* Divider */}
      <div className="w-px h-12 bg-border flex-shrink-0" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{session.therapist_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {fmtTime(session.scheduled_at)} · {session.duration_minutes} min ·{' '}
          {session.type === 'video' ? 'Video' : 'In Person'}
        </p>
      </div>

      {/* Status + actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <StatusBadge status={session.status} />
        {session.had_notes && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Notes
          </span>
        )}
        {canView && (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onBook }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <CalendarDays className="h-10 w-10 text-primary/50" />
      </div>
      <div>
        <h3 className="text-lg font-bold" style={{ fontFamily: 'Montserrat' }}>No sessions yet</h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-xs">
          Book your first session with a therapist to begin your mental wellness journey.
        </p>
      </div>
      <button
        onClick={onBook}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all mt-2"
      >
        <Calendar className="h-4 w-4" />
        Book a Session
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    load();
  }, [user]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/sessions/history');
      setData(res.data);
    } catch (err) {
      setError('Failed to load session history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleJoin = () => {
    if (data?.next_appointment?.id) {
      navigate(`/waiting-room/${data.next_appointment.id}`);
    }
  };

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 overflow-auto min-w-0 pt-16 lg:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">

            {/* Page header */}
            <div className="space-y-1">
              <h1
                className="text-3xl font-bold"
                style={{ fontFamily: 'Montserrat' }}
              >
                My Sessions
              </h1>
              <p className="text-muted-foreground">Your complete therapy history</p>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {error && !loading && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                {error}
                <button onClick={load} className="ml-auto underline">Retry</button>
              </div>
            )}

            {!loading && !error && data && (
              <>
                {/* Stats row */}
                {data.total_sessions > 0 && (
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                      <strong className="text-foreground text-base">{data.total_sessions}</strong>
                      {data.total_sessions === 1 ? 'session' : 'sessions'} completed
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <strong className="text-foreground text-base">{data.appointments.length}</strong>
                      total appointments
                    </span>
                  </div>
                )}

                {/* Next appointment */}
                {data.next_appointment && (
                  <NextAppointmentCard appt={data.next_appointment} onJoin={handleJoin} />
                )}

                {/* Session list */}
                {data.appointments.length === 0 ? (
                  <EmptyState onBook={() => navigate('/appointments')} />
                ) : (
                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                      All Sessions
                    </h2>
                    {data.appointments.map(session => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        onClick={() => setSelected(session)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {selected && (
        <SessionModal session={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
