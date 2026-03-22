"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle, XCircle, Mail, Phone, MapPin, IndianRupee, FileText, ShoppingCart, Loader2, KeyRound, Wand2, Copy, Eye } from 'lucide-react';
import Link from 'next/link';

type AssignableRole = 'buyer' | 'reporter' | 'both';

export default function AdminUserDetails({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCredModal, setShowCredModal] = useState(false);
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [generatedResetLink, setGeneratedResetLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AssignableRole>('buyer');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isResendingProfileMail, setIsResendingProfileMail] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    setNewPassword(pwd);
  };

  const copyPassword = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    async function unwrapParams() {
      const p = await params;
      setUserId(p.id);
    }
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!userId) return;
    async function fetchUser() {
      try {
        const res = await fetch(`/api/admin/user/${userId}`);
        const result = await res.json();
        if (res.ok) {
          setData(result);
          const fetchedRole = String(result?.user?.role || 'buyer').toLowerCase();
          if (fetchedRole === 'buyer' || fetchedRole === 'reporter' || fetchedRole === 'both') {
            setSelectedRole(fetchedRole as AssignableRole);
          }
        } else {
          console.error(result.error);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [userId]);

  const handleUpdateCreds = async () => {
    if (!newEmail && !newPassword) return;
    setIsUpdatingCreds(true);
    try {
      const res = await fetch(`/api/admin/user/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        alert('Credentials updated successfully!');
        setNewPassword('');
        setShowCredModal(false);
        if (newEmail) {
           setData((prev: any) => ({
             ...prev,
             user: { ...prev.user, email: newEmail }
           }));
        }
      } else {
        alert(result.error || 'Failed to update credentials.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!newEmail) {
      alert("Please enter an email address to send the reset link to.");
      return;
    }
    
    setIsSendingLink(true);
    try {
      const res = await fetch(`/api/admin/user/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: newEmail, 
          sendResetLink: true,
          name: data?.user?.profile?.full_name || data?.user?.metadata?.full_name || 'User'
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        if (result.emailSent) {
          alert(`Password reset link successfully sent to ${newEmail}`);
        } else {
          // Display the link safely in the UI instead of a blocking alert
          setGeneratedResetLink(result.resetLink);
        }
      } else {
        alert(result.error || 'Failed to send reset link.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    } finally {
      setIsSendingLink(false);
    }
  };

  const handleRoleUpdate = async () => {
    if (!userId) return;

    setIsUpdatingRole(true);
    try {
      const res = await fetch(`/api/admin/user/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        alert('User role updated successfully.');
        setData((prev: any) => ({
          ...prev,
          user: {
            ...prev.user,
            role: result.user.role,
            status: result.user.status
          }
        }));
      } else {
        alert(result.error || 'Failed to update role.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while updating role.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleResendProfileMail = async () => {
    if (!userId) return;

    setIsResendingProfileMail(true);
    try {
      const res = await fetch(`/api/admin/user/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resendProfileEmail: true,
          name: data?.user?.profile?.full_name || data?.user?.metadata?.full_name || 'User',
          email: data?.user?.email || ''
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        if (result.emailSent) {
          alert('Profile approval mail resent successfully.');
        } else if (result.resetLink) {
          setGeneratedResetLink(result.resetLink);
          setShowCredModal(true);
          alert(result.notice || 'Email could not be sent right now. Secure reset link generated in modal.');
        } else {
          alert('Action completed. Please check logs if needed.');
        }
      } else {
        alert(result.error || 'Failed to resend profile mail.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to resend profile mail.');
    } finally {
      setIsResendingProfileMail(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-gray-500">Loading user details...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.user) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">User Not Found</h3>
          <p className="text-gray-500 mb-6">The requested user does not exist or has been deleted.</p>
          <Link href="/dashboard/admin/users">
            <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Users
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { user, news, transactions } = data;
  const isReporter = user.role === 'reporter' || user.role === 'both';
  const isBuyer = user.role === 'buyer' || user.role === 'both';
  const displayName = user.profile?.full_name || user.metadata?.full_name || '';
  const displayEmail = user.email || '';
  const displayPhone = user.profile?.phone || user.phone || user.application_phone || '';
  const displayCity = user.profile?.city || user.metadata?.city || '';
  const requiredFields = isReporter
    ? [displayName, displayEmail, displayPhone, displayCity]
    : [displayName, displayEmail, displayPhone];
  const filledFields = requiredFields.filter((v: string) => String(v || '').trim().length > 0).length;
  const isProfileComplete = filledFields === requiredFields.length;

  return (
    <div className="max-w-6xl space-y-6 animate-in fade-in-0 duration-300">
      <section className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white via-slate-50 to-white px-4 py-4 shadow-sm ring-1 ring-gray-100 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link href="/dashboard/admin/users">
              <Button variant="outline" size="sm" className="gap-2 bg-white transition-colors hover:bg-slate-50">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{user.profile?.full_name || user.metadata?.full_name || 'No Name Found'}</h1>
              <p className="mt-1 text-xs font-mono text-gray-500 break-all">ID: {user.id}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
              user.status === 'approved' ? 'bg-green-100 text-green-800' :
              user.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {user.status === 'approved' && <CheckCircle className="h-3.5 w-3.5" />}
              {user.status === 'rejected' && <XCircle className="h-3.5 w-3.5" />}
              {user.status}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
              user.role === 'reporter' ? 'bg-blue-100 text-blue-800' : user.role === 'both' ? 'bg-violet-100 text-violet-800' : 'bg-green-100 text-green-800'
            }`}>
              {user.role}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${isProfileComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {isProfileComplete ? 'Profile Complete' : `Profile Incomplete (${filledFields}/${requiredFields.length})`}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        {/* Profile Card */}
        <Card className="border-gray-200 shadow-sm transition-shadow duration-200 hover:shadow-md xl:col-span-4">
          <CardHeader className="border-b border-gray-100 bg-gray-50/80 pb-4">
            <div className="flex flex-col gap-3">
              <CardTitle className="text-lg">Profile Details</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setNewEmail(user.email || '');
                  setNewPassword('');
                  setShowCredModal(true);
                }} className="h-8 text-xs flex items-center gap-1.5 border-blue-200 bg-blue-50 font-medium text-blue-700 transition-colors hover:bg-blue-100">
                  <KeyRound className="w-3.5 h-3.5" /> Edit Login
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendProfileMail}
                  disabled={isResendingProfileMail}
                  className="h-8 text-xs flex items-center gap-1.5 border-emerald-200 bg-emerald-50 font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  {isResendingProfileMail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  Resend Profile Mail
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {(user.profile?.full_name || user.metadata?.full_name || 'N')[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold leading-tight text-gray-900">
                    {user.profile?.full_name || user.metadata?.full_name || 'No Name Found'}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">General profile and access information</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 transition-shadow duration-200 hover:shadow">
              <h4 className="text-sm font-semibold text-gray-900">Role Management</h4>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as AssignableRole)}
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm transition-colors focus:border-blue-300 focus:outline-none"
                >
                  <option value="buyer">Buyer</option>
                  <option value="reporter">Reporter</option>
                  <option value="both">Both</option>
                </select>
                <Button
                  size="sm"
                  onClick={handleRoleUpdate}
                  disabled={isUpdatingRole || selectedRole === user.role}
                  className="h-10 transition-colors"
                >
                  {isUpdatingRole ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                  Update Role
                </Button>
              </div>
              <p className="text-xs text-gray-500">Master admin can switch this user between buyer, reporter, or both roles.</p>
            </div>

            <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 text-sm transition-shadow duration-200 hover:shadow">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{user.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{user.profile?.phone || user.phone || user.application_phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{user.profile?.city || 'N/A'}</span>
              </div>
            </div>

            {isReporter && user.profile?.bank_name && (
              <div className="space-y-2 rounded-xl border border-gray-100 bg-white p-4 transition-shadow duration-200 hover:shadow">
                <h4 className="text-sm font-semibold text-gray-900">Bank Details</h4>
                <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
                  <p><span className="font-medium text-gray-800">Bank:</span> {user.profile.bank_name}</p>
                  <p><span className="font-medium text-gray-800">Account:</span> {user.profile.account_number}</p>
                  <p><span className="font-medium text-gray-800">IFSC:</span> {user.profile.ifsc_code}</p>
                </div>
              </div>
            )}

            {isReporter && user.profile?.generated_password && (
              <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4 transition-shadow duration-200 hover:shadow">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-green-900">
                    <KeyRound className="h-4 w-4" />
                    Auto-Generated Credentials
                  </h4>
                  <p className="mt-1 text-xs text-green-700">Share these with the reporter if email was not delivered.</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-white p-3 text-xs font-mono">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-green-700">Password:</span>
                    <span className="font-bold text-gray-900 break-all">{user.profile.generated_password}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(user.profile.generated_password);
                        setCopiedPassword(true);
                        setTimeout(() => setCopiedPassword(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-200"
                    >
                      {copiedPassword ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedPassword ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isReporter && user.profile?.id_proof_url && (
              <div className="rounded-xl border border-gray-100 bg-white p-4 transition-shadow duration-200 hover:shadow">
                <a href={user.profile.id_proof_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="h-9 w-full text-xs transition-colors hover:bg-slate-50">View ID Proof</Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity & Records */}
        <div className="space-y-6 xl:col-span-8">
          {isReporter && (
            <Card className="border-gray-200 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <CardHeader className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-gray-500" /> News Submissions</CardTitle>
                  <CardDescription>All stories submitted by this reporter</CardDescription>
                </div>
                <div className="rounded border border-gray-200 bg-white px-3 py-1 text-sm font-semibold shadow-sm">
                  Total: {news.length}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {news.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {news.map((item: any) => (
                      <li key={item.id} className="p-4 transition-all duration-200 hover:bg-gray-50 sm:hover:translate-x-0.5">
                        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                          <Link href={`/dashboard/admin/review/${item.id}`} className="group min-w-0">
                            <h4 className="font-semibold text-gray-900 transition-colors group-hover:text-primary line-clamp-1">{item.title}</h4>
                          </Link>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            item.status === 'published' ? 'bg-green-100 text-green-700' :
                            item.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                            item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="mb-2 line-clamp-1 text-xs text-gray-500">{item.description}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-gray-500">
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1 text-green-600"><IndianRupee className="h-3 w-3" /> {item.reporter_price}</span>
                          <span>{item.city}, {item.state}</span>
                          <Link href={`/dashboard/admin/review/${item.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                            <Eye className="h-3.5 w-3.5" /> Open
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">No stories submitted yet.</div>
                )}
              </CardContent>
            </Card>
          )}

          {isBuyer && (
            <Card className="border-gray-200 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <CardHeader className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg"><ShoppingCart className="h-5 w-5 text-gray-500" /> Purchase History</CardTitle>
                  <CardDescription>All exclusive stories purchased by this agency</CardDescription>
                </div>
                <div className="rounded border border-gray-200 bg-white px-3 py-1 text-sm font-semibold shadow-sm">
                  Total: {transactions.length}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {transactions.map((txn: any) => (
                      <li key={txn.id} className="p-4 transition-all duration-200 hover:bg-gray-50 sm:hover:translate-x-0.5">
                        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                          <h4 className="font-semibold text-gray-900">{txn.news?.title || 'Unknown News'}</h4>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            txn.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {txn.payment_status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                          <span>Purchased: {new Date(txn.purchase_date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1 font-bold text-green-600"><IndianRupee className="h-3 w-3" /> {(txn.reporter_amount + txn.platform_margin).toLocaleString()}</span>
                          <span className="font-mono text-gray-400">TXN: {txn.razorpay_payment_id || txn.id.substring(0,8)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">No purchases made yet.</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Update Credentials Modal */}
      {showCredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-6 py-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                Update Login Credentials
              </h3>
              <button 
                onClick={() => {
                  setShowCredModal(false);
                  setGeneratedResetLink('');
                }}
                className="text-xl font-bold text-gray-400 transition-colors hover:text-gray-600"
              >✕</button>
            </div>
            
            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
              {generatedResetLink && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 space-y-2">
                  <p className="font-semibold flex items-center gap-1.5"><Mail className="w-4 h-4" /> Email server pending setup.</p>
                  <p className="text-xs opacity-90">However, a secure reset link was generated! Manually copy and share this link:</p>
                  <div className="flex gap-2 mt-2">
                    <Input value={generatedResetLink} readOnly className="bg-white h-8 text-xs font-mono" />
                    <Button
                      size="sm"
                      className="h-8 shrink-0 bg-blue-600 transition-colors hover:bg-blue-700"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedResetLink);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                    >
                      {copiedLink ? <CheckCircle className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                      {copiedLink ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">🔒</span>
                <p>For security, Supabase permanently hashes passwords. You <strong>cannot view</strong> the current password, but you can securely reset it below.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 flex justify-between">
                  <span>New Password</span>
                  <span className="text-xs text-gray-400 font-normal">Leave blank to keep unchanged</span>
                </Label>
                <div className="flex gap-2">
                  <Input 
                    id="password" 
                    type="text" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="flex-1 font-mono"
                  />
                  {newPassword && (
                    <Button variant="outline" size="icon" onClick={copyPassword} className="shrink-0 transition-colors hover:bg-slate-100" title="Copy Password">
                      {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                    </Button>
                  )}
                  <Button variant="outline" onClick={generatePassword} className="shrink-0 flex gap-2 w-auto bg-gray-50 transition-colors hover:bg-gray-100">
                    <Wand2 className="w-4 h-4 opacity-70" /> Auto
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex flex-col gap-3">
              {!generatedResetLink && (
                <Button
                  variant="outline"
                  className="w-full border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100 hover:text-blue-800"
                  onClick={handleSendResetLink}
                  disabled={isSendingLink || isUpdatingCreds || !newEmail}
                >
                  {isSendingLink ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                  Send Reset Link to User's Email
                </Button>
              )}
              <div className="flex justify-end gap-3 w-full">
                <Button variant="outline" className="transition-colors hover:bg-slate-100" onClick={() => {
                  setShowCredModal(false);
                  setGeneratedResetLink('');
                }}>Cancel</Button>
                <Button 
                  onClick={handleUpdateCreds} 
                  disabled={isUpdatingCreds || (!newEmail && !newPassword)}
                  className="min-w-[100px] bg-blue-600 text-white transition-colors hover:bg-blue-700"
                >
                  {isUpdatingCreds ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
