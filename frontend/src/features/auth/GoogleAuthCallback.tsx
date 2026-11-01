import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { clearGoogleOAuthState, getGoogleOAuthVerifier } from '../../services/supabaseAuth';

export const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { completeSession } = useAuth();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('Completing Google sign-in…');
  // Share the one-time PKCE exchange across React StrictMode effect replays.
  const exchangePromiseRef = useRef<Promise<Awaited<ReturnType<typeof api.supabaseOAuthLogin>>> | null>(null);

  const authorizationCode = params.get('code');
  const authorizationError = params.get('error_description') || params.get('error');

  useEffect(() => {
    let active = true;

    if (authorizationError) {
      setStatus('error');
      setMessage(authorizationError.replace(/\\+/g, ' '));
      return () => { active = false; };
    }
    if (!authorizationCode) {
      setStatus('error');
      setMessage('Google did not return an authorization code. Please start Google sign-in again.');
      return () => { active = false; };
    }

    // StrictMode runs an effect setup/cleanup/setup cycle. Reuse one in-flight
    // request so cleanup of the first effect cannot strand the callback spinner
    // or consume the one-time PKCE code twice.
    if (!exchangePromiseRef.current) {
      exchangePromiseRef.current = (async () => {
        const verifier = getGoogleOAuthVerifier();
        return api.supabaseOAuthLogin(authorizationCode, verifier);
      })();
    }

    setMessage('Finishing secure Google sign-in…');
    exchangePromiseRef.current
      .then(result => {
        if (!result.success || !result.data?.token || !result.data?.user) {
          throw new Error(result.error || 'Google sign-in response was incomplete. Please try again.');
        }
        if (!active) return;

        clearGoogleOAuthState();
        if (result.data.supabaseAccessToken) {
          sessionStorage.setItem('signbridge_supabase_access_token', result.data.supabaseAccessToken);
        }
        completeSession(result.data.token, result.data.user);
        setMessage('Signed in successfully. Opening your dashboard…');
        window.location.replace('/profile');
      })
      .catch((error: any) => {
        if (!active) return;
        sessionStorage.removeItem('signbridge_supabase_access_token');
        clearGoogleOAuthState();
        setStatus('error');
        setMessage(error?.message || 'Google sign-in could not be completed. Please try again.');
      });

    return () => { active = false; };
  }, [authorizationCode, authorizationError, completeSession]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl text-center">
        {status === 'loading' ? <Loader2 className="w-10 h-10 mx-auto text-cyan-600 animate-spin" /> : <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />}
        <h1 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">{status === 'loading' ? 'Signing you in' : 'Google sign-in needs attention'}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{message}</p>
        {status === 'error' && <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2"><button onClick={() => window.location.assign('/')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-extrabold text-white"><RefreshCw className="w-4 h-4" /> Try Google again</button><button onClick={() => navigate('/', { replace: true })} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-3 text-sm font-extrabold"><ArrowLeft className="w-4 h-4" /> Return</button></div>}
      </div>
    </div>
  );
};
