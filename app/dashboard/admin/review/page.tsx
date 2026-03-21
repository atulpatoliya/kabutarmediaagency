"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, IndianRupee, Clock, Search, MapPin, AlignLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabaseClient';

export default function AdminReviewDashboard() {
  const [pendingNews, setPendingNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function checkAdminAccess() {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (data?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      setIsAuthorized(true);
    }
    checkAdminAccess();
  }, [supabase, router]);

  const fetchPendingNews = async () => {
    setIsLoading(true);
    try {
      // Due to the admin RLS policy, simply querying all news where status is pending works.
      const { data, error } = await supabase
        .from('news')
        .select(`
          *,
          users:reporter_id (
            reporter_profiles (
              full_name,
              phone
            )
          ),
          categories:category_id (
            name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching admin news:", error);
      } else if (data) {
        setPendingNews(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase || !isAuthorized) return;
    fetchPendingNews();
  }, [supabase, isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Supabase is not configured.</p>
        </div>
      </div>
    );
  }

  const handleUpdateStatus = async (newsId: string, newStatus: string) => {
    setActionLoading(newsId);
    try {
      const { error } = await supabase
        .from('news')
        .update({ status: newStatus })
        .eq('id', newsId);

      if (error) {
        alert(`Failed to ${newStatus} the story. Please try again.`);
        console.error(error);
      } else {
        // Remove from the list or refetch
        setPendingNews((prev) => prev.filter(item => item.id !== newsId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredNews = pendingNews.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.city && item.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Review Panel</h1>
          <p className="text-gray-600 mt-1">Review, approve, or reject news submissions from reporters.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              type="text" 
              placeholder="Search by title or city..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-gray-500">Scanning for new submissions...</p>
          </CardContent>
        </Card>
      ) : filteredNews.length > 0 ? (
        <div className="grid gap-6">
          {filteredNews.map((item) => (
            <Card key={item.id} className="overflow-hidden border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                         <Clock className="w-3 h-3" /> Pending Review
                       </span>
                       <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                         {item.categories?.name || 'General'}
                       </span>
                    </div>
                    <CardTitle className="text-xl leading-tight text-gray-900">{item.title}</CardTitle>
                    <CardDescription className="mt-2 text-gray-600">
                      Submitted on {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500">Reporter Asking Price</p>
                    <p className="text-2xl font-bold text-gray-900 flex items-center justify-end gap-1">
                      <IndianRupee className="w-5 h-5"/> {item.reporter_price}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Story Details */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                        <AlignLeft className="w-4 h-4 text-gray-500" /> Short Description
                      </h4>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{item.description}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Full Story Content</h4>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap line-clamp-4">{item.content}</p>
                      <Button variant="link" className="px-0 h-auto font-medium text-primary mt-2">Read Full Source Content</Button>
                    </div>
                  </div>
                  
                  {/* Meta Details & Actions */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Location Data</h4>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <MapPin className="w-4 h-4 text-red-500" />
                        {item.city}, {item.state}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reporter Identity</h4>
                      {/* Note: Email is managed securely in auth.users and not exposed directly here */}
                      <p className="text-sm font-medium text-gray-900">{item.users?.reporter_profiles?.[0]?.full_name || 'Verification Pending'}</p>
                      <p className="text-xs text-gray-600">{item.users?.reporter_profiles?.[0]?.phone || 'No phone attached'}</p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Button 
                        onClick={() => handleUpdateStatus(item.id, 'published')}
                        disabled={actionLoading === item.id}
                        className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm font-semibold h-11"
                      >
                        {actionLoading === item.id ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5" />}
                        Approve & Publish Now
                      </Button>
                      <Button 
                        onClick={() => handleUpdateStatus(item.id, 'rejected')}
                        disabled={actionLoading === item.id}
                        variant="outline"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 gap-2 h-11"
                      >
                        {actionLoading === item.id ? <Loader2 className="w-5 h-5 animate-spin"/> : <XCircle className="w-5 h-5" />}
                        Reject Story
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">You're All Caught Up!</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              There are currently no pending news stories awaiting master admin review. When reporters submit new stories, they will appear right here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
