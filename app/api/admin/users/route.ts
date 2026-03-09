import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get public users
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        role,
        status,
        created_at,
        reporter_profiles (
          full_name,
          phone,
          city
        )
      `)
      .neq('role', 'admin')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    // Get auth users for metadata (names)
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    const authMap = new Map(authUsers.map(u => [u.id, u]));

    const combinedData = usersData.map(u => {
      const authUser = authMap.get(u.id);
      return {
        ...u,
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
