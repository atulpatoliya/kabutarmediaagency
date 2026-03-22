import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabaseServer';

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return auth.error;
    }

    // Self-heal missing rows in public.users (common after schema/table resets).
    // Existing auth users should always have a corresponding public.users row.
    const { data: { users: seedAuthUsers }, error: seedAuthError } = await supabaseAdmin.auth.admin.listUsers();
    if (seedAuthError) throw seedAuthError;

    const authUserIds = (seedAuthUsers || []).map((u) => u.id);
    if (authUserIds.length > 0) {
      const { data: existingRows, error: existingRowsError } = await supabaseAdmin
        .from('users')
        .select('id')
        .in('id', authUserIds);

      if (existingRowsError) throw existingRowsError;

      const existingIdSet = new Set((existingRows || []).map((row) => row.id));
      const missingRows = (seedAuthUsers || [])
        .filter((u) => !existingIdSet.has(u.id))
        .map((u) => ({
          id: u.id,
          role: ((u.email || '').toLowerCase() === MASTER_ADMIN_EMAIL ? 'admin' : 'buyer') as 'admin' | 'buyer',
          status: 'approved' as 'approved',
        }));

      if (missingRows.length > 0) {
        const { error: insertMissingError } = await supabaseAdmin
          .from('users')
          .insert(missingRows);

        if (insertMissingError) throw insertMissingError;
      }
    }

    // If a user has reporter profile data, ensure role is reporter.
    const { data: reporterRoleRows, error: reporterRoleRowsError } = await supabaseAdmin
      .from('reporter_profiles')
      .select('user_id');

    if (reporterRoleRowsError) throw reporterRoleRowsError;

    const reporterIds = (reporterRoleRows || []).map((r) => r.user_id);
    if (reporterIds.length > 0) {
      const { error: promoteReporterError } = await supabaseAdmin
        .from('users')
        .update({ role: 'reporter' })
        .in('id', reporterIds)
        .neq('role', 'admin');

      if (promoteReporterError) throw promoteReporterError;
    }

    // Also heal historical data where reporter profile was never inserted,
    // but application type was approved as reporter.
    const { data: approvedReporterApps, error: approvedReporterAppsError } = await supabaseAdmin
      .from('platform_applications')
      .select('email')
      .eq('type', 'reporter')
      .eq('status', 'approved');

    if (approvedReporterAppsError) throw approvedReporterAppsError;

    const approvedReporterEmailSet = new Set(
      (approvedReporterApps || [])
        .map((row) => (row.email || '').toLowerCase().trim())
        .filter(Boolean)
    );

    const reporterUserIdsFromApplications = (seedAuthUsers || [])
      .filter((u) => approvedReporterEmailSet.has((u.email || '').toLowerCase().trim()))
      .map((u) => u.id);

    if (reporterUserIdsFromApplications.length > 0) {
      const { error: promoteReporterFromAppsError } = await supabaseAdmin
        .from('users')
        .update({ role: 'reporter' })
        .in('id', reporterUserIdsFromApplications)
        .neq('role', 'admin');

      if (promoteReporterFromAppsError) throw promoteReporterFromAppsError;
    }

    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        role,
        status,
        created_at
      `)
      .neq('role', 'admin')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    const authMap = new Map(authUsers.map(u => [u.id, u]));

    const { data: reporterProfiles } = await supabaseAdmin
      .from('reporter_profiles')
      .select('user_id, full_name, phone, city');
    
    const reporterMap = new Map(reporterProfiles?.map(p => [p.user_id, p]) || []);

    const combinedData = usersData.map(u => {
      const authUser = authMap.get(u.id);
      const reporterProfile = reporterMap.get(u.id);
      
      return {
        ...u,
        reporter_profiles: reporterProfile ? [reporterProfile] : [],
        metadata: authUser?.user_metadata || {},
        email: authUser?.email || ''
      };
    });

    return NextResponse.json(combinedData);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}