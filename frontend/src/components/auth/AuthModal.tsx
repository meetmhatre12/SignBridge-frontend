import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Mail, User, Phone, ArrowRight, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { login, register, loginWithGoogle, completeSession } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [verifyStep, setVerifyStep] = useState(false);
  const [forgotStep, setForgotStep] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const reset = () => { setVerifyStep(false); setForgotStep(false); setOtp(''); setError(''); setMessage(''); };
  const switchMode = () => { setIsRegister(v => !v); reset(); };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await api.forgotPassword(email.trim().toLowerCase());
      setMessage(res.message || 'If this email is registered, you will receive password reset instructions.');
    } catch (e: any) {
      setError(e.message || 'Unable to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true); setError(''); setMessage('');
    try { await loginWithGoogle(); }
    catch (e: any) { setError('Google sign-in could not be started. Please try again.'); setGoogleLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setMessage('');
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/[()\s-]/g, '');
    try {
      if (isRegister) {
        if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(cleanName)) throw new Error('Please enter your full name using letters, spaces, apostrophes or hyphens only.');
        if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) throw new Error('If provided, phone number must be exactly 10 digits and start with 6, 7, 8, or 9.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Please enter a valid email address.');
        if (!/^[^\s@]+@gmail\.com$/i.test(cleanEmail)) throw new Error('Please use a Gmail address ending in @gmail.com.');
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new Error('Password must be 8+ characters and include a letter and a number.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        const result = await register(cleanName, cleanEmail, password, cleanPhone || undefined);
        if (result.verificationRequired) { setEmail(result.email || cleanEmail); setVerifyStep(true); setMessage(`A 6-digit verification code was sent to ${result.email || cleanEmail}. Check your email inbox and enter the code here.`); return; }
        onClose();
        navigate('/', { replace: true });
      } else {
        await login(cleanEmail, password);
        onClose();
        navigate('/', { replace: true });
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    } catch (e: any) { setError(e.message || 'Authentication failed.'); }
    finally { setLoading(false); }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await api.verifyEmail(email.trim().toLowerCase(), otp.trim());
      if (!res.success || !res.data) throw new Error(res.error || 'Verification failed.');
      completeSession(res.data.token, res.data.user);
      setMessage('Email verified. Your SignBridge account is ready.');
      setTimeout(() => { onClose(); navigate('/', { replace: true }); window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, 250);
    } catch (e: any) { setError(e.message || 'Invalid verification code.'); }
    finally { setLoading(false); }
  };

  const resend = async () => {
    setResending(true); setError('');
    try { const res = await api.resendVerification(email.trim().toLowerCase()); if (!res.success) throw new Error(res.error || 'Unable to resend code.'); setMessage(`A new 6-digit verification code was sent to ${email.trim().toLowerCase()}. Check your inbox.`); }
    catch (e: any) { setError(e.message || 'Unable to resend code.'); }
    finally { setResending(false); }
  };

  return <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 relative my-8 max-h-[92vh] overflow-y-auto">
      <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1" aria-label="Close"><X className="w-5 h-5" /></button>
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#bd8b2c] flex items-center justify-center text-2xl mx-auto">🤟</div>
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-3">
          {forgotStep ? 'Reset password' : verifyStep ? 'Verify your email' : isRegister ? 'Create SignBridge Account' : 'Sign in to SignBridge'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {forgotStep
            ? 'We will send a password reset link to your email address.'
            : verifyStep
            ? 'The account is created only after the code from your Gmail inbox is verified.'
            : isRegister
            ? 'Create a verified account for learning and certification.'
            : 'Welcome back to your ISL workspace.'}
        </p>
      </div>

      {error && <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
      {message && <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-700 dark:text-emerald-300 flex gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /><span>{message}</span></div>}

      {forgotStep ? (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <Field icon={<Mail />} label="Registered Email Address *">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="auth-input"
              
            />
          </Field>
          <button
            disabled={loading || !email}
            className="w-full py-3 rounded-xl bg-[#bd8b2c] hover:bg-[#a8791d] text-white font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
          >
            {loading ? 'Sending link…' : 'Send Reset Link'}
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => { setForgotStep(false); setError(''); setMessage(''); }}
              className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        </form>
      ) : verifyStep ? (
        <form onSubmit={verify} className="space-y-4">
          <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label><input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" value={email} disabled /></div>
          <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">6-digit verification code</label><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xl font-black tracking-[0.45em]" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" /></div>
          <button disabled={loading || otp.length !== 6} className="w-full py-3 rounded-xl bg-cyan-600 text-white font-extrabold disabled:opacity-50">{loading ? 'Verifying…' : 'Verify Email & Create Account'}</button>
          <button type="button" disabled={resending} onClick={resend} className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 flex items-center justify-center gap-2"><RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} /> {resending ? 'Sending…' : 'Resend code'}</button>
          <button type="button" onClick={() => { setVerifyStep(false); setError(''); setMessage(''); }} className="w-full text-xs font-bold text-cyan-600">Back to registration</button>
        </form>
      ) : (
        <>
          <div className="space-y-2">
            <button type="button" onClick={handleGoogleLogin} disabled={googleLoading || loading} className="w-full py-3 rounded-xl border border-[#e9dfca] dark:border-[#59451f] bg-white dark:bg-[#201e19] text-slate-800 dark:text-white text-sm font-extrabold flex items-center justify-center gap-3 hover:border-[#c3922e] hover:bg-[#fffaf0] dark:hover:bg-[#29241a] transition shadow-sm disabled:opacity-50">
              <GoogleMark />{googleLoading ? 'Opening Google…' : isRegister ? 'Sign up with Google' : 'Continue with Google'}
            </button>
            <p className="text-center text-[10px] text-slate-400">Choose your Google account. New Google accounts are created automatically.</p>
          </div>
          <div className="flex items-center gap-3"><div className="h-px bg-slate-200 flex-1" /><span className="text-[10px] font-black uppercase text-slate-400">Or with email</span><div className="h-px bg-slate-200 flex-1" /></div>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && <><Field icon={<User />} label="Full Name *"><input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}  className="auth-input" /></Field><Field icon={<Phone />} label="Phone Number (Optional)"><input type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10}  className="auth-input" /><span className="mt-1 block text-[10px] text-slate-400">Optional. If you enter it, use exactly 10 digits.</span></Field></>}
            <Field icon={<Mail />} label="Email Address *"><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="auth-input" placeholder="name@example.com" /><span className="mt-1 block text-[10px] text-slate-400">A verification code will be sent to this email address.</span></Field>
            <Field icon={<Lock />} label={isRegister ? 'Password *' : 'Password *'}><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="auth-input" placeholder={isRegister ? 'Minimum 8 characters, including a letter and a number' : 'Enter your password'} /></Field>
            {!isRegister && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => { setForgotStep(true); setError(''); setMessage(''); }}
                  className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
            {isRegister && <Field icon={<Lock />} label="Confirm Password *"><input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="auth-input"  /></Field>}
            <button disabled={loading} className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-50">{loading ? 'Please wait…' : isRegister ? 'Continue to Email Verification' : 'Sign In'} <ArrowRight className="w-4 h-4" /></button>
          </form>
          <div className="text-center"><button onClick={switchMode} className="text-xs text-[#a8791d] dark:text-[#e0b34f] font-bold">{isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}</button></div>
        </>
      )}
    </div>
  </div>;
};

const GoogleMark: React.FC = () => <svg aria-hidden="true" viewBox="0 0 48 48" className="w-5 h-5 shrink-0"><path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/><path fill="#FF3D00" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#4CAF50" d="M12.6 27.5a12 12 0 0 1 0-7V15H5.8a20 20 0 0 0 0 18l6.8-5.5Z"/><path fill="#1976D2" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6.1 29.5 4 24 4A20 20 0 0 0 5.8 15l6.8 5.5c1.6-4.8 6.1-8.4 11.4-8.4Z"/></svg>;

const Field: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => <label className="block"><span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</span><div className="relative"><span className="absolute left-3 top-3 text-slate-400 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>{children}</div></label>;
