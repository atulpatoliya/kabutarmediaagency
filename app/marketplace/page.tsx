"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Eye, Clock, TrendingUp, IndianRupee } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
};

type CategoryOption = {
  value: string;
  label: string;
};

type MarketplaceNews = {
  id: string;
  title: string;
  reporter_price: number;
  views_count: number | null;
  created_at: string;
  category_id: string | null;
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

export default function Marketplace() {
  const supabase = createClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryOption[]>([{ value: 'all', label: 'All' }]);
  const [newsItems, setNewsItems] = useState<MarketplaceNews[]>([]);

  useEffect(() => {
    if (!supabase) return;

    async function fetchMarketplaceData() {
      setIsLoading(true);

      const [{ data: categoryData }, { data: newsData }] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, parent_id')
          .eq('status', true)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('news')
          .select(`
            id,
            title,
            reporter_price,
            views_count,
            created_at,
            category_id,
            categories:category_id (
              id,
              name,
              parent_id
            )
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
      ]);

      const rows = (categoryData || []) as CategoryRow[];
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

      const labelsById = new Map<string, string>(rows.map((category) => [category.id, labelFor(category)]));

      const realNews = (newsData || []) as MarketplaceNews[];
      setNewsItems(realNews);

      const categoryIdsInNews = new Set(
        realNews
          .map((item) => item.category_id)
          .filter((id): id is string => !!id)
      );

      const realCategoryOptions: CategoryOption[] = rows
        .filter((category) => categoryIdsInNews.has(category.id))
        .map((category) => ({
          value: category.id,
          label: labelsById.get(category.id) || category.name,
        }));

      setCategories([
        { value: 'all', label: 'All' },
        ...realCategoryOptions,
      ]);

      setIsLoading(false);
    }

    fetchMarketplaceData();
  }, [supabase]);

  const getCategoryLabel = (item: MarketplaceNews) => {
    const categoryData = Array.isArray(item.categories) ? item.categories[0] : item.categories;
    if (!categoryData?.id) return 'Uncategorized';
    const option = categories.find((cat) => cat.value === categoryData.id);
    return option?.label || categoryData.name || 'Uncategorized';
  };

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

  const filtered = newsItems.filter((n) => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || n.category_id === selectedCategory;
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
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat.value
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-4">{isLoading ? 'Loading stories...' : `${filtered.length} stories available`}</p>

        {/* News Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((news) => (
            <Card key={news.id} className="hover:shadow-md transition-shadow bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
                    {getCategoryLabel(news)}
                  </Badge>
                  <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                    Exclusive
                  </Badge>
                </div>
                <CardTitle className="text-base leading-snug">{news.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {(news.views_count || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatTimeAgo(news.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" /> Hot
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <IndianRupee className="h-4 w-4 text-green-600" />
                    <span className="text-lg font-bold text-gray-900">
                      {Number(news.reporter_price || 0).toLocaleString('en-IN')}
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

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No stories found</p>
            <p className="text-sm">Try a different search term or category. Only published real stories are shown.</p>
          </div>
        )}
      </div>
    </div>
  );
}