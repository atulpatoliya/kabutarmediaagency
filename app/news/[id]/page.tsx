"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, Clock, IndianRupee, MapPin, Share2, ShieldCheck, FileCheck, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';

type NewsDetail = {
  id: string;
  title: string;
  description: string;
  content: string;
  city: string;
  state: string;
  reporter_price: number;
  views_count: number | null;
  created_at: string;
  categories?: {
    id: string;
    name: string;
    parent_id: string | null;
  } | {
    id: string;
    name: string;
    parent_id: string | null;
  }[] | null;
};

export default function NewsDetail() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const newsId = typeof params?.id === 'string' ? params.id : '';
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [newsItem, setNewsItem] = useState<NewsDetail | null>(null);

  useEffect(() => {
    async function fetchNewsItem() {
      setIsLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('news')
        .select(`
          id,
          title,
          description,
          content,
          city,
          state,
          reporter_price,
          views_count,
          created_at,
          categories:category_id (
            id,
            name,
            parent_id
          )
        `)
        .eq('id', newsId)
        .eq('status', 'published')
        .maybeSingle();

      if (fetchError || !data) {
        setError('This story is not available right now.');
        setNewsItem(null);
        setIsLoading(false);
        return;
      }

      setNewsItem(data as NewsDetail);
      setIsLoading(false);
    }

    if (newsId) {
      fetchNewsItem();
    }
  }, [newsId, supabase]);

  const formatTimeAgo = (createdAt: string) => {
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    const diffMs = Math.max(0, now - created);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const categoryData = Array.isArray(newsItem?.categories) ? newsItem?.categories[0] : newsItem?.categories;
  const categoryLabel = categoryData?.name || 'Uncategorized';
  const locationLabel = [newsItem?.city, newsItem?.state].filter(Boolean).join(', ') || 'Location not provided';

  const handlePurchase = () => {
    setIsPurchasing(true);
    // Simulate purchase network request
    setTimeout(() => {
      alert("This is a demo! In the final version, this will open the Razorpay checkout overlay to purchase the exclusive rights to this specific news story.");
      setIsPurchasing(false);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Card className="border-dashed shadow-none">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-gray-600">Loading story details...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !newsItem) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Card className="border-dashed shadow-none">
            <CardContent className="p-10 text-center">
              <p className="text-sm text-red-600 mb-4">{error || 'Story unavailable.'}</p>
              <Link href="/marketplace">
                <Button variant="outline">Back to Marketplace</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <Link href="/marketplace" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Marketplace
        </Link>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content (Left Side) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="outline" className="text-sm font-medium border-primary/30 text-primary bg-primary/5 px-3 py-1">
                  {categoryLabel}
                </Badge>
                <Badge className="text-sm font-medium bg-amber-100 text-amber-800 border-amber-200 px-3 py-1">
                  <ShieldCheck className="w-3 h-3 mr-1" /> EXCLUSIVE RIGHTS
                </Badge>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {newsItem.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{locationLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{formatTimeAgo(newsItem.created_at)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span>{(newsItem.views_count || 0).toLocaleString('en-IN')} views</span>
                </div>
              </div>
              
              <div className="prose prose-gray max-w-none">
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Story Overview</h3>
                <p className="text-gray-700 leading-relaxed text-lg mb-6">
                  {newsItem.description || 'No short description provided.'}
                </p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Full Story</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-6">{newsItem.content}</p>
                </div>
                <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-white p-2 rounded-full shadow-sm">
                      <FileCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">What's included in the package:</h4>
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li>• Full written manuscript/article</li>
                        <li>• High-resolution unwatermarked photos/videos</li>
                        <li>• Supporting documents and verified evidence</li>
                        <li>• Complete commercial and broadcasting rights</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar / Checkout (Right Side) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <Card className="shadow-lg border-2 border-primary/10 overflow-hidden">
                <div className="bg-primary/5 p-6 border-b border-gray-100 text-center">
                  <p className="text-sm text-gray-500 font-medium mb-1">Exclusive Purchase Price</p>
                  <div className="flex items-center justify-center gap-1">
                    <IndianRupee className="h-7 w-7 text-gray-900" />
                    <span className="text-4xl font-extrabold text-gray-900">
                      {Number(newsItem.reporter_price || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <CardContent className="p-6">
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg font-bold shadow-md"
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                  >
                    {isPurchasing ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                    ) : 'Buy Exclusive Rights'}
                  </Button>
                  
                  <p className="text-xs text-center text-gray-500 mt-4 leading-relaxed">
                    By purchasing this story, you agree to our Terms of Service. 
                    The story will be immediately removed from the marketplace upon successful payment.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm border-gray-200">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 leading-tight">Verified Source</h4>
                    <p className="text-xs text-gray-500 mt-1">This reporter has been KYC authenticated by the Kabutar Media team.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
