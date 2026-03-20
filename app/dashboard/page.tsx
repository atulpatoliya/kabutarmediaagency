"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, Eye, TrendingUp, IndianRupee, Clock, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

const statusColors: Record<string, string> = {
  sold: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  published: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const [stats, setStats] = useState([
    { label: 'Published Stories', value: '0', icon: Newspaper, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Earnings', value: '?0', icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Views', value: '0', icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Pending Review', value: '0', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  if (!supabase) {
    return <div className="p-6 text-sm text-gray-500">Supabase not configured.</div>;
  }

  useEffect(() => {
    async function fetchDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newsData } = await supabase
        .from('news')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });

      if (newsData) {
        setRecentActivity(newsData.slice(0, 5));

        const published = newsData.filter((n: any) => n.status === 'published').length;
        const pending = newsData.filter((n: any) => n.status === 'pending').length;
        const totalViews = newsData.reduce((sum: number, n: any) => sum + (n.views_count || 0), 0);
        const earned = newsData
          .filter((n: any) => n.status === 'sold')
          .reduce((sum: number, n: any) => sum + Number(n.reporter_price || 0), 0);

        setStats([
          { label: 'Published Stories', value: String(published), icon: Newspaper, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Earnings', value: `?${earned.toLocaleString()}`, icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Views', value: String(totalViews), icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Pending Review', value: String(pending), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ]);
      }
      setIsLoading(false);
    }

    fetchDashboardData();
  }, [supabase]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 text-sm mt-1">Welcome back! Here&apos;s what&apos;s happening.</p>
      </div>

      {isLoading ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-gray-500">Loading your dashboard...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.label} className="bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">{stat.label}</span>
                    <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p>No activity yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors px-2 -mx-2 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{new Date(item.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-gray-900">?{item.reporter_price}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[item.status] || 'bg-gray-100 text-gray-600'}`}>
                          {String(item.status || '').replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}