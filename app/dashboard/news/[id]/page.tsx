"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, IndianRupee, MapPin, Loader2, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabaseClient';

type Story = {
  id: string;
  reporter_id: string;
  title: string;
  description: string;
  content: string;
  city: string;
  state: string;
  reporter_price: number;
  status: string;
  created_at: string;
};

const statusColor: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
  sold: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function StoryViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStory() {
      setIsLoading(true);
      setError('');

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('news')
        .select('id, reporter_id, title, description, content, city, state, reporter_price, status, created_at')
        .eq('id', params.id)
        .maybeSingle();

      if (fetchError || !data) {
        setError('Story not found.');
        setIsLoading(false);
        return;
      }

      if (data.reporter_id !== user.id) {
        router.push('/dashboard/news');
        return;
      }

      setStory(data as Story);
      setIsLoading(false);
    }

    if (params.id) {
      fetchStory();
    }
  }, [params.id, router, supabase]);

  if (isLoading) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-gray-600">Loading story...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !story) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent className="p-10 text-center">
          <p className="text-sm text-red-600 mb-4">{error || 'Unable to load story.'}</p>
          <Link href="/dashboard/news">
            <Button variant="outline">Back to My News</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/dashboard/news">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to My News
          </Button>
        </Link>
        <Link href={`/dashboard/news/${story.id}/edit`}>
          <Button variant="outline">Edit Story</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[story.status] || 'bg-gray-100 text-gray-700'}`}>
              {story.status.replace('_', ' ')}
            </span>
          </div>
          <CardTitle className="text-2xl leading-tight">{story.title}</CardTitle>
          <CardDescription>{story.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(story.created_at).toLocaleString()}</span>
            <span className="inline-flex items-center gap-1"><IndianRupee className="h-4 w-4" />{story.reporter_price}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{story.city}, {story.state}</span>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 inline-flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Full Story Content
            </h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-6">{story.content}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
