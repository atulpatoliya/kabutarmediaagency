"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Loader2, Users, Eye, RefreshCw, Phone, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import Link from 'next/link';

type RoleTab = 'buyer' | 'reporter';
type StatusTab = 'approved' | 'rejected' | 'pending';
type SortBy = 'joined_desc' | 'joined_asc' | 'name_asc' | 'name_desc' | 'status_priority';

export default function AdminUsersDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleTab, setRoleTab] = useState<RoleTab>('buyer');
  const [statusTab, setStatusTab] = useState<StatusTab>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('joined_desc');

  const supabase = createClient();
  if (!supabase) {
    return <div className="p-6 text-sm text-gray-500">Supabase not configured.</div>;
  }

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        console.error('Fetch error:', data.error);
      } else {
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [supabase]);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    if (!supabase) return;
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);
      if (error) {
        console.error(error);
        alert('Failed to update user status. Please try again.');
      } else {
        await fetchUsers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const buyersAll = (Array.isArray(users) ? users : []).filter((u: any) => u && (u.role === 'buyer' || u.role === 'both'));
  const reportersAll = (Array.isArray(users) ? users : []).filter((u: any) => u && (u.role === 'reporter' || u.role === 'both'));

  const getUserDisplayData = (user: any) => {
    const profile = (Array.isArray(user?.reporter_profiles) && user.reporter_profiles.length > 0)
      ? user.reporter_profiles[0]
      : (user?.reporter_profiles || {} as any);
    return {
      profile,
      displayName: profile.full_name || user.metadata?.full_name || '',
      displayPhone: profile.phone || user.phone || user.application_phone || '',
      displayEmail: user.email || '',
      displayCity: profile.city || user.metadata?.city || '',
    };
  };

  const currentAll = roleTab === 'buyer' ? buyersAll : reportersAll;
  const statusFiltered = (Array.isArray(currentAll) ? currentAll : []).filter((u: any) => u && u.status === statusTab);

  const query = searchQuery.trim().toLowerCase();
  const fromDateStart = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const toDateEnd = toDate ? new Date(`${toDate}T23:59:59`) : null;

  const filtered = statusFiltered.filter((user: any) => {
    const { displayName, displayPhone, displayEmail, displayCity } = getUserDisplayData(user);
    const haystack = `${displayName} ${displayEmail} ${displayPhone} ${displayCity} ${user.id}`.toLowerCase();

    const matchesQuery = !query || haystack.includes(query);

    const createdAt = user.created_at ? new Date(user.created_at) : null;
    const matchesFrom = !fromDateStart || (createdAt && createdAt >= fromDateStart);
    const matchesTo = !toDateEnd || (createdAt && createdAt <= toDateEnd);

    return Boolean(matchesQuery && matchesFrom && matchesTo);
  });

  const statusRank: Record<string, number> = {
    pending: 0,
    approved: 1,
    rejected: 2,
  };

  const sortedUsers = [...filtered].sort((a: any, b: any) => {
    const aData = getUserDisplayData(a);
    const bData = getUserDisplayData(b);

    if (sortBy === 'name_asc') {
      return aData.displayName.localeCompare(bData.displayName, undefined, { sensitivity: 'base' });
    }

    if (sortBy === 'name_desc') {
      return bData.displayName.localeCompare(aData.displayName, undefined, { sensitivity: 'base' });
    }

    if (sortBy === 'joined_asc') {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    }

    if (sortBy === 'status_priority') {
      const aRank = statusRank[a.status] ?? 99;
      const bRank = statusRank[b.status] ?? 99;
      if (aRank !== bRank) return aRank - bRank;
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    }

    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setFromDate('');
    setToDate('');
    setSortBy('joined_desc');
  };

  const escapeCsvValue = (value: string) => {
    const safe = String(value ?? '');
    if (safe.includes('"') || safe.includes(',') || safe.includes('\n')) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  };

  const exportFilteredCsv = () => {
    if (!sortedUsers.length) return;

    const headers = ['name', 'email', 'phone', 'city', 'role', 'status', 'joined_date', 'user_id'];
    const rows = sortedUsers.map((user: any) => {
      const { displayName, displayPhone, displayEmail, displayCity } = getUserDisplayData(user);
      const joined = user.created_at ? new Date(user.created_at).toLocaleDateString() : '';
      return [
        displayName || 'No Name Found',
        displayEmail,
        displayPhone,
        displayCity,
        user.role || '',
        user.status || '',
        joined,
        user.id || '',
      ].map(escapeCsvValue).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${roleTab}-${statusTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statusTabs: { key: StatusTab; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const sortLabelMap: Record<SortBy, string> = {
    joined_desc: 'Joined: Newest First',
    joined_asc: 'Joined: Oldest First',
    name_asc: 'Name: A-Z',
    name_desc: 'Name: Z-A',
    status_priority: 'Status: Pending to Rejected',
  };

  const toggleSort = (field: 'name' | 'joined' | 'status') => {
    setSortBy((prev) => {
      if (field === 'name') {
        return prev === 'name_asc' ? 'name_desc' : 'name_asc';
      }
      if (field === 'joined') {
        return prev === 'joined_desc' ? 'joined_asc' : 'joined_desc';
      }
      return 'status_priority';
    });
  };

  const renderSortIcon = (field: 'name' | 'joined' | 'status') => {
    if (field === 'name') {
      if (sortBy === 'name_asc') return <ChevronUp className="h-3.5 w-3.5 text-gray-700" />;
      if (sortBy === 'name_desc') return <ChevronDown className="h-3.5 w-3.5 text-gray-700" />;
      return <ChevronUp className="h-3.5 w-3.5 text-gray-300" />;
    }

    if (field === 'joined') {
      if (sortBy === 'joined_asc') return <ChevronUp className="h-3.5 w-3.5 text-gray-700" />;
      if (sortBy === 'joined_desc') return <ChevronDown className="h-3.5 w-3.5 text-gray-700" />;
      return <ChevronUp className="h-3.5 w-3.5 text-gray-300" />;
    }

    if (sortBy === 'status_priority') return <ChevronDown className="h-3.5 w-3.5 text-gray-700" />;
    return <ChevronUp className="h-3.5 w-3.5 text-gray-300" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <section className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white via-slate-50 to-white px-4 py-4 shadow-sm ring-1 ring-gray-100 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">User Management Panel</h1>
            <p className="mt-1 text-gray-600">Manage reporters and buyers who have accounts on the platform.</p>
          </div>
          <Button onClick={fetchUsers} disabled={isLoading} className="bg-blue-600 text-white transition-colors hover:bg-blue-700">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        {([
          { key: 'buyer', label: 'Buyers', count: buyersAll.length },
          { key: 'reporter', label: 'Reporters', count: reportersAll.length },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setRoleTab(tab.key)}
            className={`flex items-center gap-2 rounded-xl border-2 px-6 py-2.5 text-sm font-semibold transition-all ${roleTab === tab.key
              ? 'border-primary bg-primary text-white shadow-sm'
              : 'border-gray-200 bg-white text-gray-700 hover:border-primary/40'
              }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 text-xs rounded-full font-bold ${roleTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-gray-200">
        {statusTabs.map(tab => {
          const count = currentAll.filter(u => u.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${statusTab === tab.key
                ? tab.key === 'approved' ? 'border-green-600 text-green-700'
                  : tab.key === 'rejected' ? 'border-red-600 text-red-700'
                    : 'border-amber-500 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.key === 'approved' && <CheckCircle className="w-3.5 h-3.5" />}
              {tab.key === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
              {tab.label}
              <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-gray-100 text-gray-600">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
        <span className="font-medium text-gray-700">Showing {sortedUsers.length} users</span>
        <span className="text-xs text-gray-500">Role: <span className="font-semibold capitalize text-gray-700">{roleTab}</span> | Status: <span className="font-semibold capitalize text-gray-700">{statusTab}</span> | Sort: <span className="font-semibold text-gray-700">{sortLabelMap[sortBy]}</span></span>
      </div>

      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto_auto] lg:items-end">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Search</p>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Name, email, phone, city, ID"
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">From</p>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">To</p>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sort</p>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700"
          >
            <option value="joined_desc">Joined: Newest First</option>
            <option value="joined_asc">Joined: Oldest First</option>
            <option value="name_asc">Name: A-Z</option>
            <option value="name_desc">Name: Z-A</option>
            <option value="status_priority">Status: Pending to Rejected</option>
          </select>
        </div>
        <Button variant="outline" className="h-10 transition-colors hover:bg-slate-100" onClick={clearFilters}>
          Clear
        </Button>
        <Button
          onClick={exportFilteredCsv}
          disabled={!sortedUsers.length}
          className="h-10 bg-blue-600 text-white transition-colors hover:bg-blue-700"
        >
          Export CSV
        </Button>
      </div>

      {sortedUsers.length > 0 ? (
        <div className="space-y-4">
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 shadow-sm lg:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-gray-900"
                      title="Sort by name"
                    >
                      User
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort('status')}
                      className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-gray-900"
                      title="Sort by status priority"
                    >
                      Status
                      {renderSortIcon('status')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort('joined')}
                      className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-gray-900"
                      title="Sort by joined date"
                    >
                      Joined
                      {renderSortIcon('joined')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user: any) => {
                  const { displayName, displayPhone, displayEmail, displayCity } = getUserDisplayData(user);
                  const requiredFields = user.role === 'reporter' || user.role === 'both'
                    ? [displayName, displayEmail, displayPhone, displayCity]
                    : [displayName, displayEmail, displayPhone];
                  const filledFields = requiredFields.filter((v: string) => String(v || '').trim().length > 0).length;
                  const isComplete = filledFields === requiredFields.length;
                  return (
                    <tr key={user.id} className="transition-colors hover:bg-gray-50/60">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/admin/users/${user.id}`} className="block -m-1 rounded p-1 transition-colors hover:bg-gray-50">
                          <div className="font-medium text-gray-900">
                            {displayName || 'No Name Found'}
                          </div>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {isComplete ? 'Profile Complete' : `Profile Incomplete (${filledFields}/${requiredFields.length})`}
                            </span>
                          </div>
                          <div className="text-gray-500 text-xs mt-0.5 font-mono">ID: {String(user.id).substring(0, 8)}...</div>
                          {displayPhone && <div className="mt-1 flex items-center gap-1 text-xs text-gray-400"><Phone className="h-3 w-3" /> {displayPhone}</div>}
                          {displayCity && <div className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="h-3 w-3" /> {displayCity}</div>}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold capitalize ${
                          user.role === 'reporter'
                            ? 'bg-blue-100 text-blue-800'
                            : user.role === 'both'
                              ? 'bg-violet-100 text-violet-800'
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${user.status === 'approved' ? 'bg-green-100 text-green-800' : user.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                          {user.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                          {user.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {user.status !== 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(user.id, 'approved')}
                              disabled={actionLoading === user.id}
                              className="gap-1 bg-green-600 text-white transition-colors hover:bg-green-700"
                            >
                              {actionLoading === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              Approve
                            </Button>
                          )}
                          {user.status !== 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(user.id, 'rejected')}
                              disabled={actionLoading === user.id}
                              className="gap-1 border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                            >
                              {actionLoading === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                          <Link href={`/dashboard/admin/users/${user.id}`}>
                            <Button size="sm" variant="ghost" className="text-gray-600 transition-colors hover:text-primary">
                              <Eye className="w-4 h-4 mr-1" /> View
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {sortedUsers.map((user: any) => {
              const { displayName, displayPhone, displayEmail, displayCity } = getUserDisplayData(user);
              const requiredFields = user.role === 'reporter' || user.role === 'both'
                ? [displayName, displayEmail, displayPhone, displayCity]
                : [displayName, displayEmail, displayPhone];
              const filledFields = requiredFields.filter((v: string) => String(v || '').trim().length > 0).length;
              const isComplete = filledFields === requiredFields.length;

              return (
                <Card key={user.id} className="border-gray-200 shadow-sm transition-shadow duration-200 hover:shadow-md">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{displayName || 'No Name Found'}</p>
                        <p className="mt-0.5 text-xs font-mono text-gray-500">ID: {String(user.id).substring(0, 8)}...</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${user.status === 'approved' ? 'bg-green-100 text-green-800' : user.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        {user.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                        {user.status === 'rejected' && <XCircle className="h-3 w-3" />}
                        {user.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        user.role === 'reporter'
                          ? 'bg-blue-100 text-blue-800'
                          : user.role === 'both'
                            ? 'bg-violet-100 text-violet-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isComplete ? 'Profile Complete' : `Profile Incomplete (${filledFields}/${requiredFields.length})`}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-gray-500">
                      {displayPhone ? <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {displayPhone}</p> : null}
                      {displayCity ? <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {displayCity}</p> : null}
                      <p>Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {user.status !== 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(user.id, 'approved')}
                          disabled={actionLoading === user.id}
                          className="gap-1 bg-green-600 text-white transition-colors hover:bg-green-700"
                        >
                          {actionLoading === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          Approve
                        </Button>
                      )}
                      {user.status !== 'rejected' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(user.id, 'rejected')}
                          disabled={actionLoading === user.id}
                          className="gap-1 border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                        >
                          {actionLoading === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                          Reject
                        </Button>
                      )}
                      <Link href={`/dashboard/admin/users/${user.id}`}>
                        <Button size="sm" variant="ghost" className="text-gray-600 transition-colors hover:text-primary">
                          <Eye className="mr-1 h-4 w-4" /> View
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-14 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Users className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No {roleTab}s with "{statusTab}" status</h3>
            <p className="text-gray-400 text-sm">Try switching the status tab or check back later.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}