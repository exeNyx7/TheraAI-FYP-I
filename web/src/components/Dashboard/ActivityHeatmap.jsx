import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { CalendarDays } from 'lucide-react';

function generateActivityData(weeks = 15) {
  const days = [];
  const today = new Date();
  const totalDays = weeks * 7;
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const rand = Math.random();
    let level = 0;
    if (rand > 0.8) level = 4;
    else if (rand > 0.6) level = 3;
    else if (rand > 0.4) level = 2;
    else if (rand > 0.25) level = 1;
    days.push({ date, level });
  }
  return days;
}

const levelColors = [
  'bg-muted',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/70',
  'bg-primary',
];
const levelLabels = ['No activity', 'Low', 'Moderate', 'High', 'Very high'];
const weekDayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function ActivityHeatmap() {
  const activityData = useMemo(() => generateActivityData(15), []);

  const weeks = [];
  for (let i = 0; i < activityData.length; i += 7) {
    weeks.push(activityData.slice(i, i + 7));
  }

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    weeks.forEach((week, idx) => {
      const month = week[0]?.date.getMonth();
      if (month !== lastMonth) {
        labels.push({ idx, label: week[0]?.date.toLocaleString('default', { month: 'short' }) });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Activity Heatmap
        </CardTitle>
        <CardDescription>Your mental wellness activity over the last 15 weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {weeks.map((_, idx) => {
              const label = monthLabels.find(m => m.idx === idx);
              return (
                <div key={idx} className="w-4 flex-shrink-0 text-xs text-muted-foreground">
                  {label ? label.label : ''}
                </div>
              );
            })}
          </div>

          <div className="flex gap-1">
            {/* Day-of-week labels */}
            <div className="flex flex-col gap-1 mr-1">
              {weekDayLabels.map((d) => (
                <div key={d} className="h-3.5 w-6 text-xs text-muted-foreground flex items-center">
                  {d}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="flex gap-1">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((day, dIdx) => (
                    <div
                      key={dIdx}
                      title={`${day.date.toLocaleDateString()} — ${levelLabels[day.level]}`}
                      className={`h-3.5 w-3.5 rounded-sm ${levelColors[day.level]} transition-all hover:scale-125 hover:ring-2 hover:ring-primary/40 cursor-default flex-shrink-0`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            {levelColors.map((c, i) => (
              <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
