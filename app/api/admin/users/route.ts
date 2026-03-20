import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const __SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const __SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!__SUPABASE_URL || !__SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Server env missing: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
}
const supabaseAdmin = createClient(__SUPABASE_URL, __SUPABASE_SERVICE_ROLE_KEY);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
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