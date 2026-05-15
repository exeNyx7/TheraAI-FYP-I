import { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';

export function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/appointments');
      setAppointments(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const cancelAppointment = useCallback(async (id) => {
    await apiClient.put(`/appointments/${id}/cancel`);
    setAppointments((prev) =>
      prev.map((a) => (a.id || a._id) === id ? { ...a, status: 'cancelled' } : a)
    );
  }, []);

  return { appointments, loading, error, refetch: fetchAppointments, cancelAppointment, setAppointments };
}
