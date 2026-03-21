"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Upload, Loader2, Save, X } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';

export default function CreateNewsStory() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [categories, setCategories] = useState<{ id: string, name: string, parent_id: string | null, sort_order: number }[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    categoryId: '',
    state: '',
    city: '',
    reporterPrice: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(e.target.files || []);
    if (!nextFiles.length) return;

    const allowedTypes = ['image/', 'video/', 'application/pdf'];
    const valid = nextFiles.filter((file) => allowedTypes.some((type) => file.type.startsWith(type)));
    setSelectedFiles((prev) => [...prev, ...valid].slice(0, 10));
    setSubmitError('');
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };



  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('id, name, parent_id, sort_order')
        .eq('status', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (data) setCategories(data);
    }
    fetchCategories();
  }, [supabase]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!supabase) {
      setSubmitError('Supabase is not configured. Please check environment variables.');
      return;
    }

    const parsedPrice = parseFloat(formData.reporterPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setSubmitError('Please enter a valid expected amount.');
      return;
    }

    setIsLoading(true);

    try {
      // Prevent infinite loading if network stalls
      const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 15000): Promise<T> => {
        return await Promise.race([
          promise,
          new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout. Please try again.')), timeoutMs);
          }),
        ]);
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const createResponse = await withTimeout(
        fetch('/api/news/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            content: formData.content,
            categoryId: formData.categoryId || null,
            state: formData.state,
            city: formData.city,
            reporterPrice: parsedPrice,
          }),
        })
      );

      const createResult = await createResponse.json() as { id?: string; error?: string };
      if (!createResponse.ok) {
        throw new Error(createResult.error || 'Failed to create story.');
      }

      const insertedRows = createResult.id ? { id: createResult.id } : null;

      // Optional media upload to storage bucket
      if (selectedFiles.length > 0 && insertedRows?.id) {
        for (const file of selectedFiles) {
          const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
          const safeFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const storagePath = `${user.id}/${insertedRows.id}/${safeFileName}`;

          const uploadResult = await withTimeout(
            supabase.storage
              .from('news-media')
              .upload(storagePath, file, { upsert: false, cacheControl: '3600' })
          ) as { error: { message?: string } | null };

          const uploadError = uploadResult.error;

          if (uploadError) {
            // Non-blocking: story is already saved; reporter can continue.
            console.error('Media upload failed:', uploadError);
          }
        }
      }

      router.push('/dashboard/news');
    } catch (error) {
      console.error('Error submitting story:', error);
      const message = error instanceof Error ? error.message : 'Failed to submit story.';
      if (message.toLowerCase().includes('row-level security') || message.toLowerCase().includes('permission')) {
        setSubmitError('You do not have permission to submit stories with this account. Please login as a reporter or admin account.');
      } else {
        setSubmitError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/news">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit New Story</h1>
          <p className="text-gray-600 mt-1">Provide details about your news story to list it on the marketplace.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {submitError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Details</CardTitle>
                <CardDescription>The core information of your news story.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Story Title</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    placeholder="E.g., Major Development in Downtown City Planning"
                    value={formData.title}
                    onChange={handleChange}
                    required 
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Short Description</Label>
                  <textarea
                    id="description"
                    name="description"
                    placeholder="A brief summary of the story (max 200 characters)..."
                    value={formData.description}
                    onChange={handleChange}
                    className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mt-1"
                    maxLength={200}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">{formData.description.length}/200</p>
                </div>
                <div>
                  <Label htmlFor="content">Full Content / Story</Label>
                  <textarea
                    id="content"
                    name="content"
                    placeholder="Write the full details of your news story here..."
                    value={formData.content}
                    onChange={handleChange}
                    className="flex min-h-[250px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mt-1"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Media Attachments</CardTitle>
                <CardDescription>Upload photos, videos, or documents related to this news.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:bg-gray-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*,video/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Upload className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900">Click to add files</h3>
                  <p className="mt-1 text-xs text-gray-500">Images, videos, PDFs | up to 10 files</p>
                </label>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                        <span className="truncate pr-4">{file.name}</span>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-red-600"
                          onClick={() => removeFile(index)}
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Uploaded files are stored with your submitted story record folder in storage.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Categorization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="categoryId">Category</Label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    title="Category"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mt-1"
                    disabled={categories.length === 0}
                    required
                  >
                    <option value="" disabled>{categories.length === 0 ? 'No categories available' : 'Select a category'}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{getPathLabel(cat.id)}</option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="mt-2 text-xs text-red-500">Master admin must add categories in News Settings before reporters can submit stories.</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input 
                    id="state" 
                    name="state" 
                    placeholder="E.g., California"
                    value={formData.state}
                    onChange={handleChange}
                    required 
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city" 
                    name="city" 
                    placeholder="E.g., Los Angeles"
                    value={formData.city}
                    onChange={handleChange}
                    required 
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>Set your expected price.</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="reporterPrice">Expected Amount ($)</Label>
                  <Input 
                    id="reporterPrice" 
                    name="reporterPrice" 
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.reporterPrice}
                    onChange={handleChange}
                    required 
                    className="mt-1 font-mono"
                  />
                </div>
              </CardContent>
            </Card>
            
            <div className="flex gap-4 pt-4">
              <Link href="/dashboard/news" className="flex-1">
                <Button variant="outline" type="button" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1 bg-primary text-white" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Submit Story</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
