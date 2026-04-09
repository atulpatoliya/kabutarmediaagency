import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

const __SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const __SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MASTER_ADMIN_EMAIL = (process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || 'directoratulpatoliya@gmail.com').toLowerCase();

if (!__SUPABASE_URL || !__SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Server env missing: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(__SUPABASE_URL, __SUPABASE_SERVICE_ROLE_KEY);

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const content = String(body?.content || '').trim();
    const state = String(body?.state || '').trim();
    const city = String(body?.city || '').trim();
    const categoryId = typeof body?.categoryId === 'string' && body.categoryId.trim() ? body.categoryId.trim() : null;
    const reporterPrice = Number(body?.reporterPrice);
    const reporterName = String(body?.reporterName || '').trim();

    if (!title || !description || !content || !state || !city || !Number.isFinite(reporterPrice) || reporterPrice < 0) {
      return NextResponse.json({ error: 'Invalid story payload.' }, { status: 400 });
    }

    const { data: roleRow, error: roleError } = await supabase
      .from('users')
      .select('role, profile_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    const isMasterAdminEmail = (user.email || '').toLowerCase() === MASTER_ADMIN_EMAIL;
    const role = roleRow?.role;
    const profileCompleted = roleRow?.profile_completed || false;
    
    // Allow admin and master admin without profile check; reporters/both need completed profile
    const isAllowed = role === 'admin' || isMasterAdminEmail ? true : (role === 'reporter' || role === 'both') && profileCompleted;

    if (!isAllowed) {
      if ((role === 'reporter' || role === 'both') && !profileCompleted) {
        return NextResponse.json({ error: 'Please complete your reporter profile before submitting stories.' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Only reporter or admin accounts can submit stories.' }, { status: 403 });
    }

    // If schema was re-run, auth user may exist but public.users row may be missing.
    // Ensure FK target row exists before writing into public.news.
    const fallbackRole = role === 'admin' || isMasterAdminEmail ? 'admin' : 'reporter';
    const { error: ensureUserError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: user.id,
          role: fallbackRole,
          status: 'approved',
        },
        { onConflict: 'id' }
      );

    if (ensureUserError) {
      return NextResponse.json({ error: ensureUserError.message }, { status: 500 });
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('news')
      .insert({
        reporter_id: user.id,
        reporter_name: reporterName,
        title,
        description,
        content,
        category_id: categoryId,
        state,
        city,
        reporter_price: reporterPrice,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: inserted.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
