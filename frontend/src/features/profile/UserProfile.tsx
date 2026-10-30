import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Lock, User, Mail, Phone, KeyRound, LogOut, Camera, CheckCircle2, ShieldCheck } from 'lucide-react';

export const UserProfile: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMode, setPasswordMode] = useState<'change' | 'set'>('change');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setFullName(user?.fullName || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setAge(user?.age ? String(user.age) : '');
    setAvatar(user?.avatar || '');
    setAvatarLoadFailed(false);
  }, [user]);

  if (!user) return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
        <Lock className="mx-auto w-10 h-10 text-cyan-600" />
        <h1 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">Sign in to access your profile</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Profile details, account changes and password management are private.</p>
        <button onClick={onOpenAuth} className="mt-6 px-6 py-3 rounded-xl bg-cyan-600 text-white font-bold text-sm">Sign In / Create Account</button>
      </div>
    </div>
  );

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMessage(''); setError('');
    try {
      const cleanName = fullName.trim().replace(/\s+/g, ' ');
      const cleanPhone = phone.replace(/[()\s-]/g, '');
      if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(cleanName)) throw new Error('Please enter a valid full name.');
      if (cleanPhone && !/^(?:\+91)?[6-9]\d{9}$/.test(cleanPhone)) throw new Error('Phone number must be a valid 10-digit Indian mobile number.');
      const parsedAge = age.trim() ? Number(age) : undefined;
      if (parsedAge !== undefined && (!Number.isInteger(parsedAge) || parsedAge < 13 || parsedAge > 120)) throw new Error('Age must be a whole number between 13 and 120.');
      await updateUser({ fullName: cleanName, phone: cleanPhone, age: parsedAge, avatar });
      setMessage('Profile details updated successfully.');
    } catch (e: any) { setError(e.message || 'Unable to update profile.'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage(''); setError('');
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) { setError('Password must be 8+ characters and include a letter and a number.'); return; }
    if (newPassword !== confirmPassword) { setError('New password and confirmation do not match.'); return; }
    setSaving(true);
    try {
      const res = passwordMode === 'set'
        ? await api.setPassword(newPassword)
        : await api.changePassword(currentPassword, newPassword);
      if (!res.success) throw new Error(res.error || 'Unable to update password.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordMode('change');
      setMessage(passwordMode === 'set' ? 'SignBridge password created successfully.' : 'Password changed successfully.');
    } catch (e: any) { setError(e.message || 'Unable to update password.'); }
    finally { setSaving(false); }
  };

  const signOut = () => { logout(); navigate('/'); };
  const input = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-500';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative group"><div className="w-16 h-16 rounded-2xl bg-cyan-600 text-white overflow-hidden flex items-center justify-center text-2xl font-black">{avatar && !avatarLoadFailed ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" onError={() => setAvatarLoadFailed(true)} /> : user.authProvider === 'google' ? <User className="w-7 h-7 opacity-80" /> : <span>{user.fullName?.charAt(0).toUpperCase()}</span>}</div>{<label className="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center cursor-pointer shadow-lg border-2 border-white dark:border-slate-900" title="Choose profile image"><Camera className="w-4 h-4" /><input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { const file=e.target.files?.[0]; if(!file)return; if(file.size>1024*1024){setError("Profile image must be 1 MB or smaller.");return;} const r=new FileReader(); r.onload=()=>{setAvatar(String(r.result||'')); setAvatarLoadFailed(false);}; r.readAsDataURL(file); }} /></label>}</div>
          <div><h1 className="text-2xl font-black text-slate-900 dark:text-white">My Profile</h1><p className="text-sm text-slate-500">{user.email}</p></div>
        </div>
        <button onClick={signOut} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200"><LogOut className="w-4 h-4" /> Sign Out</button>
      </header>

      {message && <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{message}</div>}
      {error && <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</div>}

      <form onSubmit={saveProfile} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5">
        <div><h2 className="text-lg font-black text-slate-900 dark:text-white">Account details</h2><p className="text-sm text-slate-500 mt-1">Update your personal details. Age is optional; upload a JPG, PNG or WebP profile photo up to 1 MB.</p></div>
        <label className="block"><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Full name</span><div className="relative mt-1"><User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><input className={`${input} pl-10`} value={fullName} onChange={e => setFullName(e.target.value)} required /></div></label>
        <label className="block"><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Email address</span><div className="relative mt-1"><Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><input type="email" className={`${input} pl-10 opacity-70 cursor-not-allowed`} value={email} readOnly aria-readonly="true" /></div><span className="mt-1 block text-[11px] text-slate-400">Verified account email cannot be changed from Profile.</span></label>
        <label className="block"><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone number</span><div className="relative mt-1"><Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><input type="tel" className={`${input} pl-10`} value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" /></div></label>
        <label className="block"><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Age (optional)</span><input type="number" min="13" max="120" step="1" inputMode="numeric" className={`${input} mt-1`} value={age} onChange={e => setAge(e.target.value)} placeholder="Enter age" /><span className="mt-1 block text-[11px] text-slate-400">Enter a whole number between 13 and 120. You do not need to provide your date of birth.</span></label>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-500 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Email verified: {user.emailVerified ? "Yes" : "No"}{user.authProvider === 'google' ? ' · You can upload a profile photo.' : ' · You can use a local profile photo.'}</div>
        <button disabled={saving} className="px-5 py-3 rounded-xl bg-cyan-600 text-white font-bold text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save Account Changes'}</button>
      </form>

      {user.authProvider === 'google' ? (
        <form onSubmit={changePassword} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5">
          <div className="flex items-start gap-3"><KeyRound className="w-5 h-5 text-cyan-600 mt-0.5"/><div><h2 className="text-lg font-black text-slate-900 dark:text-white">SignBridge password</h2><p className="text-sm text-slate-500 mt-1">Google handles your Google password. SignBridge can also use a separate password for email/password sign-in.</p></div></div>
          {!user.hasPassword && passwordMode === 'change' && <button type="button" onClick={() => setPasswordMode('set')} className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black">Create SignBridge password</button>}
          {!user.hasPassword && passwordMode === 'change' && <div className="text-xs text-slate-500">No SignBridge password is set yet.</div>}
          {passwordMode === 'change' && user.authProvider === 'google' && user.hasPassword && <><input type="password" className={input} placeholder="Current SignBridge password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /><input type="password" className={input} placeholder="New SignBridge password (8+ characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required /><input type="password" className={input} placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /><button type="submit" disabled={saving} className="px-5 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Change Password'}</button></>}
          {passwordMode === 'set' && <><input type="password" className={input} placeholder="New SignBridge password (8+ characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required /><input type="password" className={input} placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /><div className="flex gap-2"><button type="submit" disabled={saving} className="px-5 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Create Password'}</button><button type="button" onClick={() => { setPasswordMode('change'); setNewPassword(''); setConfirmPassword(''); }} className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold">Cancel</button></div></>}
        </form>
      ) : <form onSubmit={changePassword} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-3"><KeyRound className="w-5 h-5 text-cyan-600 mt-0.5"/><div><h2 className="text-lg font-black text-slate-900 dark:text-white">Change password</h2><p className="text-sm text-slate-500 mt-1">Verify your current password before creating a new one.</p></div></div>
        <input type="password" className={input} placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
        <input type="password" className={input} placeholder="New password (8+ characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
        <input type="password" className={input} placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        <button disabled={saving} className="px-5 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm disabled:opacity-60">{saving ? 'Updating…' : 'Update Password'}</button>
      </form>}

      <div className="rounded-2xl border border-cyan-100 dark:border-cyan-900 bg-cyan-50/70 dark:bg-cyan-950/30 p-4 flex gap-3 text-sm text-cyan-800 dark:text-cyan-200"><ShieldCheck className="w-5 h-5 shrink-0"/><span>Your profile and private learning records are scoped to your authenticated account. Email/password accounts must verify their email before activation. Google accounts are verified by Google.</span></div>
    </div>
  );
};
