"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Users, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import Link from 'next/link';

type RoleTab = 'buyer' | 'reporter';
type StatusTab = 'approved' | 'rejected' | 'pending';

export default function AdminUsersDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleTab, setRoleTab] = useState<RoleTab>('buyer');
  const [statusTab, setStatusTab] = useState<StatusTab>('pending');

  const supabase = createClient();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) {
        console.error('Fetch error:', data.error);
      } else {
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [supabase]);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) {
        alert('Failed to update user status. Please try again.');
        console.error(error);
      } else {
        // Refetch to ensure we have latest data
        await fetchUsers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const buyersAll = users.filter(u => u.role === 'buyer');
  const reportersAll = users.filter(u => u.role === 'reporter');

  const currentAll = roleTab === 'buyer' ? buyersAll : reportersAll;
  const filtered = currentAll.filter(u => u.status === statusTab);

  const statusTabs: { key: StatusTab; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management Panel</h1>
          <p className="text-gray-600 mt-1">Manage Reporters and Buyers who have accounts on the platform.</p>
        </div>
        <Button 
          onClick={fetchUsers}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : '🔄'} Refresh
        </Button>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-3">
        {([
          { key: 'buyer', label: '🏢 Buyers', count: buyersAll.length },
          { key: 'reporter', label: '📰 Reporters', count: reportersAll.length },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setRoleTab(tab.key)}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all flex items-center gap-2 ${roleTab === tab.key
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-white text-gray-700 border-gray-200 hover:border-primary/40'
              }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 text-xs rounded-full font-bold ${roleTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Status sub-tabs */}
      <div className="flex gap-1.5 border-b border-gray-200">
        {statusTabs.map(tab => {
          const count = currentAll.filter(u => u.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2 ${statusTab === tab.key
                ? tab.key === 'approved' ? 'border-green-600 text-green-700'
                  : tab.key === 'rejected' ? 'border-red-600 text-red-700'
                    : 'border-amber-500 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.key === 'approved' && <CheckCircle className="w-3.5 h-3.5" />}
              {tab.key === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
              {tab.label}
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {isLoading ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-gray-500">Loading user database...</p>
          </CardContent>
        </Card>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                    <th className="px-6 py-4 font-semibold text-gray-900">User Identity</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Role</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Joined</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {filtered.map((user) => {
                    const profile = Array.isArray(user.reporter_profiles) ? user.reporter_profiles[0] : (user.reporter_profiles || {});
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/admin/users/${user.id}`} className="block hover:bg-gray-50 rounded p-1 -m-1 transition-colors">
                          <div className="font-medium text-gray-900 group-hover:text-primary">
                            {profile.full_name || user.metadata?.full_name || 'No Name Found'}
                          </div>
                          <div className="text-gray-500 text-xs mt-0.5 font-mono">ID: {user.id.substring(0, 8)}...</div>
                          {profile.phone && <div className="text-gray-400 text-xs mt-1">📞 {profile.phone}</div>}
                          {profile.city && <div className="text-gray-400 text-xs">📍 {profile.city}</div>}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold capitalize ${user.role === 'reporter' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${user.status === 'approved' ? 'bg-green-100 text-green-800' :
                          user.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                          {user.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                          {user.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {user.status !== 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(user.id, 'approved')}
                              disabled={actionLoading === user.id}
                              className="bg-green-600 hover:bg-green-700 text-white gap-1"
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
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-1"
                            >
                              {actionLoading === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                          <Link href={`/dashboard/admin/users/${user.id}`}>
                            <Button size="sm" variant="ghost" className="text-gray-600 hover:text-primary">
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
