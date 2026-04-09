import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MASTER_ADMIN_EMAIL = (process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || 'directoratulpatoliya@gmail.com').toLowerCase();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Server env missing: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const serverClient = await createServerClient();
    const { data: { user: adminUser }, error: adminUserError } = await serverClient.auth.getUser();

    if (adminUserError || !adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is master admin
    const isMasterAdmin = (adminUser.email || '').toLowerCase() === MASTER_ADMIN_EMAIL;
    const { data: adminRole } = await serverClient
      .from('users')
      .select('role')
      .eq('id', adminUser.id)
      .maybeSingle();

    if (!isMasterAdmin && adminRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete users.' }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = resolvedParams?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    // Verify user exists
    const { data: userToDelete } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Step 1: Delete from public.users (cascades will handle related tables)
    const { error: userDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (userDeleteError) {
      console.error('Error deleting from users table:', userDeleteError);
      return NextResponse.json(
        { error: `Failed to delete user: ${userDeleteError.message}` },
        { status: 500 }
      );
    }

    // Step 2: Delete from auth.users (delete the Supabase Auth user)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return NextResponse.json(
        { error: `Failed to delete auth user: ${authDeleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${userId} and all related data have been permanently deleted.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    console.error('Delete user error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
