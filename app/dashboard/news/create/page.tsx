"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Upload, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';

export default function CreateNewsStory() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('news').insert({
        reporter_id: user.id,
        title: formData.title,
        description: formData.description,
        content: formData.content,
        state: formData.state,
        city: formData.city,
        reporter_price: parseFloat(formData.reporterPrice),
        status: 'pending'
      });

      if (error) throw error;

      router.push('/dashboard/news');
    } catch (error) {
      console.error('Error submitting story:', error);
      alert('Failed to submit story. Please try again.');
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
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer">
                  <Upload className="h-10 w-10 text-gray-400 mb-4" />
                  <h3 className="text-sm font-semibold text-gray-900">Click to upload or drag and drop</h3>
                  <p className="text-xs text-gray-500 mt-1">SVG, PNG, JPG, MP4 or PDF (max. 50MB)</p>
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
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mt-1"
                    required
                  >
                    <option value="" disabled>Select a category</option>
                    <option value="politics">Politics</option>
                    <option value="crime">Crime</option>
                    <option value="business">Business</option>
                    <option value="sports">Sports</option>
                    <option value="entertainment">Entertainment</option>
                  </select>
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
