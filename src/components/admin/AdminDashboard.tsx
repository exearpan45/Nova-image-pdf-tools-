import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Search,
  RefreshCw,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle,
  X,
  Calendar,
  Clock,
  Activity,
  ChevronDown,
  Eye,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SafeUser, AdminStats, AuditLog } from '../../types/auth';

export const AdminDashboard: React.FC = () => {
  const { user, isAdminViewOpen, setIsAdminViewOpen } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'email' | 'last_login_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Loading & Error
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals
  const [inspectUser, setInspectUser] = useState<SafeUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<SafeUser | null>(null);

  const getHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('nova_auth_bearer');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Stats
      const statsRes = await fetch('/api/admin/stats', {
        headers: getHeaders(),
        credentials: 'include',
      });
      if (statsRes.status === 403 || statsRes.status === 401) {
        setError('You are not authorized to access the administrator dashboard.');
        setIsLoading(false);
        return;
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch Users
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        role: roleFilter,
        sortBy,
        order: sortOrder,
      });

      const usersRes = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      // 3. Fetch Audit Logs
      const logsRes = await fetch('/api/admin/audit-logs', {
        headers: getHeaders(),
        credentials: 'include',
      });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs(logsData.logs || []);
      }
    } catch {
      setError('Failed to load administrator data. Please check connection.');
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, search, statusFilter, roleFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (isAdminViewOpen && user?.role === 'admin') {
      fetchData();
    }
  }, [isAdminViewOpen, user, fetchData]);

  if (!isAdminViewOpen) return null;

  // Authorization check guard
  if (!user || user.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl max-w-md w-full border border-rose-200 dark:border-rose-900 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            You do not have administrator permissions to view this control panel.
          </p>
          <button
            onClick={() => setIsAdminViewOpen(false)}
            className="mt-6 px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-sm font-semibold hover:bg-slate-800"
          >
            Back to Workspace
          </button>
        </div>
      </div>
    );
  }

  const handleToggleStatus = async (targetUser: SafeUser) => {
    const newStatus = targetUser.status === 'active' ? 'disabled' : 'active';
    setActionLoadingId(targetUser.id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update user status.');
      } else {
        setNotification(`User ${targetUser.email} has been ${newStatus}.`);
        setTimeout(() => setNotification(null), 3000);
        fetchData();
      }
    } catch {
      setError('Network error while updating user status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setActionLoadingId(userToDelete.id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete user.');
      } else {
        setNotification(`User ${userToDelete.email} was permanently deleted.`);
        setTimeout(() => setNotification(null), 3000);
        setUserToDelete(null);
        fetchData();
      }
    } catch {
      setError('Network error while deleting user.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return 'Never';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 animate-in fade-in duration-200">
      {/* Top Ambient RGB Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 via-pink-500 to-cyan-400" />

      {/* Main Admin Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAdminViewOpen(false)}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs transition"
              title="Return to NOVA Tools"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Administrator Dashboard
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Control Panel
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage registered user accounts, authentication security, and audit activity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs hover:border-indigo-400 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setIsAdminViewOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-700 transition"
            >
              Exit to Tools
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {notification && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{notification}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* KPI Overview Cards (Requirement 9) */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Users</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats?.totalUsers ?? '—'}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Registered accounts</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Active Users</span>
              <UserCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats?.activeUsers ?? '—'}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Normal account status</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Disabled</span>
              <UserX className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {stats?.disabledUsers ?? '—'}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Restricted accounts</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">New (7 Days)</span>
              <Calendar className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {stats?.recentRegistrations ?? '—'}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Recent signups</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Logins (7 Days)</span>
              <Activity className="w-4 h-4 text-pink-500" />
            </div>
            <div className="text-2xl font-black text-pink-600 dark:text-pink-400">
              {stats?.recentLogins ?? '—'}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Active sessions</span>
          </div>
        </div>

        {/* View Tabs */}
        <div className="mt-8 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'users'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              User Management ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'audit'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              Security Audit Logs ({auditLogs.length})
            </button>
          </div>
        </div>

        {/* TAB 1: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="mt-6 space-y-4">
            {/* Filter & Search Bar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="disabled">Disabled Only</option>
                </select>
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white font-medium"
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Sort:</span>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field as any);
                    setSortOrder(order as any);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white font-medium"
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="last_login_at-desc">Recent Login</option>
                </select>
              </div>
            </div>

            {/* Users Table (Requirement 10) */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Created Date</th>
                      <th className="py-3.5 px-4">Last Login</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                          No users matched your search criteria.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isSelf = u.id === user.id;
                        const isActionLoading = actionLoadingId === u.id;

                        return (
                          <tr
                            key={u.id}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition"
                          >
                            {/* Name & Email */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{u.name}</span>
                                    {isSelf && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                    {u.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                  u.role === 'admin'
                                    ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>

                            {/* Created */}
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                              {formatDate(u.created_at)}
                            </td>

                            {/* Last Login */}
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                              {formatDate(u.last_login_at)}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                                  u.status === 'active'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                />
                                {u.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Inspect */}
                                <button
                                  type="button"
                                  onClick={() => setInspectUser(u)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title="View Account Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {/* Toggle Status */}
                                <button
                                  type="button"
                                  disabled={isSelf || isActionLoading}
                                  onClick={() => handleToggleStatus(u)}
                                  className={`p-1.5 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${
                                    u.status === 'active'
                                      ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                      : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                  }`}
                                  title={
                                    isSelf
                                      ? 'Cannot disable own account'
                                      : u.status === 'active'
                                      ? 'Disable Account'
                                      : 'Enable Account'
                                  }
                                >
                                  {isActionLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : u.status === 'active' ? (
                                    <Lock className="w-3.5 h-3.5" />
                                  ) : (
                                    <Unlock className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  disabled={isSelf || isActionLoading}
                                  onClick={() => setUserToDelete(u)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                  title={isSelf ? 'Cannot delete own account' : 'Delete Account'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AUDIT LOGS (Requirement 25) */}
        {activeTab === 'audit' && (
          <div className="mt-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>Security Event Trail (Latest 100 entries)</span>
              <span className="text-[11px] font-normal text-slate-400">Server-recorded</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[600px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No audit logs recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {log.action}
                        </span>
                        {log.actor_email && (
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            by <span className="font-semibold text-slate-700 dark:text-slate-300">{log.actor_email}</span>
                          </span>
                        )}
                        {log.target_email && (
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            target: <span className="font-semibold text-slate-700 dark:text-slate-300">{log.target_email}</span>
                          </span>
                        )}
                      </div>
                      {log.details && (
                        <div className="text-[11px] text-slate-400">
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap self-end sm:self-auto">
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* INSPECT USER MODAL (Requirement 11) */}
      {inspectUser && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setInspectUser(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Account Details</h3>
              <button
                onClick={() => setInspectUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">User ID</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{inspectUser.id}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Name</span>
                <span className="font-semibold text-slate-900 dark:text-white">{inspectUser.name}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Email Address</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{inspectUser.email}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Role</span>
                  <span className="capitalize font-medium text-indigo-600 dark:text-indigo-400">
                    {inspectUser.role}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Status</span>
                  <span
                    className={`capitalize font-medium ${
                      inspectUser.status === 'active' ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {inspectUser.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Registered At</span>
                <span className="text-slate-700 dark:text-slate-300">{formatDate(inspectUser.created_at)}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Last Active</span>
                <span className="text-slate-700 dark:text-slate-300">{formatDate(inspectUser.last_login_at)}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL (Requirement 10) */}
      {userToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setUserToDelete(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/80 shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Delete User Account?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-800 dark:text-slate-200">{userToDelete.email}</strong>? This will
              revoke all sessions and delete their account profile immediately.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
              >
                Yes, Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
