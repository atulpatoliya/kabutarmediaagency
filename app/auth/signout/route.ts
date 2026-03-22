import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

async function performSignOut(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: 'global' });
  } catch (error) {
    console.error('Server sign-out route error:', error);
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('logout', '1');
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  return performSignOut(request);
}

export async function POST(request: NextRequest) {
  return performSignOut(request);
}