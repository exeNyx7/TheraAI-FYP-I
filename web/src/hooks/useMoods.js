import { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';

export function useMoods() {
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMoods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/moods');
      const data = res.data;
      setMoods(Array.isArray(data) ? data : data.moods || []);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load moods.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMoods();
  }, [fetchMoods]);

  const logMood = useCallback(async (entry) => {
    const res = await apiClient.post('/moods', entry);
    setMoods((prev) => [res.data, ...prev]);
    return res.data;
  }, []);

  return { moods, loading, error, refetch: fetchMoods, logMood, setMoods };
}
