import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

const __SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const __SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!__SUPABASE_URL || !__SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Server env missing: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(__SUPABASE_URL, __SUPABASE_SERVICE_ROLE_KEY);
const MASTER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || 'directoratulpatoliya@gmail.com';

type CategoryInput = {
  id?: string;
  name: string;
  parentId?: string | null;
  status?: boolean;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  status: boolean;
  sort_order: number;
  parent_id: string | null;
};

const PARENT_COLUMN_MISSING_HINT = "Could not find the 'parent_id' column";
const PARENT_MIGRATION_SQL = `ALTER TABLE public.categories\nADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;`;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  let { data: roleRow, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!error && !roleRow) {
    const fallbackRole = user.email === MASTER_ADMIN_EMAIL ? 'admin' : 'buyer';
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({ id: user.id, role: fallbackRole, status: 'approved' }, { onConflict: 'id' });

    if (!upsertError) {
      const refreshed = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      roleRow = refreshed.data || null;
      error = refreshed.error || null;
    }
  }

  if (error || roleRow?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { userId: user.id };
}

function makeUniqueSlug(base: string, taken: Set<string>) {
  const safeBase = base || 'category';
  let next = safeBase;
  let suffix = 2;

  while (taken.has(next)) {
    next = `${safeBase}-${suffix}`;
    suffix += 1;
  }

  taken.add(next);
  return next;
}

function isMissingParentColumnError(errorMessage: string) {
  return errorMessage.includes(PARENT_COLUMN_MISSING_HINT) || errorMessage.toLowerCase().includes('parent_id');
}

async function fetchCategories(tryWithParentColumn: boolean): Promise<{ data: CategoryRow[]; error: string | null; hierarchyEnabled: boolean }> {
  const selectColumns = tryWithParentColumn
    ? 'id, name, slug, status, sort_order, parent_id'
    : 'id, name, slug, status, sort_order';

  const { data, error } = await supabaseAdmin
    .from('categories')
    .select(selectColumns)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    return { data: [], error: error.message, hierarchyEnabled: false };
  }

  const rows = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: Boolean(row.status),
    sort_order: Number(row.sort_order || 0),
    parent_id: tryWithParentColumn ? (row.parent_id || null) : null,
  }));

  return { data: rows, error: null, hierarchyEnabled: tryWithParentColumn };
}

function hasCycle(parentById: Map<string, string | null>) {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) {
      return true;
    }
    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);
    const parentId = parentById.get(nodeId);
    if (parentId && parentById.has(parentId)) {
      if (dfs(parentId)) {
        return true;
      }
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  for (const nodeId of parentById.keys()) {
    if (dfs(nodeId)) {
      return true;
    }
  }

  return false;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return auth.error;
  }

  const withParent = await fetchCategories(true);
  if (!withParent.error) {
    return NextResponse.json({ categories: withParent.data, hierarchyEnabled: true });
  }

  if (isMissingParentColumnError(withParent.error)) {
    const fallback = await fetchCategories(false);
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error }, { status: 500 });
    }

    return NextResponse.json({
      categories: fallback.data,
      hierarchyEnabled: false,
      migrationRequired: true,
      migrationSql: PARENT_MIGRATION_SQL,
      warning: "Hierarchy columns are missing. Run the migration SQL to enable subcategories.",
    });
  }

  return NextResponse.json({ error: withParent.error }, { status: 500 });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) {
    return auth.error;
  }

  const body = await request.json();
  const categories = Array.isArray(body?.categories) ? body.categories as CategoryInput[] : [];

  const withParent = await fetchCategories(true);
  let hierarchyEnabled = true;
  let existing: CategoryRow[] = [];

  if (withParent.error) {
    if (!isMissingParentColumnError(withParent.error)) {
      return NextResponse.json({ error: withParent.error }, { status: 500 });
    }

    const fallback = await fetchCategories(false);
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error }, { status: 500 });
    }

    hierarchyEnabled = false;
    existing = fallback.data;
  } else {
    existing = withParent.data;
  }

  const raw = categories
    .map((category, index) => ({
      id: typeof category.id === 'string' && category.id.trim() ? category.id : undefined,
      name: String(category.name || '').trim(),
      parent_id: hierarchyEnabled && typeof category.parentId === 'string' && category.parentId.trim() ? category.parentId : null,
      sort_order: index + 1,
      status: category.status !== false,
    }))
    .filter((category) => category.name.length > 0);

  if (raw.length === 0) {
    return NextResponse.json({ error: 'At least one category is required.' }, { status: 400 });
  }

  if (!hierarchyEnabled && raw.some((category) => category.parent_id)) {
    return NextResponse.json(
      {
        error: "The 'parent_id' column is missing in your database. Run the migration SQL and try again.",
        migrationSql: PARENT_MIGRATION_SQL,
      },
      { status: 400 }
    );
  }

  const existingIds = new Set(existing.map((category) => category.id));
  const retainedIds = new Set(raw.map((category) => category.id).filter(Boolean) as string[]);
  const removedIds = existing
    .filter((category) => !retainedIds.has(category.id))
    .map((category) => category.id);

  if (removedIds.length > 0) {
    const { data: linkedNews, error: linkedError } = await supabaseAdmin
      .from('news')
      .select('category_id')
      .in('category_id', removedIds)
      .limit(1);

    if (linkedError) {
      return NextResponse.json({ error: linkedError.message }, { status: 500 });
    }

    if (linkedNews && linkedNews.length > 0) {
      return NextResponse.json({ error: 'Cannot remove categories already used by news stories.' }, { status: 400 });
    }

    const { error: deleteError } = await supabaseAdmin.from('categories').delete().in('id', removedIds);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  const knownIds = new Set(raw.map((category) => category.id).filter(Boolean) as string[]);
  const cleaned = raw.map((category) => ({
    ...category,
    parent_id: hierarchyEnabled && category.parent_id && knownIds.has(category.parent_id) ? category.parent_id : null,
  }));

  if (hierarchyEnabled) {
    const parentById = new Map<string, string | null>();
    for (const category of cleaned) {
      if (category.id) {
        parentById.set(category.id, category.parent_id || null);
      }
    }

    if (hasCycle(parentById)) {
      return NextResponse.json({ error: 'Invalid hierarchy. Parent cycle detected (example: A > B > A).' }, { status: 400 });
    }
  }

  const existingSlugMap = new Map(existing.map((category) => [category.id, category.slug]));
  const takenSlugs = new Set<string>();
  const cleanedWithSlugs = cleaned.map((category, index) => {
    const currentSlug = category.id ? existingSlugMap.get(category.id) : '';
    const base = slugify(category.name) || `category-${index + 1}`;
    const nextSlug = makeUniqueSlug(currentSlug || base, takenSlugs);
    return {
      ...category,
      slug: nextSlug,
    };
  });

  for (const category of cleanedWithSlugs) {
    if (!category.id || !existingIds.has(category.id)) {
      continue;
    }

    const { error } = await supabaseAdmin
      .from('categories')
      .update({ slug: `tmp-${category.id}` })
      .eq('id', category.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const newCategories = cleanedWithSlugs.filter((category) => !category.id || !existingIds.has(category.id));
  if (newCategories.length > 0) {
    const { error: insertError } = await supabaseAdmin.from('categories').insert(
      newCategories.map((category) => ({
        name: category.name,
        slug: category.slug,
        status: category.status,
        sort_order: category.sort_order,
        ...(hierarchyEnabled ? { parent_id: category.parent_id } : {}),
      }))
    );

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  for (const category of cleanedWithSlugs) {
    if (!category.id || !existingIds.has(category.id)) {
      continue;
    }

    const { error } = await supabaseAdmin
      .from('categories')
      .update({
        name: category.name,
        slug: category.slug,
        status: category.status,
        sort_order: category.sort_order,
        ...(hierarchyEnabled ? { parent_id: category.parent_id } : {}),
      })
      .eq('id', category.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const updated = await fetchCategories(hierarchyEnabled);
  if (updated.error) {
    return NextResponse.json({ error: updated.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    categories: updated.data,
    hierarchyEnabled,
    ...(hierarchyEnabled
      ? {}
      : {
          warning: "Hierarchy is disabled until parent_id migration is applied.",
          migrationRequired: true,
          migrationSql: PARENT_MIGRATION_SQL,
        }),
  });
}