"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { PlusCircle, Search, Filter, Loader2, IndianRupee, Clock, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabaseClient';

const MASTER_ADMIN_EMAIL = (process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || 'directoratulpatoliya@gmail.com').toLowerCase();

type StoryStatus = 'pending' | 'published' | 'sold' | 'rejected';
type StatusFilter = 'all' | StoryStatus;

type Story = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  reporter_price: number;
  city: string;
  state: string;
  status: StoryStatus;
  reporter_id?: string;
  users?: {
    id: string;
    full_name: string;
    email: string;
  };
};

export default function MyNews() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [news, setNews] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [canSubmitNews, setCanSubmitNews] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchNews() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setUserEmail(user.email || '');

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role || '';
      setUserRole(role);
      const hasNewsPermission = role === 'reporter' || role === 'both' || role === 'admin' || (user.email || '').toLowerCase() === MASTER_ADMIN_EMAIL;
      setCanSubmitNews(hasNewsPermission);

      // Check if user is Master Admin
      const isMasterAdmin = (user.email || '').toLowerCase() === MASTER_ADMIN_EMAIL || role === 'admin';

      try {
        let query = supabase.from('news').select('*');
        
        // Master Admin sees all news, Reporter sees only their own
        if (!isMasterAdmin) {
          query = query.eq('reporter_id', user.id);
        }
        
        const { data: newsData, error: newsError } = await query.order('created_at', { ascending: false });

        if (newsError) {
          console.error('Error fetching news:', newsError);
          setIsLoading(false);
          return;
        }

        console.log('Fetched news data:', newsData, 'isMasterAdmin:', isMasterAdmin);

        // Now fetch reporter details for each news item
        if (newsData && newsData.length > 0) {
          const newsWithReporters = await Promise.all(
            newsData.map(async (newsItem: any) => {
              if (isMasterAdmin && newsItem.reporter_id) {
                try {
                  // પહેલા reporter_profiles થી full_name લાવ
                  const { data: reporterProfile } = await supabase
                    .from('reporter_profiles')
                    .select('full_name')
                    .eq('user_id', newsItem.reporter_id);
                  
                  let fullName = reporterProfile && reporterProfile.length > 0 
                    ? reporterProfile[0].full_name 
                    : null;
                  
                  // અને auth.users થી email પણ લાવ
                  const { data: authUser } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', newsItem.reporter_id)
                    .single();
                  
                  // જો reporter profile નથી તો email use કર
                  if (!fullName && authUser) {
                    fullName = authUser.email || newsItem.reporter_id.substring(0, 8) + '...';
                  }
                  
                  if (!fullName) {
                    fullName = newsItem.reporter_id.substring(0, 8) + '...';
                  }
                  
                  console.log(`Reporter ${newsItem.reporter_id}: ${fullName}`);
                  
                  return {
                    ...newsItem,
                    users: {
                      id: newsItem.reporter_id,
                      full_name: fullName,
                      email: ''
                    }
                  };
                } catch (err) {
                  console.error(`Exception: ${err}`);
                  return {
                    ...newsItem,
                    users: {
                      id: newsItem.reporter_id,
                      full_name: newsItem.reporter_id.substring(0, 8) + '...',
                      email: ''
                    }
                  };
                }
              }
              return newsItem;
            })
          );
          setNews(newsWithReporters as Story[]);
        } else {
          setNews([]);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
      }
      
      setIsLoading(false);
    }

    fetchNews();
  }, [supabase]);

  const filteredNews = news.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteStory = async (storyId: string, status: StoryStatus) => {
    if (status !== 'pending' && status !== 'rejected') {
      alert('Only pending or rejected stories can be deleted.');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this story? This cannot be undone.');
    if (!confirmed) return;

    setDeletingId(storyId);
    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', storyId)
      .eq('reporter_id', userId);

    if (error) {
      alert('Failed to delete story. Please try again.');
      setDeletingId(null);
      return;
    }

    setNews((prev) => prev.filter((item) => item.id !== storyId));
    setDeletingId(null);
  };

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

  // Dynamic dashboard content based on role
  const isMasterAdmin = userEmail.toLowerCase() === MASTER_ADMIN_EMAIL || userRole === 'admin';
  const dashboardTitle = isMasterAdmin ? 'All News Dashboard' : 'My News Dashboard';
  const dashboardSubtitle = isMasterAdmin 
    ? 'Manage all submitted and published news stories here' 
    : 'Manage all your submitted and published news stories here';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{dashboardTitle}</h1>
          <p className="text-gray-600 mt-1">{dashboardSubtitle}</p>
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
          <div className="relative w-full sm:w-auto">
            <Filter className="h-4 w-4" />
            <select
              title="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ml-2"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="published">Published</option>
              <option value="sold">Sold</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
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
                  {isMasterAdmin && item.users && (
                    <div className="text-xs text-gray-600 mb-3 font-medium">
                      Reporter: <span className="text-gray-900 font-semibold">{item.users.full_name}</span> | Reporter ID: <span className="text-gray-900 font-semibold">{item.reporter_id}</span> | News ID: <span className="text-gray-900 font-semibold">{item.id}</span>
                    </div>
                  )}
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
                  {item.status === 'pending' || item.status === 'rejected' ? (
                    <Link href={`/dashboard/news/${item.id}/edit`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled title="Only pending/rejected stories can be edited">Edit</Button>
                  )}
                  <Link href={`/dashboard/news/${item.id}`}>
                    <Button variant="secondary" size="sm">View</Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingId === item.id || (item.status !== 'pending' && item.status !== 'rejected')}
                    onClick={() => handleDeleteStory(item.id, item.status)}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    title={item.status === 'pending' || item.status === 'rejected' ? 'Delete story' : 'Only pending/rejected stories can be deleted'}
                  >
                    {deletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
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
              {isMasterAdmin
                ? 'No news stories found for the selected filters.'
                : "You haven't submitted any news stories yet, or none match your search criteria."}
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
