import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { CalendarDays } from 'lucide-react';
import apiClient from '../../apiClient';

const WEEKS = 26;

const LEVEL_COLORS = [
  'bg-muted/60',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/65',
  'bg-primary',
];
const LEVEL_LABELS = ['No activity', 'Low', 'Moderate', 'High', 'Very high'];
const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function buildGrid(activityByDate) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (WEEKS * 7 - 1));
  start.setDate(start.getDate() - start.getDay()); // rewind to Sunday

  const days = [];
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const count = activityByDate[key] || 0;
    const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
    days.push({ date: new Date(d), count, level });
  }
  return days;
}

export function ActivityHeatmap() {
  const [activityByDate, setActivityByDate] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [moodsRes, journalsRes] = await Promise.allSettled([
          apiClient.get('/moods', { params: { limit: 500 } }),
          apiClient.get('/journals', { params: { limit: 500 } }),
        ]);

        const counts = {};
        const addDate = (isoStr) => {
          if (!isoStr) return;
          const key = isoStr.slice(0, 10);
          counts[key] = (counts[key] || 0) + 1;
        };

        if (moodsRes.status === 'fulfilled') {
          const raw = moodsRes.value.data;
          const list = Array.isArray(raw) ? raw : raw?.moods || [];
          list.forEach(m => addDate(m.created_at || m.timestamp));
        }
        if (journalsRes.status === 'fulfilled') {
          const raw = journalsRes.value.data;
          const list = Array.isArray(raw) ? raw : raw?.journals || [];
          list.forEach(j => addDate(j.created_at));
        }

        if (!cancelled) setActivityByDate(counts);
      } catch { /* silent */ } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const days = useMemo(() => buildGrid(activityByDate), [activityByDate]);

  // Chunk into week columns
  const weeks = useMemo(() => {
    const cols = [];
    for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));
    return cols;
  }, [days]);

  // Month labels: show at the first week of each month
  const monthLabels = useMemo(() => {
    const labels = {};
    weeks.forEach((week, idx) => {
      const month = week[0]?.date.getMonth();
      const prev = idx > 0 ? weeks[idx - 1][0]?.date.getMonth() : -1;
      if (month !== prev) labels[idx] = week[0].date.toLocaleString('default', { month: 'short' });
    });
    return labels;
  }, [weeks]);

  const totalActive = Object.keys(activityByDate).length;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Activity Heatmap
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {loading ? 'Loading…' : `${totalActive} active days in the last 6 months`}
            </CardDescription>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Less</span>
            {LEVEL_COLORS.map((c, i) => (
              <div key={i} className={`h-3 w-5 rounded-sm ${c}`} title={LEVEL_LABELS[i]} />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
            Loading activity…
          </div>
        ) : (
          <div className="w-full">
            {/* Month labels */}
            <div className="flex mb-1 pl-7 gap-[3px]">
              {weeks.map((_, idx) => (
                <div key={idx} className="flex-1 text-[10px] text-muted-foreground leading-none truncate">
                  {monthLabels[idx] || ''}
                </div>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {/* Day-of-week labels */}
              <div className="flex flex-col gap-[3px] w-6 flex-shrink-0">
                {DOW_LABELS.map((d, i) => (
                  <div
                    key={d}
                    className={`h-[18px] flex items-center text-[10px] text-muted-foreground ${
                      i % 2 !== 0 ? '' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid — cells use flex-1 so they fill available width evenly */}
              <div className="flex gap-[3px] flex-1 min-w-0">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-[3px] flex-1 min-w-0">
                    {week.map((day, dIdx) => (
                      <div
                        key={dIdx}
                        title={`${day.date.toLocaleDateString()} — ${day.count} ${day.count === 1 ? 'activity' : 'activities'}`}
                        className={`h-[18px] w-full rounded-md ${LEVEL_COLORS[day.level]} transition-opacity hover:opacity-80 cursor-default`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
