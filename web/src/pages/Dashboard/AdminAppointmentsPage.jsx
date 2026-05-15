import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Calendar, X, Loader2, Gift } from 'lucide-react';
import apiClient from '../../apiClient';
import { useToast } from '../../contexts/ToastContext';

const PAGE_SIZE = 20;

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-700',
};

const PAYMENT_COLORS = {
  free: 'bg-slate-100 text-slate-700',
  subscription_deducted: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
};

const EMPTY_BOOK = { patient_id: '', therapist_id: '', scheduled_at: '', duration_minutes: 50 };
const EMPTY_GRANT = { patient_id: '', sessions_to_grant: 1 };

export default function AdminAppointmentsPage() {
  const { showSuccess, showError } = useToast();
  const [searchParams] = useSearchParams();

  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rangeFilter, setRangeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal state
  const [showBookModal, setShowBookModal] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [patients, setPatients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [bookForm, setBookForm] = useState(EMPTY_BOOK);
  const [grantForm, setGrantForm] = useState(EMPTY_GRANT);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchAppointments(); }, [page, rangeFilter, statusFilter, paymentFilter]);

  // Auto-open booking modal if ?patient= is in the URL
  useEffect(() => {
    const patientId = searchParams.get('patient');
    if (patientId) {
      setBookForm(f => ({ ...f, patient_id: patientId }));
      setShowBookModal(true);
    }
  }, [searchParams]);

  // Load patients + therapists when a modal opens
  useEffect(() => {
    if (showBookModal || showGrantModal) loadPatientsAndTherapists();
  }, [showBookModal, showGrantModal]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (rangeFilter) params.range = rangeFilter;
      if (statusFilter) params.status = statusFilter;
      if (paymentFilter) params.payment_status = paymentFilter;
      const res = await apiClient.get('/admin/appointments', { params });
      setAppointments(res.data.appointments || []);
      setTotal(res.data.total || 0);
    } catch {
      showError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientsAndTherapists = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        apiClient.get('/admin/users', { params: { role: 'patient', page_size: 100 } }),
        apiClient.get('/admin/users', { params: { role: 'psychiatrist', page_size: 100 } }),
      ]);
      setPatients(pRes.data.users || []);
      setTherapists(tRes.data.users || []);
    } catch {
      showError('Failed to load users for dropdowns.');
    }
  };

  const handleBookAppointment = async () => {
    if (!bookForm.patient_id || !bookForm.therapist_id || !bookForm.scheduled_at) {
      showError('Please fill in all required fields.');
      return;
    }
    setActionLoading(true);
    try {
      await apiClient.post('/admin/appointments', {
        patient_id: bookForm.patient_id,
        therapist_id: bookForm.therapist_id,
        scheduled_at: new Date(bookForm.scheduled_at).toISOString(),
        duration_minutes: Number(bookForm.duration_minutes),
      });
      showSuccess('Appointment booked! Patient has been notified.');
      setShowBookModal(false);
      setBookForm(EMPTY_BOOK);
      fetchAppointments();
    } catch (err) {
      showError(err?.response?.data?.detail || 'Failed to book appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGrantSession = async () => {
    if (!grantForm.patient_id) {
      showError('Please select a patient.');
      return;
    }
    setActionLoading(true);
    try {
      await apiClient.post(`/admin/users/${grantForm.patient_id}/grant-free-session`, {
        sessions_to_grant: Number(grantForm.sessions_to_grant),
      });
      showSuccess('Free session granted! Patient has been notified by notification and email.');
      setShowGrantModal(false);
      setGrantForm(EMPTY_GRANT);
    } catch (err) {
      showError(err?.response?.data?.detail || 'Failed to grant free session.');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const upcoming = appointments.filter(a => a.status === 'scheduled').length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;
  const revenue = appointments.reduce((sum, a) => sum + (a.session_fee_pkr || 0), 0);

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 pt-16 lg:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>All Appointments</h1>
                <p className="text-muted-foreground mt-1">Platform-wide appointment overview</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowGrantModal(true)}>
                  <Gift className="h-4 w-4" /> Grant Free Session
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => setShowBookModal(true)}>
                  <Calendar className="h-4 w-4" /> Book Appointment
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Total', value: total, color: 'text-foreground' },
                { label: 'Upcoming', value: upcoming, color: 'text-blue-600' },
                { label: 'Completed', value: completed, color: 'text-green-600' },
                { label: 'Cancelled', value: cancelled, color: 'text-red-500' },
                { label: 'Revenue (PKR)', value: revenue.toLocaleString('en-PK'), color: 'text-primary' },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  <select
                    value={rangeFilter}
                    onChange={e => { setRangeFilter(e.target.value); setPage(1); }}
                    className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select
                    value={paymentFilter}
                    onChange={e => { setPaymentFilter(e.target.value); setPage(1); }}
                    className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Payments</option>
                    <option value="free">Free</option>
                    <option value="subscription_deducted">Subscription</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : appointments.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No appointments found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Therapist</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date & Time</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Duration</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Fee (PKR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map(a => (
                          <tr key={a.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium">{a.patient_name || '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{a.therapist_name || '—'}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {a.scheduled_at ? new Date(a.scheduled_at).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{a.duration_minutes} min</td>
                            <td className="px-4 py-3">
                              <Badge className={STATUS_COLORS[a.status] || 'bg-muted text-muted-foreground'}>
                                {a.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={PAYMENT_COLORS[a.payment_status] || 'bg-muted text-muted-foreground'}>
                                {a.payment_status === 'subscription_deducted' ? 'plan' : a.payment_status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {a.session_fee_pkr > 0 ? a.session_fee_pkr.toLocaleString('en-PK') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </main>

      {/* ── Book Appointment Modal ── */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-lg font-bold">Book Appointment for Patient</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Patient will be notified via app and email</p>
              </div>
              <button onClick={() => { setShowBookModal(false); setBookForm(EMPTY_BOOK); }} className="p-1 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Patient <span className="text-destructive">*</span></label>
                <select
                  value={bookForm.patient_id}
                  onChange={e => setBookForm(f => ({ ...f, patient_id: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select patient…</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} — {p.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Therapist <span className="text-destructive">*</span></label>
                <select
                  value={bookForm.therapist_id}
                  onChange={e => setBookForm(f => ({ ...f, therapist_id: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select therapist…</option>
                  {therapists.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Date & Time (local) <span className="text-destructive">*</span></label>
                <input
                  type="datetime-local"
                  value={bookForm.scheduled_at}
                  onChange={e => setBookForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Session Duration</label>
                <select
                  value={bookForm.duration_minutes}
                  onChange={e => setBookForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value={25}>25 minutes</option>
                  <option value={50}>50 minutes</option>
                  <option value={80}>80 minutes</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                This session will be marked as <strong>free</strong>. The patient will receive an in-app notification and a confirmation email.
              </p>
            </div>
            <div className="flex gap-3 p-6 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => { setShowBookModal(false); setBookForm(EMPTY_BOOK); }}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleBookAppointment}
                disabled={actionLoading || !bookForm.patient_id || !bookForm.therapist_id || !bookForm.scheduled_at}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                Book Appointment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Grant Free Session Modal ── */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-lg font-bold">Grant Free Session</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Patient will be notified immediately</p>
              </div>
              <button onClick={() => { setShowGrantModal(false); setGrantForm(EMPTY_GRANT); }} className="p-1 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Patient <span className="text-destructive">*</span></label>
                <select
                  value={grantForm.patient_id}
                  onChange={e => setGrantForm(f => ({ ...f, patient_id: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select patient…</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} — {p.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Number of Free Sessions</label>
                <select
                  value={grantForm.sessions_to_grant}
                  onChange={e => setGrantForm(f => ({ ...f, sessions_to_grant: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {[1, 2, 3, 5].map(n => (
                    <option key={n} value={n}>{n} session{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                The patient will receive an <strong>in-app notification</strong> and <strong>email</strong> confirming their free session credit.
              </p>
            </div>
            <div className="flex gap-3 p-6 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => { setShowGrantModal(false); setGrantForm(EMPTY_GRANT); }}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleGrantSession}
                disabled={actionLoading || !grantForm.patient_id}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                Grant Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
