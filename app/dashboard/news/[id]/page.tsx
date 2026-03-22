"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, IndianRupee, MapPin, Loader2, FileText, ImageIcon, Video, File, ExternalLink } from 'lucide-react';
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

type StoryAttachment = {
  path: string;
  name: string;
  signedUrl: string;
  size?: number;
  kind: 'image' | 'video' | 'document' | 'other';
};

type StorageListItem = {
  name: string;
  id?: string;
  metadata?: {
    size?: number;
  };
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
  const [attachments, setAttachments] = useState<StoryAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState('');

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

  useEffect(() => {
    async function fetchAttachments() {
      if (!story) return;

      setAttachmentsLoading(true);
      setAttachmentsError('');

      const folderPath = `${story.reporter_id}/${story.id}`;
      const { data: listedFiles, error: listError } = await supabase.storage
        .from('news-media')
        .list(folderPath, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (listError) {
        setAttachmentsError('Unable to load story attachments.');
        setAttachments([]);
        setAttachmentsLoading(false);
        return;
      }

      const filesOnly = ((listedFiles || []) as StorageListItem[]).filter((item) => !!item.name && !item.id?.endsWith('/'));
      if (!filesOnly.length) {
        setAttachments([]);
        setAttachmentsLoading(false);
        return;
      }

      const toKind = (fileName: string): StoryAttachment['kind'] => {
        const lower = fileName.toLowerCase();
        if (/\.(png|jpg|jpeg|webp|gif|bmp|svg)$/.test(lower)) return 'image';
        if (/\.(mp4|webm|mov|avi|mkv|m4v)$/.test(lower)) return 'video';
        if (/\.(pdf|doc|docx|txt|rtf|xls|xlsx|csv|ppt|pptx)$/.test(lower)) return 'document';
        return 'other';
      };

      const mapped = await Promise.all(
        filesOnly.map(async (item) => {
          const fullPath = `${folderPath}/${item.name}`;
          const { data: signedData, error: signedError } = await supabase.storage
            .from('news-media')
            .createSignedUrl(fullPath, 60 * 60);

          if (signedError || !signedData?.signedUrl) {
            return null;
          }

          return {
            path: fullPath,
            name: item.name,
            signedUrl: signedData.signedUrl,
            size: item.metadata?.size,
            kind: toKind(item.name),
          } as StoryAttachment;
        })
      );

      setAttachments(mapped.filter((entry): entry is StoryAttachment => !!entry));
      setAttachmentsLoading(false);
    }

    fetchAttachments();
  }, [story, supabase]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const visualAttachments = attachments.filter((item) => item.kind === 'image' || item.kind === 'video');
  const documentAttachments = attachments.filter((item) => item.kind === 'document' || item.kind === 'other');

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

          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Media Attachments</h3>

            {attachmentsLoading ? (
              <div className="text-sm text-gray-600 inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading attachments...
              </div>
            ) : null}

            {attachmentsError ? (
              <p className="text-xs text-red-600">{attachmentsError}</p>
            ) : null}

            {!attachmentsLoading && attachments.length === 0 ? (
              <p className="text-sm text-gray-500">No attachments uploaded for this story.</p>
            ) : null}

            {visualAttachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visualAttachments.map((item) => (
                  <div key={item.path} className="rounded-lg border border-gray-200 p-2">
                    <div className="aspect-video rounded-md overflow-hidden bg-gray-100">
                      {item.kind === 'image' ? (
                        <img src={item.signedUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <video src={item.signedUrl} controls preload="metadata" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                      {item.kind === 'image' ? <ImageIcon className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                      <span className="truncate">{item.name}</span>
                      <a href={item.signedUrl} target="_blank" rel="noreferrer" className="ml-auto text-primary inline-flex items-center gap-1">
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {documentAttachments.length > 0 ? (
              <div className="space-y-2">
                {documentAttachments.map((item) => (
                  <div key={item.path} className="rounded-md border border-gray-200 px-3 py-2 text-sm flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2 text-gray-700">
                      {item.kind === 'document' ? <FileText className="h-4 w-4 text-blue-600" /> : <File className="h-4 w-4 text-gray-500" />}
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 inline-flex items-center gap-3">
                      <span>{formatFileSize(item.size)}</span>
                      <a href={item.signedUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
