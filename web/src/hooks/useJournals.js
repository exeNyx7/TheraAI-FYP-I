import { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';

export function useJournals() {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJournals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/journals');
      const data = res.data;
      setJournals(Array.isArray(data) ? data : data.journals || []);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load journals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  const createJournal = useCallback(async (entry) => {
    const res = await apiClient.post('/journals', entry);
    await fetchJournals();
    return res.data;
  }, [fetchJournals]);

  const deleteJournal = useCallback(async (id) => {
    await apiClient.delete(`/journals/${id}`);
    setJournals((prev) => prev.filter((j) => (j._id || j.id) !== id));
  }, []);

  return { journals, loading, error, refetch: fetchJournals, createJournal, deleteJournal, setJournals };
}
