import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const flags = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_URL: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
  } as const;

  const ok = flags.NEXT_PUBLIC_SUPABASE_URL && flags.NEXT_PUBLIC_SUPABASE_ANON_KEY && flags.SUPABASE_URL && flags.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({ ok, env: flags });
}