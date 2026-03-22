"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { PlusCircle, Search, Filter, Loader2, IndianRupee, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabaseClient';

const MASTER_ADMIN_EMAIL = (process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || 'directoratulpatoliya@gmail.com').toLowerCase();

export default function MyNews() {
  const [searchTerm, setSearchTerm] = useState('');
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canSubmitNews, setCanSubmitNews] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchNews() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role || '';
      const hasNewsPermission = role === 'reporter' || role === 'both' || role === 'admin' || (user.email || '').toLowerCase() === MASTER_ADMIN_EMAIL;
      setCanSubmitNews(hasNewsPermission);

      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNews(data);
      }
      setIsLoading(false);
    }

    fetchNews();
  }, [supabase]);

  const filteredNews = news.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'sold': return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-700';
      case 'sold': return 'bg-blue-100 text-blue-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My News Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage all your submitted and published news stories here</p>
        </div>
        {canSubmitNews ? (
          <Link href="/dashboard/news/create" className={buttonVariants({ className: "bg-primary hover:bg-primary/90 text-white gap-2" })}>
            <PlusCircle className="h-4 w-4" />
            Submit New Story
          </Link>
        ) : (
          <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            News submission is available for reporter/both roles only.
          </span>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              type="text" 
              placeholder="Search news title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4" />
            Filter Status
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-gray-500">Loading your stories...</p>
          </CardContent>
        </Card>
      ) : filteredNews.length > 0 ? (
        <div className="grid gap-4">
          {filteredNews.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg text-gray-900">{item.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      <span className="capitalize">{item.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1 mb-3">{item.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />
                      {item.reporter_price}
                    </span>
                    <span>{item.city}, {item.state}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="secondary" size="sm">View</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <PlusCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No News Stories Found</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              You haven't submitted any news stories yet, or none match your search criteria.
            </p>
                {canSubmitNews ? (
                  <Link href="/dashboard/news/create" className={buttonVariants({ className: "bg-primary hover:bg-primary/90 text-white gap-2" })}>
                    <PlusCircle className="h-4 w-4" />
                    Submit Your First Story
                  </Link>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Your account can browse stories here, but only reporter/both roles can submit new news.
                  </p>
                )}
              </CardContent>
            </Card>
      )}
    </div>
  );
}
