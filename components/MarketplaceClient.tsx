"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Eye, Clock, TrendingUp, IndianRupee } from 'lucide-react';

export type CategoryOption = {
  value: string;
  label: string;
};

export type MarketplaceNews = {
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

type MarketplaceClientProps = {
  initialNews: MarketplaceNews[];
  initialCategories: CategoryOption[];
};

export default function MarketplaceClient({ initialNews, initialCategories }: MarketplaceClientProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const getCategoryLabel = (item: MarketplaceNews) => {
    const categoryData = Array.isArray(item.categories) ? item.categories[0] : item.categories;
    if (!categoryData?.id) return 'Uncategorized';
    const option = initialCategories.find((cat) => cat.value === categoryData.id);
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

  const filtered = initialNews.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">News Marketplace</h1>
          <p className="text-gray-600 mb-6">Browse and purchase exclusive news stories</p>

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
        <div className="flex gap-2 flex-wrap mb-8">
          {initialCategories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === category.value
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-500 mb-4">{filtered.length} stories available</p>

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
                  <Link href={`/news/${news.id}`} className={buttonVariants({ size: 'sm', className: 'bg-primary hover:bg-primary/90 text-white' })}>
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
            <p className="text-sm">Try a different search term or category. Only published real stories are shown.</p>
          </div>
        )}
      </div>
    </div>
  );
}