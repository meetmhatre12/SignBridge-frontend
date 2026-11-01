import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

const PERMISSIONS = [
  ['users.read', 'View learner records'],
  ['users.manage', 'Suspend and restore learners'],
  ['analytics.read', 'View analytics'],
  ['certificates.manage', 'Manage certificate requests'],
  ['content.manage', 'Manage learning content'],
  ['audit.read', 'View audit history'],
  ['data.export', 'Export learner reports']
] as const;

export const AdminAccessPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['users.read', 'analytics.read', 'certificates.manage', 'audit.read']);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const response = await api.getAdminAdministrators();
    if (!response.success) {
      setError(response.error || 'Unable to load administrator access records.');
      setLoading(false);
      return;
    }
    setData(response.data);
    if (response.data?.canManageAdministrators) {
      const inviteResponse = await api.getAdminInvitations();
      if (inviteResponse.success) setInvitations(inviteResponse.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const togglePermission = (permission: string) => {
    setPermissions(current => current.includes(permission)
      ? current.filter(item => item !== permission)
      : [...current, permission]);
  };

  const invite = async () => {
    setBusy(true); setError(''); setMessage('');
    const response = await api.inviteAdministrator(email, permissions);
    if (!response.success) setError(response.error || 'Unable to send invitation.');
    else { setMessage(`Invitation sent to ${email}. The recipient must sign in with that verified email to accept.`); setEmail(''); await load(); }
    setBusy(false);
  };

  const revokeInvitation = async (id: string) => {
    if (!window.confirm('Revoke this pending administrator invitation?')) return;
    const response = await api.revokeAdministratorInvitation(id);
    if (!response.success) setError(response.error || 'Unable to revoke invitation.');
    else { setMessage('Invitation revoked.'); await load(); }
  };

  const revokeAdmin = async (id: string, name: string) => {
    if (!window.confirm(`Revoke administrator access for ${name}? Their active SignBridge sessions will also be invalidated.`)) return;
    const response = await api.revokeAdministrator(id);
    if (!response.success) setError(response.error || 'Unable to revoke administrator access.');
    else { setMessage('Administrator access revoked.'); await load(); }
  };

  const updatePreset = async (id: string, preset: 'read' | 'standard') => {
    const next = preset === 'read'
      ? ['users.read', 'analytics.read', 'audit.read']
      : ['users.read', 'users.manage', 'analytics.read', 'certificates.manage', 'content.manage', 'audit.read', 'data.export'];
    const response = await api.updateAdministratorPermissions(id, next);
    if (!response.success) setError(response.error || 'Unable to update permissions.');
    else { setMessage('Administrator permissions updated.'); await load(); }
  };

  const admins = data?.administrators || [];
  const canManage = Boolean(data?.canManageAdministrators);

  return <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-8 sm:px-6">
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div><Link to="/admin" className="text-sm font-bold text-amber-700 dark:text-amber-300">← Admin Studio</Link><p className="mt-3 text-xs uppercase tracking-widest text-amber-700 dark:text-amber-300 font-bold">Administration / Security</p><h1 className="text-3xl font-black mt-1">Administrator access</h1><p className="text-sm text-slate-500 mt-2">Verified-email invitations, scoped permissions and access revocation.</p></div>
        <button onClick={()=>void load()} className="rounded-xl px-4 py-2.5 bg-slate-900 text-white dark:bg-amber-300 dark:text-slate-950 text-sm font-bold">Refresh</button>
      </header>
      {error&&<p role="alert" className="rounded-xl bg-rose-50 text-rose-700 p-3 text-sm">{error}</p>}
      {message&&<p role="status" className="rounded-xl bg-emerald-50 text-emerald-800 p-3 text-sm">{message}</p>}
      {loading?<p className="py-16 text-center text-slate-500">Loading administrator access…</p>:<>
        {!canManage&&<div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/20 p-4 text-sm">Only a server-allowlisted super administrator can invite, change or revoke administrator access. This account has read access only.</div>}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">Administrator accounts</h2><span className="text-xs text-slate-500">{admins.length} accounts</span></div>
          <div className="space-y-3">{admins.map((admin:any)=><article key={admin.id} className="rounded-xl border border-slate-100 dark:border-slate-800 p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3"><div className="flex-1 min-w-0"><b>{admin.fullName}</b><p className="text-sm text-slate-500 break-all">{admin.email}</p><p className="text-xs mt-1">{admin.accessType} · {admin.status} · {admin.emailVerified?'Verified email':'Unverified email'}</p><p className="text-xs text-slate-500 mt-1">Permissions: {(admin.permissions||[]).join(', ')||'No scoped permissions'}</p></div>
              {canManage&&admin.accessType!=='SUPER_ADMIN'&&<div className="flex flex-wrap gap-2"><button onClick={()=>void updatePreset(admin.id,'read')} className="rounded-lg border px-3 py-2 text-xs font-bold">Read-only</button><button onClick={()=>void updatePreset(admin.id,'standard')} className="rounded-lg border px-3 py-2 text-xs font-bold">Standard access</button><button onClick={()=>void revokeAdmin(admin.id,admin.fullName)} className="rounded-lg bg-rose-50 text-rose-700 px-3 py-2 text-xs font-bold">Revoke access</button></div>}
            </div>
          </article>)}{!admins.length&&<p className="text-sm text-slate-500">No administrator accounts found.</p>}</div>
        </section>
        {canManage&&<>
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div><h2 className="text-lg font-black">Invite administrator</h2><p className="text-sm text-slate-500 mt-1">The recipient must already have a verified SignBridge account. Invitations expire after 72 hours. No shared or temporary password is created.</p></div>
            <div className="flex flex-col sm:flex-row gap-2"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Verified SignBridge account email" className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm"/><button disabled={busy||!email.trim()||!permissions.length} onClick={()=>void invite()} className="rounded-xl bg-amber-500 text-slate-950 px-5 py-3 text-sm font-black disabled:opacity-40">{busy?'Sending…':'Send invitation'}</button></div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{PERMISSIONS.map(([id,label])=><label key={id} className="flex items-center gap-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 p-3"><input type="checkbox" checked={permissions.includes(id)} onChange={()=>togglePermission(id)}/>{label}</label>)}</div>
          </section>
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h2 className="text-lg font-black">Invitation history</h2>
            {invitations.map((invite:any)=><div key={invite.id} className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3"><div className="flex-1"><b className="text-sm">{invite.email}</b><p className="text-xs text-slate-500">Created {new Date(invite.createdAt).toLocaleString()} · Expires {new Date(invite.expiresAt).toLocaleString()}</p><p className="text-xs">{invite.acceptedAt?'Accepted':invite.revokedAt?'Revoked':Date.parse(invite.expiresAt)<=Date.now()?'Expired':'Pending'}</p></div>{!invite.acceptedAt&&!invite.revokedAt&&Date.parse(invite.expiresAt)>Date.now()&&<button onClick={()=>void revokeInvitation(invite.id)} className="rounded-lg bg-rose-50 text-rose-700 px-3 py-2 text-xs font-bold">Revoke invitation</button>}</div>)}
            {!invitations.length&&<p className="text-sm text-slate-500">No invitations have been created.</p>}
          </section>
        </>}
      </>}
    </div>
  </main>;
};
