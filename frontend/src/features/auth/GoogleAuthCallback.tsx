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
  const completedRef = useRef(false);

  useEffect(() => {
    let active = true;
    if (completedRef.current) return () => { active = false; };
    completedRef.current = true;

    const run = async () => {
      const error = params.get('error_description') || params.get('error');
      const code = params.get('code');
      if (error) {
        if (active) { setStatus('error'); setMessage(decodeURIComponent(error.replace(/\+/g, ' '))); }
        return;
      }
      if (!code) {
        if (active) { setStatus('error'); setMessage('Google did not return an authorization code. Please start Google sign-in again.'); }
        return;
      }

      try {
        if (active) setMessage('Finishing secure Google sign-in…');
        const codeVerifier = getGoogleOAuthVerifier();

        // Use one deterministic path: the SignBridge backend exchanges the
        // short-lived PKCE code and then creates the local SignBridge session.
        // Do not race browser and backend exchanges; a PKCE code is one-time use
        // and racing two exchanges is a common cause of the sign-in spinner.
        const result = await api.supabaseOAuthLogin(code, codeVerifier);
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Google sign-in could not be completed. Please try again.');
        }

        clearGoogleOAuthState();
        if (result.data.supabaseAccessToken) {
          sessionStorage.setItem('signbridge_supabase_access_token', result.data.supabaseAccessToken);
        }
        completeSession(result.data.token, result.data.user);

        if (active) {
          setMessage('Signed in successfully. Opening your dashboard…');
          // Replace the callback URL so refreshing cannot replay the one-time code.
          window.setTimeout(() => window.location.replace('/profile'), 100);
        }
      } catch (e: any) {
        sessionStorage.removeItem('signbridge_supabase_access_token');
        clearGoogleOAuthState();
        if (active) {
          setStatus('error');
          setMessage(e?.message || 'Google sign-in could not be completed. Please try again. If this continues, check the backend and Supabase authentication configuration.');
        }
      }
    };
    void run();
    return () => { active = false; };
  }, [params, completeSession, navigate]);

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
