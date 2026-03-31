import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Users, Activity, TrendingUp, AlertTriangle, UserPlus,
  BookOpen, MessageSquare, Calendar, ShieldAlert, Search,
  CheckCircle, XCircle, Trash2, Loader2, RefreshCw,
} from 'lucide-react';
import apiClient from '../../apiClient';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_COLORS = {
  patient: 'bg-green-500/10 text-green-600',
  psychiatrist: 'bg-purple-500/10 text-purple-600',
  admin: 'bg-blue-500/10 text-blue-600',
};

const SEVERITY_COLORS = {
  moderate: 'bg-yellow-500/20 text-yellow-700',
  high: 'bg-orange-500/20 text-orange-700',
  emergency: 'bg-red-500/20 text-red-700',
};

function StatCard({ label, value, icon: Icon, colorClass = 'text-primary', sub }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminDashboardV0() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [crisisEvents, setCrisisEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'admin') { navigate('/dashboard'); return; }
    fetchOverview();
  }, [user, navigate]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const [statsRes, crisisRes] = await Promise.all([
        apiClient.get('/admin/dashboard'),
        apiClient.get('/admin/crisis-events?limit=50'),
      ]);
      setStats(statsRes.data);
      setCrisisEvents(crisisRes.data || []);
    } catch {
      showError('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = useCallback(async (page = 1) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const res = await apiClient.get(`/admin/users?${params}`);
      setUsers(res.data.users || []);
      setUsersTotal(res.data.total || 0);
      setUsersPage(page);
    } catch {
      showError('Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  }, [search, roleFilter, showError]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers(1);
  }, [activeTab, fetchUsers]);

  const toggleStatus = async (userId, currentStatus) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/status`, { is_active: !currentStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      showSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'}.`);
    } catch {
      showError('Failed to update user status.');
    }
  };

  const deleteUser = async (userId, name) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setUsersTotal(prev => prev - 1);
      showSuccess('User deleted.');
    } catch {
      showError('Failed to delete user.');
    }
  };

  if (!user) return null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: `Users${usersTotal ? ` (${usersTotal})` : ''}` },
    { id: 'crisis', label: `Crisis Events${crisisEvents.length ? ` (${crisisEvents.length})` : ''}` },
  ];

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold font-sans">Admin Dashboard</h1>
                <p className="text-muted-foreground mt-1">Platform management &amp; oversight</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchOverview} className="gap-2 bg-transparent">
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <>
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <StatCard label="Total Users" value={stats?.total_users} icon={Users} />
                      <StatCard label="Patients" value={stats?.total_patients} icon={Activity} colorClass="text-green-500" />
                      <StatCard label="Psychiatrists" value={stats?.total_psychiatrists} icon={UserPlus} colorClass="text-purple-500" />
                      <StatCard
                        label="Monthly Growth"
                        value={`${(stats?.monthly_growth_pct ?? 0) >= 0 ? '+' : ''}${stats?.monthly_growth_pct ?? 0}%`}
                        icon={TrendingUp}
                        colorClass="text-orange-500"
                        sub={`${stats?.new_users_this_month ?? 0} new this month`}
                      />
                      <StatCard label="Journal Entries" value={stats?.total_journal_entries} icon={BookOpen} />
                      <StatCard label="Chat Messages" value={stats?.total_chat_messages} icon={MessageSquare} />
                      <StatCard label="Appointments" value={stats?.total_appointments} icon={Calendar} />
                      <StatCard
                        label="Crisis Events (30d)"
                        value={stats?.crisis_events_last_30d}
                        icon={ShieldAlert}
                        colorClass="text-red-500"
                      />
                    </div>

                    {crisisEvents.length > 0 && (
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                          <CardTitle className="text-base flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-4 w-4" /> Recent Crisis Events
                          </CardTitle>
                          <Button size="sm" variant="ghost" onClick={() => setActiveTab('crisis')} className="text-xs">
                            View all
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {crisisEvents.slice(0, 5).map(ev => (
                            <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_COLORS[ev.severity] || SEVERITY_COLORS.moderate}`}>
                                  {ev.severity}
                                </span>
                                <div>
                                  <p className="text-sm font-medium">{ev.patient_name}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-xs italic">"{ev.message_excerpt}"</p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground flex-shrink-0 ml-4">{ev.created_at?.slice(0, 10)}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── USERS TAB ── */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search name or email…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && fetchUsers(1)}
                      className="pl-9"
                    />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">All roles</option>
                    <option value="patient">Patient</option>
                    <option value="psychiatrist">Psychiatrist</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button onClick={() => fetchUsers(1)} className="gap-2">
                    <Search className="h-4 w-4" /> Search
                  </Button>
                </div>

                {usersLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <Card>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border bg-muted/40">
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Journals</th>
                                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Chats</th>
                                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                                <th className="px-4 py-3" />
                              </tr>
                            </thead>
                            <tbody>
                              {users.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="text-center text-muted-foreground py-12">No users found.</td>
                                </tr>
                              ) : users.map(u => (
                                <tr key={u.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="font-medium">{u.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{u.email}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[u.role] || ''}`}>
                                      {u.role}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground text-xs">{u.created_at?.slice(0, 10) || '—'}</td>
                                  <td className="px-4 py-3 text-center">{u.journal_count}</td>
                                  <td className="px-4 py-3 text-center">{u.chat_count}</td>
                                  <td className="px-4 py-3 text-center">
                                    {u.is_active
                                      ? <span className="text-xs text-green-600 font-medium">Active</span>
                                      : <span className="text-xs text-muted-foreground font-medium">Inactive</span>}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1 justify-end">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        title={u.is_active ? 'Deactivate' : 'Activate'}
                                        onClick={() => toggleStatus(u.id, u.is_active)}
                                      >
                                        {u.is_active
                                          ? <XCircle className="h-4 w-4 text-orange-500" />
                                          : <CheckCircle className="h-4 w-4 text-green-500" />}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                        title="Delete user"
                                        onClick={() => deleteUser(u.id, u.full_name)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    {usersTotal > PAGE_SIZE && (
                      <div className="flex items-center justify-between text-sm">
                        <p className="text-muted-foreground">
                          Showing {(usersPage - 1) * PAGE_SIZE + 1}–{Math.min(usersPage * PAGE_SIZE, usersTotal)} of {usersTotal}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={usersPage === 1} onClick={() => fetchUsers(usersPage - 1)} className="bg-transparent">Prev</Button>
                          <Button size="sm" variant="outline" disabled={usersPage * PAGE_SIZE >= usersTotal} onClick={() => fetchUsers(usersPage + 1)} className="bg-transparent">Next</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── CRISIS EVENTS TAB ── */}
            {activeTab === 'crisis' && (
              <div className="space-y-3">
                {crisisEvents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-16">No crisis events in the last 30 days.</div>
                ) : crisisEvents.map(ev => (
                  <Card key={ev.id} className="border-l-4 border-l-red-400">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${SEVERITY_COLORS[ev.severity] || SEVERITY_COLORS.moderate}`}>
                            {ev.severity?.toUpperCase()}
                          </span>
                          <div>
                            <p className="font-medium text-sm">{ev.patient_name}</p>
                            <p className="text-xs text-muted-foreground">{ev.patient_email}</p>
                            <p className="text-xs text-muted-foreground mt-2 italic">"{ev.message_excerpt}"</p>
                            {ev.keywords_matched?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {ev.keywords_matched.map(kw => (
                                  <span key={kw} className="text-[10px] bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full">{kw}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">{ev.created_at?.slice(0, 16).replace('T', ' ')}</p>
                          {ev.therapist_notified && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1 justify-end">
                              <CheckCircle className="h-3 w-3" /> Notified
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
