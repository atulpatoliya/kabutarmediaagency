import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

const __SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const __SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!__SUPABASE_URL || !__SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Server env missing: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(__SUPABASE_URL, __SUPABASE_SERVICE_ROLE_KEY);
const MASTER_ADMIN_EMAIL = (process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || 'directoratulpatoliya@gmail.com').toLowerCase();

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: roleRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdminByRole = roleRow?.role === 'admin';
  const isMasterAdminEmail = (user.email || '').toLowerCase() === MASTER_ADMIN_EMAIL;

  if (!isAdminByRole && !isMasterAdminEmail) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { userId: user.id };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return auth.error;
    }

    const { data, error } = await supabaseAdmin
      .from('platform_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ applications: Array.isArray(data) ? data : [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
