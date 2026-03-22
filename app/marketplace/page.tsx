import MarketplaceClient, { type CategoryOption, type MarketplaceNews } from '@/components/MarketplaceClient';
import { createClient } from '@/lib/supabaseServer';

type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
};

export default async function MarketplacePage() {
  const supabase = await createClient();

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
  const newsItems = (newsData || []) as MarketplaceNews[];

  const categoryIdsInNews = new Set(
    newsItems
      .map((item) => item.category_id)
      .filter((id): id is string => !!id)
  );

  const categories: CategoryOption[] = [
    { value: 'all', label: 'All' },
    ...rows
      .filter((category) => categoryIdsInNews.has(category.id))
      .map((category) => ({
        value: category.id,
        label: labelsById.get(category.id) || category.name,
      })),
  ];

  return <MarketplaceClient initialNews={newsItems} initialCategories={categories} />;
}