"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, Edit3, XCircle, CheckCircle, UserCircle2, FileText, MapPin, ImageIcon, Video, File, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabaseClient';

const MASTER_ADMIN_EMAIL = (process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || 'directoratulpatoliya@gmail.com').toLowerCase();

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
};

type NewsRecord = {
  id: string;
  title: string;
  description: string;
  content: string;
  city: string;
  state: string;
  status: string;
  reporter_price: number;
  category_id: string | null;
  created_at: string;
  reporter_id: string;
  categories?: {
    name: string;
  } | null;
  users?: {
    id: string;
    role: string | null;
    status: string | null;
    reporter_profiles?: {
      full_name: string | null;
      phone: string | null;
    }[] | {
      full_name: string | null;
      phone: string | null;
    };
  } | null;
};

type ReporterDetails = {
  fullName: string;
  phone: string;
  email: string;
};

type StoryAttachment = {
  name: string;
  path: string;
  signedUrl: string;
  size?: number;
  createdAt?: string;
  kind: 'image' | 'video' | 'document' | 'other';
};

type StorageListItem = {
  name: string;
  id?: string;
  created_at?: string;
  metadata?: {
    size?: number;
  };
};

export default function AdminReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [attachments, setAttachments] = useState<StoryAttachment[]>([]);
  const [reporterDetails, setReporterDetails] = useState<ReporterDetails>({
    fullName: '',
    phone: '',
    email: '',
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [news, setNews] = useState<NewsRecord | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    categoryId: '',
    city: '',
    state: '',
    reporterPrice: '',
    status: '',
  });

  useEffect(() => {
    async function checkAdminAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const isAdmin = data?.role === 'admin' || (user.email || '').toLowerCase() === MASTER_ADMIN_EMAIL;
      if (!isAdmin) {
        router.push('/dashboard');
        return;
      }

      setIsAuthorized(true);
      setIsCheckingAccess(false);
    }

    checkAdminAccess();
  }, [supabase, router]);

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('id, name, parent_id, sort_order')
        .eq('status', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (data) {
        setCategories(data);
      }
    }

    if (isAuthorized) {
      fetchCategories();
    }
  }, [isAuthorized, supabase]);

  useEffect(() => {
    async function fetchNewsById() {
      setIsLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('news')
        .select(`
          *,
          categories:category_id (
            name
          ),
          users:reporter_id (
            id,
            role,
            status,
            reporter_profiles (
              full_name,
              phone
            )
          )
        `)
        .eq('id', params.id)
        .maybeSingle();

      if (fetchError || !data) {
        setError('Unable to load this story. It may have been removed.');
        setNews(null);
        setIsLoading(false);
        return;
      }

      const mapped = data as NewsRecord;
      setNews(mapped);
      setFormData({
        title: mapped.title || '',
        description: mapped.description || '',
        content: mapped.content || '',
        categoryId: mapped.category_id || '',
        city: mapped.city || '',
        state: mapped.state || '',
        reporterPrice: String(mapped.reporter_price ?? ''),
        status: mapped.status || 'pending',
      });
      setIsLoading(false);
    }

    if (isAuthorized && params.id) {
      fetchNewsById();
    }
  }, [isAuthorized, params.id, supabase]);

  useEffect(() => {
    async function fetchReporterDetails() {
      if (!news?.reporter_id) return;

      try {
        const response = await fetch(`/api/admin/user/${news.reporter_id}`);
        const result = await response.json();

        if (!response.ok || !result?.user) {
          return;
        }

        const profile = result.user.profile || {};
        const metadata = result.user.metadata || {};

        setReporterDetails({
          fullName: String(profile.full_name || metadata.full_name || '').trim(),
          phone: String(profile.phone || result.user.phone || result.user.application_phone || metadata.phone || '').trim(),
          email: String(result.user.email || '').trim(),
        });
      } catch {
        // Keep UI fallback values if API fetch fails.
      }
    }

    fetchReporterDetails();
  }, [news?.reporter_id]);

  useEffect(() => {
    async function fetchStoryAttachments() {
      if (!news) {
        setAttachments([]);
        return;
      }

      setMediaLoading(true);
      setMediaError('');

      const folderPath = `${news.reporter_id}/${news.id}`;
      const { data: listedFiles, error: listError } = await supabase.storage
        .from('news-media')
        .list(folderPath, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (listError) {
        setMediaError('Unable to load media attachments.');
        setAttachments([]);
        setMediaLoading(false);
        return;
      }

      const filesOnly = ((listedFiles || []) as StorageListItem[]).filter((item) => !!item.name && !item.id?.endsWith('/'));
      if (!filesOnly.length) {
        setAttachments([]);
        setMediaLoading(false);
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
          const { data: urlData, error: signedError } = await supabase.storage
            .from('news-media')
            .createSignedUrl(fullPath, 60 * 60);

          if (signedError || !urlData?.signedUrl) {
            return null;
          }

          return {
            name: item.name,
            path: fullPath,
            signedUrl: urlData.signedUrl,
            size: item.metadata?.size,
            createdAt: item.created_at,
            kind: toKind(item.name),
          } as StoryAttachment;
        })
      );

      setAttachments(mapped.filter((entry): entry is StoryAttachment => !!entry));
      setMediaLoading(false);
    }

    if (isAuthorized) {
      fetchStoryAttachments();
    }
  }, [isAuthorized, news, supabase]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const visualAttachments = attachments.filter((item) => item.kind === 'image' || item.kind === 'video');
  const documentAttachments = attachments.filter((item) => item.kind === 'document' || item.kind === 'other');

  const profileSource = news?.users?.reporter_profiles;
  const profileObj = Array.isArray(profileSource) ? profileSource[0] : profileSource;

  const reporterName =
    String(profileObj?.full_name || '').trim() ||
    reporterDetails.fullName ||
    'Unavailable';

  const reporterPhone =
    String(profileObj?.phone || '').trim() ||
    reporterDetails.phone ||
    'Unavailable';

  const reporterEmail = reporterDetails.email || 'Unavailable';

  const getPathLabel = (categoryId: string) => {
    const byId = new Map(categories.map((category) => [category.id, category]));
    const labels: string[] = [];
    let current = byId.get(categoryId);
    let guard = 0;

    while (current && guard < 10) {
      labels.unshift(current.name);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
      guard += 1;
    }

    return labels.join(' > ');
  };

  const handleSave = async () => {
    if (!news) return;

    const parsedPrice = parseFloat(formData.reporterPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Reporter price must be a valid positive amount.');
      return;
    }

    setIsSaving(true);
    setError('');

    const { data: updated, error: updateError } = await supabase
      .from('news')
      .update({
        title: formData.title,
        description: formData.description,
        content: formData.content,
        category_id: formData.categoryId || null,
        city: formData.city,
        state: formData.state,
        reporter_price: parsedPrice,
        status: formData.status,
      })
      .eq('id', news.id)
      .select(`
        *,
        categories:category_id (
          name
        ),
        users:reporter_id (
          id,
          role,
          status,
          reporter_profiles (
            full_name,
            phone
          )
        )
      `)
      .maybeSingle();

    if (updateError || !updated) {
      setError('Failed to save changes. Please try again.');
      setIsSaving(false);
      return;
    }

    setNews(updated as NewsRecord);
    setIsEditing(false);
    setIsSaving(false);
  };

  if (isCheckingAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/review">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Review Panel
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Full News Review</h1>
            <p className="text-sm text-gray-600">Open complete news content and update details from master admin panel.</p>
          </div>
        </div>

        {!isLoading && news && (
          <div className="flex gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="gap-2">
                <Edit3 className="h-4 w-4" />
                Edit Story
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Update
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-gray-600">Loading story details...</p>
          </CardContent>
        </Card>
      ) : news ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Story Content</CardTitle>
                <CardDescription>
                  Created on {new Date(news.created_at).toLocaleDateString()} at {new Date(news.created_at).toLocaleTimeString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Short Description</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    disabled={!isEditing}
                    className="flex min-h-24 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:bg-gray-50 mt-1"
                    maxLength={200}
                  />
                </div>

                <div>
                  <Label htmlFor="content">Full News Content</Label>
                  <textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                    disabled={!isEditing}
                    className="flex min-h-80 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:bg-gray-50 mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Media Attachments</CardTitle>
                <CardDescription>Files uploaded by the reporter for this story.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mediaLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading attachments...
                  </div>
                ) : null}

                {mediaError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {mediaError}
                  </div>
                ) : null}

                {!mediaLoading && attachments.length === 0 ? (
                  <p className="text-sm text-gray-500">No attachments found for this story.</p>
                ) : null}

                {visualAttachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {visualAttachments.map((item) => (
                      <div key={item.path} className="rounded-lg border border-gray-200 p-2 bg-white">
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
                      <div key={item.path} className="rounded-md border border-gray-200 bg-white px-3 py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2 text-sm text-gray-700">
                          {item.kind === 'document' ? <FileText className="h-4 w-4 text-blue-600" /> : <File className="h-4 w-4 text-gray-500" />}
                          <span className="truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatFileSize(item.size)}</span>
                          <a href={item.signedUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                            Open <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle2 className="h-5 w-5 text-gray-500" />
                  Reporter Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-700">
                <p><span className="font-semibold text-gray-900">Name:</span> {reporterName}</p>
                <p><span className="font-semibold text-gray-900">Phone:</span> {reporterPhone}</p>
                <p><span className="font-semibold text-gray-900">Email:</span> {reporterEmail}</p>
                <p><span className="font-semibold text-gray-900">Role:</span> {news.users?.role || 'unknown'}</p>
                <p><span className="font-semibold text-gray-900">Account Status:</span> {news.users?.status || 'unknown'}</p>
                <p className="break-all"><span className="font-semibold text-gray-900">Reporter ID:</span> {news.reporter_id}</p>
                <p className="break-all"><span className="font-semibold text-gray-900">News ID:</span> {news.id}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-500" />
                  Story Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    title="Category"
                    value={formData.categoryId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                    disabled={!isEditing}
                    className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mt-1 disabled:bg-gray-50"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{getPathLabel(category.id)}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reporterPrice">Reporter Price</Label>
                  <Input
                    id="reporterPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.reporterPrice}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reporterPrice: e.target.value }))}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Story Status</Label>
                  <select
                    id="status"
                    title="Story status"
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                    disabled={!isEditing}
                    className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mt-1 disabled:bg-gray-50"
                  >
                    <option value="pending">Pending</option>
                    <option value="published">Published</option>
                    <option value="rejected">Rejected</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>

                <div className="rounded-md bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 space-y-1">
                  <p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Current location: {news.city}, {news.state}</p>
                  <p>Status badge: {news.status}</p>
                  <p>Current category: {news.categories?.name || 'Uncategorized'}</p>
                  <p className="font-mono">News ID: {news.id}</p>
                </div>

                {!isEditing && (
                  <div className="pt-2 flex gap-2">
                    <Button
                      onClick={async () => {
                        const { error: updateError } = await supabase
                          .from('news')
                          .update({ status: 'published' })
                          .eq('id', news.id);

                        if (!updateError) {
                          setNews((prev) => prev ? { ...prev, status: 'published' } : prev);
                          setFormData((prev) => ({ ...prev, status: 'published' }));
                        }
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const { error: updateError } = await supabase
                          .from('news')
                          .update({ status: 'rejected' })
                          .eq('id', news.id);

                        if (!updateError) {
                          setNews((prev) => prev ? { ...prev, status: 'rejected' } : prev);
                          setFormData((prev) => ({ ...prev, status: 'rejected' }));
                        }
                      }}
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
