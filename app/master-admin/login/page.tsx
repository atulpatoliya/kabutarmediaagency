"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

export default function MasterAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Step 1: Sign in with email/password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (authError) {
        setError('Invalid login credentials. Please check your email and password.');
        setIsLoading(false);
        return;
      }

      // Step 2: Check user role using maybeSingle() to avoid 406 error when row not found
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (userError) {
        console.error('Role check error:', userError);
        await supabase.auth.signOut();
        setError('Could not verify user role. Please contact support: kabutarmedia@gmail.com');
        return;
      }

      if (!userData || userData.role !== 'admin') {
        await supabase.auth.signOut();
        setError('Access Denied: You do not have master admin privileges. Contact: kabutarmedia@gmail.com | +91 9726530209');
        return;
      }

      // Step 3: Admin confirmed — redirect directly to review panel
      router.push('/dashboard/admin/review');

    } catch (err) {
      console.error('Master admin login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md shadow-2xl border-gray-800 bg-gray-950 text-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-red-600/20 border border-red-500 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Master Admin Portal</CardTitle>
          <CardDescription className="text-gray-400">Restricted access area.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-950/50 border border-red-900 text-red-400 px-4 py-3 rounded-lg text-sm text-center font-medium">
                {error}
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-gray-300">Admin Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-gray-300">Admin Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-medium shadow-none outline-none mt-2" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authenticating...</> : 'Secure Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
