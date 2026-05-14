import React, { useState, useEffect } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Users, Search, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import apiClient from '../../apiClient';
import { useToast } from '../../contexts/ToastContext';

const PAGE_SIZE = 20;

const ROLE_COLORS = {
  patient: 'bg-blue-100 text-blue-700',
  psychiatrist: 'bg-purple-100 text-purple-700',
  therapist: 'bg-purple-100 text-purple-700',
  admin: 'bg-orange-100 text-orange-700',
};

export default function AdminUsersPage() {
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchUsers(); }, [page, roleFilter, statusFilter]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchUsers(); }, 400);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    apiClient.get('/admin/dashboard').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter !== '') params.is_active = statusFilter === 'active';
      const res = await apiClient.get('/admin/users', { params });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
    } catch {
      showError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (userId, currentActive) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/status`, { is_active: !currentActive });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentActive } : u));
      showSuccess(currentActive ? 'User deactivated' : 'User activated');
    } catch {
      showError('Failed to update status');
    }
  };

  const deleteUser = async (userId) => {
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setTotal(t => t - 1);
      setDeleteConfirm(null);
      showSuccess('User deleted');
    } catch {
      showError('Failed to delete user');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">

            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>User Management</h1>
              <p className="text-muted-foreground mt-1">Manage all platform users</p>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Total', value: stats.total_users, color: 'text-foreground' },
                  { label: 'Patients', value: stats.total_patients, color: 'text-blue-600' },
                  { label: 'Therapists', value: stats.total_psychiatrists, color: 'text-purple-600' },
                  { label: 'Admins', value: stats.total_admins, color: 'text-orange-600' },
                  { label: 'New (30d)', value: stats.new_users_this_month, color: 'text-green-600' },
                ].map(s => (
                  <Card key={s.label}>
                    <CardContent className="p-4 text-center">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

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
                    value={roleFilter}
                    onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                    className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Roles</option>
                    <option value="patient">Patient</option>
                    <option value="psychiatrist">Therapist</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
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
                ) : users.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No users found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Activity</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <React.Fragment key={u.id}>
                            <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-medium">{u.full_name || '—'}</td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                              <td className="px-4 py-3">
                                <Badge className={ROLE_COLORS[u.role] || 'bg-muted text-muted-foreground'}>
                                  {u.role}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => toggleStatus(u.id, u.is_active)}
                                  title={u.is_active ? 'Click to deactivate' : 'Click to activate'}
                                  className={`px-2 py-0.5 text-xs rounded-full font-medium transition-colors ${
                                    u.is_active
                                      ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                                      : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'
                                  }`}
                                >
                                  {u.is_active ? 'Active' : 'Inactive'}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {u.journal_count}J · {u.chat_count}C
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    title={expandedId === u.id ? 'Hide details' : 'View details'}
                                    onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                  >
                                    {expandedId === u.id
                                      ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                      : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                  </button>
                                  <button
                                    title="Delete user"
                                    onClick={() => setDeleteConfirm(u.id)}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expandedId === u.id && (
                              <tr className="bg-muted/20 border-b border-border">
                                <td colSpan={7} className="px-6 py-4">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground text-xs mb-0.5">Last Login</p>
                                      <p className="font-medium">
                                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground text-xs mb-0.5">Journal Entries</p>
                                      <p className="font-medium">{u.journal_count}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground text-xs mb-0.5">Chat Messages</p>
                                      <p className="font-medium">{u.chat_count}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground text-xs mb-0.5">User ID</p>
                                      <p className="font-mono text-xs text-muted-foreground truncate">{u.id}</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
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

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full">
            <CardHeader>
              <CardTitle className="text-destructive">Delete User?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will permanently delete the user and all their data. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => deleteUser(deleteConfirm)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
