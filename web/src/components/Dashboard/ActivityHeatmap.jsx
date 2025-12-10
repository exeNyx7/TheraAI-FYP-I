import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { getJournals } from '../../services/journalService';

function getHeatmapColor(level) {
  const colors = [
    'bg-muted/40 hover:bg-muted/60',
    'bg-primary/20 hover:bg-primary/30',
    'bg-primary/40 hover:bg-primary/50',
    'bg-primary/60 hover:bg-primary/70',
    'bg-primary hover:bg-primary/90',
  ];
  return colors[Math.min(level, 4)];
}

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ActivityHeatmap() {
  const [journalHistory, setJournalHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJournalHistory();
  }, []);

  const fetchJournalHistory = async () => {
    try {
      setLoading(true);
      // Fetch all journal entries (up to 100)
      const data = await getJournals(0, 100);
      setJournalHistory(data || []);
    } catch (error) {
      console.error('Failed to fetch journal history:', error);
      setJournalHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const { weeks, activityData } = useMemo(() => {
    // Map day names to numbers (0=Monday, 6=Sunday)
    const dayNameToNumber = {
      'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
      'Friday': 4, 'Saturday': 5, 'Sunday': 6
    };

    // Helper function to get date string in YYYY-MM-DD format
    const getDateString = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Get today's date and calculate start of 4-week period (from Monday)
    const today = new Date();
    const todayDayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.
    const daysToMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysToMonday - 21); // Go back to Monday of 4 weeks ago

    // Initialize data structure: date -> {count, dayName}
    const data = {};
    for (let i = 0; i < 28; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = getDateString(date);
      const dayIndex = date.getDay(); // 0=Sunday
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex];
      data[dateKey] = { count: 0, dayName, dayIndex };
    }

    // Count journal entries per day using both day_of_week and date
    journalHistory.forEach(journal => {
      const dateStr = journal.created_at || journal.timestamp;
      if (dateStr) {
        const journalDate = new Date(dateStr);
        const dateKey = getDateString(journalDate);
        
        // Use stored day_of_week if available, otherwise calculate from date
        if (data.hasOwnProperty(dateKey)) {
          data[dateKey].count += 1;
          // Verify day matches if day_of_week is stored
          if (journal.day_of_week && data[dateKey].dayName !== journal.day_of_week) {
            console.warn(`Day mismatch for ${dateKey}: stored=${journal.day_of_week}, calculated=${data[dateKey].dayName}`);
          }
        }
      }
    });

    // Build weeks array
    const weeksArray = Array.from({ length: 4 }, (_, weekIndex) => {
      return Array.from({ length: 7 }, (_, dayIndex) => {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + (weekIndex * 7) + dayIndex);
        const dateKey = getDateString(currentDate);
        const dayData = data[dateKey] || { count: 0, dayName: '', dayIndex: 0 };
        const level = Math.min(dayData.count, 4); // Cap at 4 for color scale
        const actualCount = dayData.count;
        return { 
          date: dateKey, 
          level, 
          actualCount, 
          dayOfWeek: dayData.dayIndex,
          dayName: dayData.dayName
        };
      });
    });
    
    return { weeks: weeksArray, activityData: data };
  }, [journalHistory]);

  return (
    <Card className="col-span-full lg:col-span-3 border-2 hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-xl" style={{ fontFamily: 'Montserrat' }}>
          Activity Heatmap
        </CardTitle>
        <CardDescription>Your engagement over the last 4 weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid gap-2" style={{ gridTemplateColumns: 'auto 1fr' }}>
            <div className="w-12"></div>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {dayLabels.map((day) => (
                <div key={day} className="text-xs text-muted-foreground text-center font-semibold">
                  {day}
                </div>
              ))}
            </div>
          </div>

          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid gap-2" style={{ gridTemplateColumns: 'auto 1fr' }}>
              <div className="w-12 text-xs text-muted-foreground flex items-start pt-1 font-medium">
                W{weekIndex + 1}
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`h-9 rounded-lg ${getHeatmapColor(day.level)} transition-all duration-200 hover:shadow-md cursor-pointer`}
                    title={`${day.date}: ${day.actualCount} journal ${day.actualCount === 1 ? 'entry' : 'entries'}`}
                  ></div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 mt-8 text-xs">
          <span className="text-muted-foreground font-medium">Less</span>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((level) => (
              <div key={level} className={`h-5 w-5 rounded-md ${getHeatmapColor(level)}`}></div>
            ))}
          </div>
          <span className="text-muted-foreground font-medium">More</span>
        </div>
      </CardContent>
    </Card>
  );
}
