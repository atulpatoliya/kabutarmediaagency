"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Eye, Clock, TrendingUp, IndianRupee } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

const mockNews = [
  { id: '1', title: 'Major Political Development in Delhi', category: 'Politics', price: 25000, views: 1200, timeAgo: '2 hours ago', exclusive: true },
  { id: '2', title: 'Tech Giant Announces India Expansion', category: 'Technology', price: 18000, views: 980, timeAgo: '4 hours ago', exclusive: true },
  { id: '3', title: 'New Sports Stadium for Mumbai', category: 'Sports', price: 12000, views: 756, timeAgo: '6 hours ago', exclusive: true },
  { id: '4', title: 'Healthcare Breakthrough at AIIMS', category: 'Health', price: 35000, views: 2100, timeAgo: '1 hour ago', exclusive: true },
  { id: '5', title: 'Economic Survey Results Released', category: 'Business', price: 20000, views: 1500, timeAgo: '3 hours ago', exclusive: true },
  { id: '6', title: 'Bollywood Celebrity in Legal Trouble', category: 'Entertainment', price: 15000, views: 3200, timeAgo: '30 minutes ago', exclusive: true },
];

export default function Marketplace() {
  const supabase = createClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<{ name: string; label: string }[]>([{ name: 'All', label: 'All' }]);

  useEffect(() => {
    if (!supabase) return;

    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .eq('status', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (!data) return;

      type CategoryRow = { id: string; name: string; parent_id: string | null };
      const rows = data as CategoryRow[];
      const byId = new Map<string, CategoryRow>(rows.map((category) => [category.id, category]));
      const labelFor = (category: CategoryRow) => {
        const parts: string[] = [];
        let current: CategoryRow | undefined = category;
        let guard = 0;
        while (current && guard < 10) {
          parts.unshift(current.name);
          current = current.parent_id ? byId.get(current.parent_id) : undefined;
          guard += 1;
        }
        return parts.join(' > ');
      };

      setCategories([
        { name: 'All', label: 'All' },
        ...rows.map((category) => ({
          name: category.name,
          label: labelFor(category),
        })),
      ]);
    }

    fetchCategories();
  }, [supabase]);

  const filtered = mockNews.filter((n) => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || n.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">News Marketplace</h1>
          <p className="text-gray-600 mb-6">Browse and purchase exclusive news stories</p>

          {/* Search */}
          <div className="flex gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Search news stories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-8">
          {categories.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat.name
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-4">{filtered.length} stories available</p>

        {/* News Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((news) => (
            <Card key={news.id} className="hover:shadow-md transition-shadow bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
                    {news.category}
                  </Badge>
                  {news.exclusive && (
                    <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                      Exclusive
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base leading-snug">{news.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {news.views.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {news.timeAgo}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" /> Hot
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <IndianRupee className="h-4 w-4 text-green-600" />
                    <span className="text-lg font-bold text-gray-900">
                      {news.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <Link href={`/news/${news.id}`} className={buttonVariants({ size: "sm", className: "bg-primary hover:bg-primary/90 text-white" })}>
                    View & Buy
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No stories found</p>
            <p className="text-sm">Try a different search term or category</p>
          </div>
        )}
      </div>
    </div>
  );
}