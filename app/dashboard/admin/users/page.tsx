"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, CheckCircle, XCircle, Loader2, Users } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

export default function AdminUsersDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const supabase = createClient();

  // Fetch all users
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          role,
          status,
          created_at,
          reporter_profiles (
            full_name,
            phone,
            city,
            id_proof_url
          )
        `)
        .neq('role', 'admin') // Exclude master admins from the review list
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
      } else if (data) {
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [supabase]);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) {
        alert(`Failed to ${newStatus} the user. Please try again.`);
        console.error(error);
      } else {
        // Update local state directly instead of full refetch
        setUsers((prev) => 
          prev.map(u => u.id === userId ? { ...u, status: newStatus } : u)
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management Panel</h1>
          <p className="text-gray-600 mt-1">Approve, reject, and manage Reporters and Buyers on the platform.</p>
        </div>
      </div>

      {isLoading ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-gray-500">Loading user database...</p>
          </CardContent>
        </Card>
      ) : users.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-700">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900">User Profile</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Role & Type</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Joined Date</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-center">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const profile = user.reporter_profiles?.[0] || {};
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{profile.full_name || 'No Name Provided'}</div>
                        <div className="text-gray-500 text-xs mt-1">ID: {user.id.substring(0, 8)}...</div>
                        {profile.phone && <div className="text-gray-500 text-xs">Phone: {profile.phone}</div>}
                        {profile.city && <div className="text-gray-500 text-xs">City: {profile.city}</div>}
                      </td>
                      <td className="px-6 py-4 capitalize">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                          user.role === 'reporter' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 capitalize">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          user.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          user.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {user.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {user.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {user.status !== 'approved' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleUpdateStatus(user.id, 'approved')}
                              disabled={actionLoading === user.id}
                              className="bg-green-600 hover:bg-green-700 text-white shadow-none"
                            >
                              {actionLoading === user.id ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Approve'}
                            </Button>
                          )}
                          
                          {user.status !== 'rejected' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUpdateStatus(user.id, 'rejected')}
                              disabled={actionLoading === user.id}
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                            >
                              {actionLoading === user.id ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Reject'}
                            </Button>
                          )}
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
          <CardContent className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Users Found</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              There are currently no registered buyers or reporters on the platform.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
