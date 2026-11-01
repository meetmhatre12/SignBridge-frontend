import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

export const AdminCertificateRequestsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    const result = await api.getAdminCertificateRequests();
    if (result.success) setItems(result.data || []);
    else setError(result.error || 'Unable to load certificate requests.');
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const review = async (id: string, action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? window.prompt('Reason for rejecting this certificate request:') : '';
    if (action === 'reject' && reason === null) return;
    if (action === 'approve' && !window.confirm('Approve this request and issue the QR-verifiable certificate?')) return;
    setBusy(id); setError('');
    const result = action === 'approve'
      ? await api.approveCertificateRequest(id)
      : await api.rejectCertificateRequest(id, reason || 'Does not meet issuance requirements.');
    if (!result.success) setError(result.error || 'Unable to process this request.');
    await load(); setBusy(null);
  };
  const pending = items.filter(item => item.status === 'PENDING');
  return <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-8 sm:px-6">
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><Link to="/admin" className="text-sm font-bold text-amber-700 dark:text-amber-300">← Admin Studio</Link><p className="mt-3 text-xs uppercase tracking-widest text-amber-700 font-bold">Administration / Certification</p><h1 className="mt-1 text-3xl font-black">Certificate Requests</h1><p className="mt-2 text-sm text-slate-500">Review eligibility and assessment evidence before issuing a certificate.</p></div>
        <button onClick={() => void load()} className="rounded-xl px-4 py-2.5 bg-slate-900 text-white dark:bg-amber-300 dark:text-slate-950 text-sm font-bold">Refresh</button>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[['Total requests',items.length],['Pending review',pending.length],['Reviewed',items.length-pending.length]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"><p className="text-xs text-slate-500 font-bold uppercase">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 text-rose-700 p-3 text-sm">{error}</p>}
      {loading ? <p className="py-16 text-center text-slate-500">Loading requests…</p> : items.length === 0 ? <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">No certificate requests yet.</div> :
        <div className="space-y-3">{items.map(item=><article key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black text-lg">{item.userName}</p><p className="text-sm text-slate-500">{item.userEmail} · {item.courseTitle}</p><p className="text-xs text-slate-500 mt-1">Request {item.id} · {new Date(item.requestedAt).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${item.status==='PENDING'?'bg-amber-100 text-amber-800':item.status==='APPROVED'?'bg-emerald-100 text-emerald-800':'bg-rose-100 text-rose-800'}`}>{item.status}</span></div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"><div><p className="text-xs text-slate-500">Level</p><b>{item.levelNumber}</b></div><div><p className="text-xs text-slate-500">Assessment score</p><b>{item.score}%</b></div><div><p className="text-xs text-slate-500">Passing score</p><b>{item.passingScore}%</b></div><div><p className="text-xs text-slate-500">Attempt ID</p><b className="font-mono text-xs">{item.attemptId}</b></div></div>
          {item.reviewNote && <p className="mt-3 text-sm text-rose-600">Review note: {item.reviewNote}</p>}
          {item.status==='PENDING' && <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy===item.id} onClick={()=>void review(item.id,'approve')} className="rounded-xl px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">{busy===item.id?'Processing…':'Approve & Issue Certificate'}</button><button disabled={busy===item.id} onClick={()=>void review(item.id,'reject')} className="rounded-xl px-4 py-2.5 border border-rose-300 text-rose-700 dark:text-rose-300 text-sm font-bold disabled:opacity-50">Reject request</button></div>}
        </article>)}</div>}
    </div>
  </main>;
};
