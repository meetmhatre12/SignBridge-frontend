import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';

export const AdminInvitationAcceptPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const accept = async () => {
    setBusy(true); setError(''); setMessage('');
    const response = await api.acceptAdministratorInvitation(token);
    if (!response.success) setError(response.error || 'Unable to accept this invitation.');
    else setMessage('Administrator access has been granted. Refresh your session to load the new administrator permissions.');
    setBusy(false);
  };

  return <main className="min-h-[70vh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-16">
    <section className="max-w-lg mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 space-y-4">
      <p className="text-xs uppercase tracking-widest font-bold text-amber-700 dark:text-amber-300">SignBridge security</p>
      <h1 className="text-2xl font-black">Accept administrator invitation</h1>
      <p className="text-sm text-slate-500">Sign in with the same verified email address that received the invitation. Invitation tokens are single-use and expire after 72 hours.</p>
      {!token&&<p role="alert" className="rounded-xl bg-rose-50 text-rose-700 p-3 text-sm">Invitation token is missing. Open the original invitation email link.</p>}
      {error&&<p role="alert" className="rounded-xl bg-rose-50 text-rose-700 p-3 text-sm">{error}</p>}
      {message&&<div role="status" className="rounded-xl bg-emerald-50 text-emerald-800 p-3 text-sm space-y-2"><p>{message}</p><button onClick={()=>window.location.assign('/admin')} className="font-bold underline">Reload Admin Studio</button></div>}
      {!message&&<button disabled={!token||busy} onClick={()=>void accept()} className="w-full rounded-xl bg-amber-500 text-slate-950 px-5 py-3 font-black disabled:opacity-40">{busy?'Verifying invitation…':'Accept invitation'}</button>}
      <Link to="/" className="block text-center text-sm text-slate-500">Return to SignBridge</Link>
    </section>
  </main>;
};
