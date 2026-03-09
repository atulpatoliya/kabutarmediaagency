"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle, XCircle, Mail, Phone, MapPin, IndianRupee, FileText, ShoppingCart, Loader2, KeyRound, Wand2, Copy } from 'lucide-react';
import Link from 'next/link';

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
          // If Resend is not configured, we still get the link back safely
          alert(`Reset link generated but email could not be sent. You can manually copy the link: \n\n${result.resetLink}`);
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
  const isReporter = user.role === 'reporter';

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/users">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.profile?.full_name || user.metadata?.full_name || 'No Name Found'}</h1>
          <p className="text-gray-600 mt-1 font-mono text-sm">ID: {user.id}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-1 border-gray-200">
          <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
            <CardTitle className="text-lg flex justify-between items-center">
              Profile Details
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setNewEmail(user.email || '');
                  setNewPassword('');
                  setShowCredModal(true);
                }} className="h-7 text-xs flex items-center gap-1.5 font-medium border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100">
                  <KeyRound className="w-3.5 h-3.5" /> Edit Login
                </Button>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  user.status === 'approved' ? 'bg-green-100 text-green-800' :
                  user.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {user.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                  {user.status === 'rejected' && <XCircle className="w-3 h-3" />}
                  {user.status}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                {(user.profile?.full_name || user.metadata?.full_name || "N")[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                  {user.profile?.full_name || user.metadata?.full_name || 'No Name Found'}
                </h3>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mt-1 capitalize ${
                  isReporter ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {user.role}
                </span>
              </div>
            </div>
            
            <div className="border-t border-gray-100 pt-4 space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{user.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{user.profile?.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{user.profile?.city || 'N/A'}</span>
              </div>
            </div>

            {isReporter && user.profile?.bank_name && (
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <h4 className="font-semibold text-sm text-gray-900">Bank Details</h4>
                <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 text-gray-600">
                  <p><span className="font-medium text-gray-800">Bank:</span> {user.profile.bank_name}</p>
                  <p><span className="font-medium text-gray-800">Account:</span> {user.profile.account_number}</p>
                  <p><span className="font-medium text-gray-800">IFSC:</span> {user.profile.ifsc_code}</p>
                </div>
              </div>
            )}
            
            {isReporter && user.profile?.id_proof_url && (
              <div className="border-t border-gray-100 pt-4">
                <a href={user.profile.id_proof_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full text-xs h-8">View ID Proof</Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity & Records */}
        <div className="md:col-span-2 space-y-6">
          {isReporter ? (
            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-gray-500" /> News Submissions</CardTitle>
                  <CardDescription>All stories submitted by this reporter</CardDescription>
                </div>
                <div className="bg-white px-3 py-1 rounded text-sm font-semibold border border-gray-200 shadow-sm">
                  Total: {news.length}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {news.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {news.map((item: any) => (
                      <li key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-gray-900">{item.title}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            item.status === 'published' ? 'bg-green-100 text-green-700' :
                            item.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                            item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2 line-clamp-1">{item.description}</p>
                        <div className="flex gap-4 text-xs font-medium text-gray-500">
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1 text-green-600"><IndianRupee className="h-3 w-3" /> {item.reporter_price}</span>
                          <span>{item.city}, {item.state}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">No stories submitted yet.</div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-gray-500" /> Purchase History</CardTitle>
                  <CardDescription>All exclusive stories purchased by this agency</CardDescription>
                </div>
                <div className="bg-white px-3 py-1 rounded text-sm font-semibold border border-gray-200 shadow-sm">
                  Total: {transactions.length}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {transactions.map((txn: any) => (
                      <li key={txn.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-gray-900">{txn.news?.title || 'Unknown News'}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            txn.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {txn.payment_status}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs mt-2 text-gray-600">
                          <span>Purchased: {new Date(txn.purchase_date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1 text-green-600 font-bold"><IndianRupee className="h-3 w-3" /> {(txn.reporter_amount + txn.platform_margin).toLocaleString()}</span>
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                Update Login Credentials
              </h3>
              <button 
                onClick={() => setShowCredModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >✕</button>
            </div>
            
            <div className="p-6 space-y-5">
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
                    <Button variant="outline" size="icon" onClick={copyPassword} className="shrink-0" title="Copy Password">
                      {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                    </Button>
                  )}
                  <Button variant="outline" onClick={generatePassword} className="shrink-0 flex gap-2 w-auto bg-gray-50">
                    <Wand2 className="w-4 h-4 opacity-70" /> Auto
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
              <Button 
                variant="outline"
                className="w-full text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:text-blue-800"
                onClick={handleSendResetLink} 
                disabled={isSendingLink || isUpdatingCreds || !newEmail}
              >
                {isSendingLink ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                Send Reset Link to User's Email
              </Button>
              <div className="flex justify-end gap-3 w-full">
                <Button variant="outline" onClick={() => setShowCredModal(false)}>Cancel</Button>
                <Button 
                  onClick={handleUpdateCreds} 
                  disabled={isUpdatingCreds || (!newEmail && !newPassword)}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
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
