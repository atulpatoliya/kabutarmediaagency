"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Inbox, Mail, Phone, Calendar, CheckCircle, XCircle, Copy, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

type TabType = 'all' | 'buyer' | 'reporter';
type ModalData = {
  action: 'approved' | 'rejected';
  credentials?: { email: string; password: string; loginLink: string };
  emailTemplate?: { to: string; subject: string; body: string };
} | null;

export default function AdminApplicationsDashboard() {
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [modal, setModal] = useState<ModalData>(null);
  const [copied, setCopied] = useState('');

  const supabase = createClient();

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) { console.error('Fetch error:', error); }
      else if (data) { setApplications(data); }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); }, [supabase]);

  const handleAction = async (app: any, action: 'approve' | 'reject') => {
    setActionLoading(app.id + action);
    try {
      const res = await fetch('/api/admin/process-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: app.id,
          action,
          email: app.email,
          name: app.full_name,
          type: app.type
        })
      });

      const result = await res.json();

      if (!res.ok || (!result.success && res.status !== 409)) {
        alert(result.error || 'Something went wrong. Please try again.');
        return;
      }

      // Update local state
      setApplications(prev =>
        prev.map(a => a.id === app.id ? {
          ...a,
          status: action === 'approve' ? 'approved' : 'rejected'
        } : a)
      );

      // Show modal with email template / credentials
      setModal({
        action: action === 'approve' ? 'approved' : 'rejected',
        credentials: result.credentials,
        emailTemplate: result.emailTemplate
      });

    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred.');
    } finally {
      setActionLoading(null);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    contacted: 'bg-purple-100 text-purple-800',
    archived: 'bg-gray-100 text-gray-700',
  };

  const pendingApplications = applications.filter(a => a.status === 'pending');

  const tabItems: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: 'All Applications', count: pendingApplications.length },
    { key: 'buyer', label: '🏢 Buyers', count: pendingApplications.filter(a => a.type === 'buyer').length },
    { key: 'reporter', label: '📰 Reporters', count: pendingApplications.filter(a => a.type === 'reporter').length },
  ];

  const filtered = activeTab === 'all' ? pendingApplications : pendingApplications.filter(a => a.type === activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lead Applications Panel</h1>
        <p className="text-gray-600 mt-1">Review contact form submissions to onboard new Buyers and Reporters.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabItems.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2 ${activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-gray-500">Loading applications...</p>
          </CardContent>
        </Card>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900">Applicant Details</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Type</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Date</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 text-center min-w-[200px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 text-base mb-1">{app.full_name}</div>
                      <div className="text-gray-500 flex items-center gap-1.5 text-xs mb-1"><Mail className="w-3 h-3" /> {app.email}</div>
                      <div className="text-gray-500 flex items-center gap-1.5 text-xs mb-2"><Phone className="w-3 h-3" /> {app.phone}</div>
                      {app.message && (
                        <div className="text-gray-400 italic border-l-2 border-gray-200 pl-2 text-xs">"{app.message}"</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold capitalize ${
                        app.type === 'reporter' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {app.type === 'reporter' ? '📰' : '🏢'} {app.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" /> {new Date(app.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[app.status] || 'bg-gray-100 text-gray-700'}`}>
                        {app.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {app.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                        {app.status !== 'approved' && app.status !== 'rejected' ? (
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            disabled={!!actionLoading}
                            onClick={() => handleAction(app, 'approve')}
                            className="bg-green-600 hover:bg-green-700 text-white gap-1"
                          >
                            {actionLoading === app.id + 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!!actionLoading}
                            onClick={() => handleAction(app, 'reject')}
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-1"
                          >
                            {actionLoading === app.id + 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-gray-400">No actions required</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 text-blue-400" />
            </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Applications in this category</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
                  Applications will appear here automatically when forms are submitted.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Result Modal */}
      {modal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>

            {modal.action === 'approved' ? (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Application Approved ✅</h2>
                    <p className="text-sm text-gray-500">Account created. Share credentials with the user.</p>
                  </div>
                </div>

                {modal.credentials && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-5">
                    <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">Login Credentials</h3>
                    <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
                      <span className="text-sm text-gray-700"><span className="font-medium">Email:</span> {modal.credentials.email}</span>
                      <button onClick={() => copyText(modal.credentials!.email, 'email')} className="text-gray-400 hover:text-primary ml-2">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
                      <span className="text-sm text-gray-700"><span className="font-medium">Password:</span> <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{modal.credentials.password}</code></span>
                      <button onClick={() => copyText(modal.credentials!.password, 'password')} className="text-gray-400 hover:text-primary ml-2">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <a href={modal.credentials.loginLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                      <ExternalLink className="w-4 h-4" /> {modal.credentials.loginLink}
                    </a>
                  </div>
                )}

                {modal.emailTemplate && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email Template to Send</span>
                      <button
                        onClick={() => copyText(modal.emailTemplate!.body, 'body')}
                        className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                      >
                        <Copy className="w-3 h-3" /> {copied === 'body' ? 'Copied!' : 'Copy All'}
                      </button>
                    </div>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap px-4 py-3 max-h-52 overflow-y-auto font-sans leading-relaxed">{modal.emailTemplate.body}</pre>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Application Rejected</h2>
                    <p className="text-sm text-gray-500">Use the template below to inform the applicant.</p>
                  </div>
                </div>

                {modal.emailTemplate && (
                  <div className="border border-red-100 rounded-xl overflow-hidden mb-5">
                    <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Rejection Email Template</span>
                      <button
                        onClick={() => copyText(modal.emailTemplate!.body, 'reject-body')}
                        className="text-xs text-red-600 font-medium flex items-center gap-1 hover:underline"
                      >
                        <Copy className="w-3 h-3" /> {copied === 'reject-body' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="px-4 py-2 bg-red-50/30 text-xs text-red-500 border-b border-red-100">
                      To: <strong>{modal.emailTemplate.to}</strong>
                    </div>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap px-4 py-3 max-h-48 overflow-y-auto font-sans leading-relaxed">{modal.emailTemplate.body}</pre>
                  </div>
                )}
              </>
            )}

            <Button onClick={() => setModal(null)} className="w-full">Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
