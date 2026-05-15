import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Video, RefreshCw, Calendar, Clock, User, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useNavigate } from 'react-router-dom';

const STATUS_PILL = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmed:  'bg-blue-100 text-blue-700 border-blue-200',
  completed:  'bg-green-100 text-green-700 border-green-200',
  cancelled:  'bg-red-100 text-red-700 border-red-200',
  no_show:    'bg-gray-100 text-gray-600 border-gray-200',
};
const STATUS_DOT = {
  scheduled: 'bg-blue-500',
  confirmed:  'bg-blue-500',
  completed:  'bg-green-500',
  cancelled:  'bg-red-500',
  no_show:    'bg-gray-400',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function apptKey(appt) {
  const raw = appt.scheduled_at || appt.date;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return dateKey(d);
}

function fmtTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function buildGrid(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7; // Monday=0
  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push(new Date(year, month, -i));
  for (let d = 1; d <= last.getDate(); d++)    cells.push(new Date(year, month, d));
  let next = 1;
  while (cells.length < 42) cells.push(new Date(year, month + 1, next++));
  return cells;
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────
function DayPanel({ dateStr, appointments }) {
  const navigate = useNavigate();
  const label = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm leading-tight">{label}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {appointments.length === 0
            ? 'No appointments'
            : `${appointments.length} appointment${appointments.length > 1 ? 's' : ''}`}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[360px]">
        {appointments.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-25" />
            <p className="text-xs">No sessions scheduled</p>
          </div>
        ) : (
          appointments.map((appt, idx) => {
            const id = appt.id || appt._id;
            return (
              <div
                key={id || idx}
                className="p-3 rounded-lg border border-border bg-background hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      {appt.patient_name || appt.therapist_name || 'Session'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      {fmtTime(appt.scheduled_at)}{appt.duration_minutes ? ` · ${appt.duration_minutes} min` : ''}
                    </p>
                  </div>
                  <Badge className={`text-[10px] flex-shrink-0 border capitalize ${STATUS_PILL[appt.status] || STATUS_PILL.scheduled}`}>
                    {appt.status}
                  </Badge>
                </div>
                {id && (appt.status === 'scheduled' || appt.status === 'confirmed') && (
                  <Button
                    size="sm"
                    className="w-full mt-2.5 h-7 text-xs gap-1.5"
                    onClick={() => navigate(`/waiting-room/${id}`)}
                  >
                    <Video className="h-3.5 w-3.5" /> Join Session
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main Calendar Component ───────────────────────────────────────────────────
export function AppointmentCalendar({ appointments = [], loading = false, onRefetch }) {
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const [pivot, setPivot] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const year  = pivot.getFullYear();
  const month = pivot.getMonth();
  const cells = useMemo(() => buildGrid(year, month), [year, month]);

  const apptMap = useMemo(() => {
    const map = {};
    appointments.forEach(a => {
      const k = apptKey(a);
      if (!k) return;
      (map[k] = map[k] || []).push(a);
    });
    return map;
  }, [appointments]);

  const selectedAppts = apptMap[selectedKey] || [];

  const prev = () => setPivot(new Date(year, month - 1, 1));
  const next = () => setPivot(new Date(year, month + 1, 1));
  const goToday = () => {
    setPivot(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(todayKey);
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Montserrat' }}>
            {MONTHS[month]} {year}
          </h2>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={goToday} className="text-xs h-8 px-3">
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {onRefetch && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefetch} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Two-column layout: calendar + day panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* ── Calendar Grid ── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
            {/* Day-name header */}
            <div className="grid grid-cols-7 bg-muted/50 border-b border-border">
              {DAYS_SHORT.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide select-none">
                  <span className="hidden sm:inline">{d}</span>
                  <span className="sm:hidden">{d[0]}</span>
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const key       = dateKey(day);
                const inMonth   = day.getMonth() === month;
                const isToday   = key === todayKey;
                const isSelected = key === selectedKey;
                const dayAppts  = apptMap[key] || [];

                return (
                  <button
                    key={key + i}
                    onClick={() => setSelectedKey(key)}
                    className={[
                      'relative min-h-[60px] sm:min-h-[84px] p-1 sm:p-1.5',
                      'border-b border-r border-border/40 text-left',
                      'transition-colors duration-100 focus:outline-none',
                      inMonth   ? 'bg-card hover:bg-muted/40'      : 'bg-muted/20 hover:bg-muted/30',
                      !inMonth  && 'text-muted-foreground/50',
                      isSelected ? 'ring-2 ring-inset ring-primary/60 bg-primary/5 hover:bg-primary/8' : '',
                    ].join(' ')}
                  >
                    {/* Day number */}
                    <span className={[
                      'inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium mb-0.5',
                      isToday    ? 'bg-primary text-primary-foreground font-bold shadow-sm' : '',
                      !isToday && inMonth  ? 'text-foreground' : '',
                      !isToday && !inMonth ? 'text-muted-foreground/40' : '',
                    ].join(' ')}>
                      {day.getDate()}
                    </span>

                    {/* Desktop: event pills */}
                    {dayAppts.length > 0 && (
                      <div className="hidden sm:flex flex-col gap-0.5">
                        {dayAppts.slice(0, 2).map((a, j) => (
                          <div
                            key={a.id || a._id || j}
                            className={`text-[10px] px-1.5 py-0.5 rounded border truncate leading-tight font-medium ${
                              STATUS_PILL[a.status] || STATUS_PILL.scheduled
                            }`}
                          >
                            {fmtTime(a.scheduled_at)} {a.patient_name?.split(' ')[0] || 'Session'}
                          </div>
                        ))}
                        {dayAppts.length > 2 && (
                          <span className="text-[10px] text-muted-foreground px-1">+{dayAppts.length - 2} more</span>
                        )}
                      </div>
                    )}

                    {/* Mobile: dot indicators */}
                    {dayAppts.length > 0 && (
                      <div className="flex sm:hidden gap-0.5 flex-wrap mt-0.5">
                        {dayAppts.slice(0, 4).map((a, j) => (
                          <div
                            key={j}
                            className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[a.status] || STATUS_DOT.scheduled}`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {[
              { label: 'Scheduled', cls: 'bg-blue-500' },
              { label: 'Completed', cls: 'bg-green-500' },
              { label: 'Cancelled', cls: 'bg-red-500' },
            ].map(({ label, cls }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`h-2 w-2 rounded-full ${cls}`} />
                {label}
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-auto italic">
              Click a day to view appointments
            </span>
          </div>
        </div>

        {/* ── Day Panel ── */}
        <DayPanel dateStr={selectedKey} appointments={selectedAppts} />
      </div>
    </div>
  );
}
