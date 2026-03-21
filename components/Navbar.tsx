"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

type ProfileUpdatedDetail = {
  fullName?: string;
  avatarUrl?: string;
};

const navLinks = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/apply-buyer', label: 'Join as Buyer' },
  { href: '/apply-reporter', label: 'Join as Reporter' },
  { href: '/support', label: 'Support' },
];

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState<string>('My Account');
  const [profileImageUrl, setProfileImageUrl] = useState<string>('');
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    if (!supabase) return;

    // Always fetches fresh user data from Supabase server (not cached JWT)
    const resolveProfile = async () => {
      const { data: { user: freshUser } } = await supabase.auth.getUser();

      if (!freshUser) {
        setUser(null);
        setProfileName('My Account');
        setProfileImageUrl('');
        return;
      }

      setUser(freshUser);
      setProfileImageUrl(freshUser.user_metadata?.avatar_url || '');

      // Priority 1: user_metadata.full_name (most up-to-date after profile update)
      const fullName = (freshUser.user_metadata?.full_name as string | undefined)?.trim() || '';
      if (fullName) {
        setProfileName(fullName);
        return;
      }

      // Priority 2: reporter_profiles table (fallback for reporters without metadata)
      const { data } = await supabase
        .from('reporter_profiles')
        .select('full_name')
        .eq('user_id', freshUser.id)
        .maybeSingle();

      if (data?.full_name) {
        setProfileName(data.full_name);
        return;
      }

      // Priority 3: derive from email
      if (freshUser.email) {
        const namePart = freshUser.email.split('@')[0];
        setProfileName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
        return;
      }

      setProfileName('My Account');
    };

    // Single initial fetch using getUser() for fresh server data
    resolveProfile();

    // Listen for real auth changes (sign in / sign out / token refresh)
    // Skip INITIAL_SESSION — already handled by resolveProfile() above
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      if (event === 'INITIAL_SESSION') return;
      if (!session) {
        setUser(null);
        setProfileName('My Account');
        setProfileImageUrl('');
      } else {
        await resolveProfile();
      }
    });

    // Listen for settings page profile update event
    const handleProfileUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<ProfileUpdatedDetail>;
      const nextFullName = customEvent.detail?.fullName?.trim() || '';
      const nextAvatarUrl = customEvent.detail?.avatarUrl || '';
      if (nextFullName) setProfileName(nextFullName);
      if (nextAvatarUrl) setProfileImageUrl(nextAvatarUrl);
    };

    window.addEventListener('profile-updated', handleProfileUpdated as EventListener);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profile-updated', handleProfileUpdated as EventListener);
    };
  }, [supabase]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <Image
              src="/Kabutar media logo.webp"
              alt="Kabutar Media"
              width={40}
              height={40}
              className="h-10 w-10 rounded-md object-contain"
            />
            <span>Kabutar Media</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === link.href ? 'text-primary' : 'text-gray-600'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth buttons — rendered only after client mounts to prevent hydration mismatch */}
          <div className="hidden md:flex items-center gap-3">
            {!mounted ? null : user ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors">
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt={profileName}
                      className="h-8 w-8 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary border border-primary/20">
                      {profileName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span>{profileName}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link href="/login" className={buttonVariants({ size: 'sm', className: 'bg-primary hover:bg-primary/90 text-white' })}>
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-2 py-2 text-gray-700 hover:text-primary text-sm"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 mt-2">
              {!mounted ? null : user ? (
                <>
                  <Link href="/dashboard" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-full justify-start gap-2' })} onClick={() => setMobileOpen(false)}>
                    {profileImageUrl ? (
                      <img
                        src={profileImageUrl}
                        alt={profileName}
                        className="h-6 w-6 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary border border-primary/20">
                        {profileName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span>Dashboard ({profileName})</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      handleSignOut();
                      setMobileOpen(false);
                    }}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login" className={buttonVariants({ size: 'sm', className: 'w-full bg-primary text-white flex-1' })} onClick={() => setMobileOpen(false)}>
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}