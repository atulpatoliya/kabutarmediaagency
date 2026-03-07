"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Inbox, Mail, Phone, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

export default function AdminApplicationsDashboard() {
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const supabase = createClient();

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching applications:", error);
      } else if (data) {
        setApplications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [supabase]);

  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    setActionLoading(appId);
    try {
      const { error } = await supabase
        .from('platform_applications')
        .update({ status: newStatus })
        .eq('id', appId);

      if (error) {
        alert(`Failed to update application. Please try again.`);
        console.error(error);
      } else {
        setApplications((prev) => 
          prev.map(app => app.id === appId ? { ...app, status: newStatus } : app)
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
          <h1 className="text-2xl font-bold text-gray-900">Lead Applications Panel</h1>
          <p className="text-gray-600 mt-1">Review contact form submissions to onboard new Buyers and Reporters.</p>
        </div>
      </div>

      {isLoading ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-gray-500">Loading new applications...</p>
          </CardContent>
        </Card>
      ) : applications.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-700">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900">Applicant Details</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Requested Account Type</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Date Received</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-center">Status / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 mb-1 text-lg">{app.full_name}</div>
                      <div className="text-gray-600 flex items-center gap-2 mb-1">
                        <Mail className="w-3 h-3 text-gray-400" /> {app.email}
                      </div>
                      <div className="text-gray-600 flex items-center gap-2 mb-2">
                        <Phone className="w-3 h-3 text-gray-400" /> {app.phone}
                      </div>
                      <div className="text-gray-500 italic border-l-2 border-gray-200 pl-2 mt-2">
                         "{app.message}"
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                        app.type === 'reporter' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {app.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(app.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2 capitalize ${
                          app.status === 'contacted' ? 'bg-purple-100 text-purple-800' : 
                          app.status === 'archived' ? 'bg-gray-100 text-gray-800' : 
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {app.status}
                        </span>
                        
                        {app.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateStatus(app.id, 'contacted')}
                            disabled={actionLoading === app.id}
                            className="bg-white border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 w-full"
                          >
                            Mark as Contacted
                          </Button>
                        )}
                        
                        {app.status !== 'archived' && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleUpdateStatus(app.id, 'archived')}
                            disabled={actionLoading === app.id}
                            className="text-gray-500 hover:text-gray-700 w-full"
                          >
                            Archive
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Applications Yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Forms submitted by new buyers or reporters will appear here automatically.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
