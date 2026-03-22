"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  category_id: string | null;
  status: string;
};

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
};

export default function StoryEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [storyId, setStoryId] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    city: '',
    state: '',
    reporterPrice: '',
    categoryId: '',
  });

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

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError('');

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        router.push('/login');
        return;
      }

      const [{ data: story, error: storyError }, { data: categoryData }] = await Promise.all([
        supabase
          .from('news')
          .select('id, reporter_id, title, description, content, city, state, reporter_price, category_id, status')
          .eq('id', params.id)
          .maybeSingle(),
        supabase
          .from('categories')
          .select('id, name, parent_id, sort_order')
          .eq('status', true)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
      ]);

      if (categoryData) {
        setCategories(categoryData as Category[]);
      }

      if (storyError || !story) {
        setError('Story not found.');
        setIsLoading(false);
        return;
      }

      if (story.reporter_id !== user.id) {
        router.push('/dashboard/news');
        return;
      }

      const editableStatuses = ['pending', 'rejected'];
      if (!editableStatuses.includes(story.status)) {
        setError('Only pending or rejected stories can be edited.');
      }

      setStoryId(story.id);
      setFormData({
        title: story.title || '',
        description: story.description || '',
        content: story.content || '',
        city: story.city || '',
        state: story.state || '',
        reporterPrice: String(story.reporter_price ?? ''),
        categoryId: story.category_id || '',
      });
      setIsLoading(false);
    }

    if (params.id) {
      fetchData();
    }
  }, [params.id, router, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyId) return;

    const parsedPrice = parseFloat(formData.reporterPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Please enter a valid expected amount.');
      return;
    }

    setIsSaving(true);
    setError('');

    const { error: updateError } = await supabase
      .from('news')
      .update({
        title: formData.title,
        description: formData.description,
        content: formData.content,
        city: formData.city,
        state: formData.state,
        reporter_price: parsedPrice,
        category_id: formData.categoryId || null,
      })
      .eq('id', storyId);

    if (updateError) {
      setError('Failed to update story. Please try again.');
      setIsSaving(false);
      return;
    }

    router.push(`/dashboard/news/${storyId}`);
  };

  if (isLoading) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-gray-600">Loading story editor...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href={storyId ? `/dashboard/news/${storyId}` : '/dashboard/news'}>
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Story</h1>
          <p className="text-sm text-gray-600">Update your story details and save changes.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Story Details</CardTitle>
            <CardDescription>Keep the short description under 200 characters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Short Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                maxLength={200}
                required
                className="flex min-h-24 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mt-1"
              />
            </div>

            <div>
              <Label htmlFor="content">Full Content</Label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                required
                className="flex min-h-80 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mt-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoryId">Category</Label>
                <select
                  id="categoryId"
                  title="Category"
                  value={formData.categoryId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mt-1"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{getPathLabel(cat.id)}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="reporterPrice">Expected Amount</Label>
                <Input
                  id="reporterPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.reporterPrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reporterPrice: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <Link href={storyId ? `/dashboard/news/${storyId}` : '/dashboard/news'}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
