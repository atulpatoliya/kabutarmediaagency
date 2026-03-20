import { createBrowserClient } from '@supabase/ssr'

// Returns a Supabase client when env is configured. Otherwise returns null
// so callers can no-op gracefully instead of throwing a client-side error.
export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('Supabase env vars missing. Skipping client init.')
    }
    return null as unknown as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(url, anon)
}