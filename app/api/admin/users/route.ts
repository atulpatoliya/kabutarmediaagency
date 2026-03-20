import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get public users with reporter profiles
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

    // Get auth users for metadata (names)
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    const authMap = new Map(authUsers.map(u => [u.id, u]));

    // Fetch reporter profiles separately
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
