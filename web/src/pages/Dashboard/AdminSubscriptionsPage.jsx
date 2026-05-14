import { useState, useEffect } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { CreditCard, Search } from 'lucide-react';
import apiClient from '../../apiClient';
import { useToast } from '../../contexts/ToastContext';

const PAGE_SIZE = 20;

const TIER_COLORS = {
  free: 'bg-slate-100 text-slate-700',
  starter: 'bg-blue-100 text-blue-700',
  professional: 'bg-purple-100 text-purple-700',
  intensive: 'bg-violet-100 text-violet-700',
};

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  cancelling: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-red-100 text-red-700',
};

export default function AdminSubscriptionsPage() {
  const { showSuccess, showError } = useToast();
  const [subs, setSubs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editSessions, setEditSessions] = useState({});

  useEffect(() => { fetchSubs(); }, [page, tierFilter, statusFilter]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchSubs(); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSubs = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (tierFilter) params.tier = tierFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/admin/subscriptions', { params });
      setSubs(res.data.subscriptions || []);
      setTotal(res.data.total || 0);
    } catch {
      showError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const saveSessionsOverride = async (uid) => {
    const val = parseInt(editSessions[uid], 10);
    if (isNaN(val) || val < 0) return;
    try {
      await apiClient.patch(`/admin/subscriptions/${uid}`, { sessions_remaining: val });
      setSubs(prev => prev.map(s => s.id === uid ? { ...s, sessions_remaining: val } : s));
      setEditSessions(prev => { const n = { ...prev }; delete n[uid]; return n; });
      showSuccess('Sessions updated');
    } catch {
      showError('Failed to update sessions');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeCount = subs.filter(s => s.subscription_status === 'active').length;
  const paidTiers = subs.filter(s => s.subscription_tier !== 'free').length;

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">

            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>Subscriptions</h1>
              <p className="text-muted-foreground mt-1">Overview of all patient subscription plans</p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Total Patients', value: total, color: 'text-foreground' },
                { label: 'Active Plans', value: activeCount, color: 'text-green-600' },
                { label: 'Paid Tiers', value: paidTiers, color: 'text-primary' },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <select
                    value={tierFilter}
                    onChange={e => { setTierFilter(e.target.value); setPage(1); }}
                    className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Tiers</option>
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="intensive">Intensive</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="cancelling">Cancelling</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : subs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No subscriptions found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sessions Left</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Used Total</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Override</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subs.map(s => (
                          <tr key={s.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium">{s.full_name || '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">{s.email}</td>
                            <td className="px-4 py-3">
                              <Badge className={TIER_COLORS[s.subscription_tier] || 'bg-muted text-muted-foreground'}>
                                {s.subscription_tier}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={STATUS_COLORS[s.subscription_status] || 'bg-muted text-muted-foreground'}>
                                {s.subscription_status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-semibold text-primary">{s.sessions_remaining}</td>
                            <td className="px-4 py-3 text-muted-foreground">{s.sessions_used_total}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={editSessions[s.id] !== undefined ? editSessions[s.id] : s.sessions_remaining}
                                  onChange={e => setEditSessions(prev => ({ ...prev, [s.id]: e.target.value }))}
                                  className="w-14 border border-border rounded px-1.5 py-0.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                {editSessions[s.id] !== undefined && String(editSessions[s.id]) !== String(s.sessions_remaining) && (
                                  <Button size="sm" className="h-6 px-2 text-xs" onClick={() => saveSessionsOverride(s.id)}>
                                    Save
                                  </Button>
                                )}
                              </div>
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
