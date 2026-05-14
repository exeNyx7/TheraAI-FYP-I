import { useState, useEffect } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Calendar } from 'lucide-react';
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

export default function AdminAppointmentsPage() {
  const { showError } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rangeFilter, setRangeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { fetchAppointments(); }, [page, rangeFilter, statusFilter, paymentFilter]);

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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const upcoming = appointments.filter(a => a.status === 'scheduled').length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;
  const revenue = appointments.reduce((sum, a) => sum + (a.session_fee_pkr || 0), 0);

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">

            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>All Appointments</h1>
              <p className="text-muted-foreground mt-1">Platform-wide appointment overview</p>
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
    </div>
  );
}
