import { useState, useEffect } from 'react';
import { getReadingStats } from '../utils/storage';

function computeStreak(dailyMinutes) {
  const dates = Object.keys(dailyMinutes).sort().reverse();
  if (dates.length === 0) return 0;

  let streak = 0;

  for (let i = 0; i < dates.length; i += 1) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    const expectedDate = expected.toISOString().slice(0, 10);

    if (dates[i] !== expectedDate) break;

    if (dailyMinutes[dates[i]] > 0) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function buildHeatmapData(dailyMinutes) {
  const data = {};
  const today = new Date();

  for (let i = 0; i < 30; i += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    data[key] = dailyMinutes[key] || 0;
  }

  return data;
}

export function useReadingStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      const nextStats = await getReadingStats();
      if (!cancelled) {
        setStats(nextStats);
        setLoading(false);
      }
    };
    void loadStats();
    return () => { cancelled = true; };
  }, []);

  const allDailyMinutes = stats?.dailyMinutes || {};
  const totalMinutes = Object.values(allDailyMinutes).reduce((sum, val) => sum + (val || 0), 0);
  const streak = computeStreak(allDailyMinutes);
  const completedBooks = stats?.completedBooks || 0;
  const heatmapData = buildHeatmapData(allDailyMinutes);
  const completedBookIds = stats?.completedBookIds || [];

  return {
    loading,
    totalMinutes,
    streak,
    completedBooks,
    heatmapData,
    dailyMinutes: allDailyMinutes,
    completedBookIds,
  };
}
