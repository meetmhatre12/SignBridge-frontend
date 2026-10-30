import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, AlertTriangle, Search, CheckCircle, Award, Calendar, Hash } from 'lucide-react';
import { api } from '../../services/api';
import { Certificate } from '../../types';

export const PublicVerify: React.FC = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [searchId, setSearchId] = useState(certificateId || '');
  const [certData, setCertData] = useState<Certificate | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'VALID' | 'REVOKED' | 'SUSPENDED' | 'TAMPERED' | 'NOT_FOUND'>('IDLE');
  const [message, setMessage] = useState('');

  const verifyId = async (idToVerify: string) => {
    if (!idToVerify.trim()) return;
    setStatus('LOADING');
    setCertData(null);

    try {
      const res = await api.verifyCertificate(idToVerify.trim());
      if (res.success && res.data) {
        const cert = (res.data.certificate || res.data) as unknown as Certificate;
        setCertData(cert);
        setStatus((res.data.status || 'VALID') as any);
        setMessage(res.message || 'Certificate is valid and authentic.');
      } else {
        setStatus('NOT_FOUND');
        setMessage(res.message || res.error || 'No certificate found matching this identifier.');
      }
    } catch {
      setStatus('NOT_FOUND');
      setMessage('Unable to reach certificate verification registry.');
    }
  };

  useEffect(() => {
    if (certificateId) {
      verifyId(certificateId);
    }
  }, [certificateId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-xl mx-auto space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-600/20 border border-cyan-200 dark:border-cyan-500/40 flex items-center justify-center text-2xl mx-auto text-cyan-600 dark:text-cyan-400 shadow-md">
            🛡️
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Public Certificate Verification</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Verify authentic SignBridge Indian Sign Language certification records directly against the secure registry.
          </p>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            verifyId(searchId);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              placeholder="e.g. SB-ISL-2026-XXXXXX"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono shadow-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-md transition flex items-center gap-1.5"
          >
            <span>Verify</span>
          </button>
        </form>

        {/* Verification Result Card */}
        {status === 'LOADING' && (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-2">
            <div className="text-2xl animate-spin inline-block">⏳</div>
            <div className="text-sm font-semibold">Querying SignBridge Certificate Registry...</div>
          </div>
        )}

        {status === 'VALID' && certData && (
          <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fade-in transition-colors">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-500/40 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>OFFICIAL &amp; AUTHENTIC</span>
              </span>
              <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" />
                {certData.certificateNumber}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Certified Recipient</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{certData.userName}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Course Qualification</div>
                <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 flex items-center gap-2">
                  <Award className="w-5 h-5 flex-shrink-0" />
                  <span>{certData.courseTitle}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ISL Proficiency Level {certData.levelNumber}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Practical Exam Score</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{certData.score}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Issue Date</div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(certData.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span>Verified in real-time. This certification satisfies Indian Sign Language practical assessment criteria.</span>
              </div>
            </div>

            <div className="pt-2 text-center">
              <Link to="/assessment" className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold inline-flex items-center gap-1">
                <span>Earn an ISL certificate on SignBridge</span>
                <span>➔</span>
              </Link>
            </div>
          </div>
        )}

        {status === 'REVOKED' && (
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 flex items-center justify-center text-2xl mx-auto text-rose-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-xs uppercase tracking-wider border border-rose-300 dark:border-rose-800">
                CERTIFICATE REVOKED
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white pt-2">Revocation Notice</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                {message || 'This certificate has been revoked by SignBridge administration and is no longer valid.'}
              </p>
            </div>
          </div>
        )}

        {status === 'SUSPENDED' && (
          <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-2xl mx-auto text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-xs uppercase tracking-wider border border-amber-300 dark:border-amber-800">
                CERTIFICATE SUSPENDED
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white pt-2">Under Administrative Review</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                {message || 'This credential is temporarily suspended pending verification.'}
              </p>
            </div>
          </div>
        )}

        {status === 'NOT_FOUND' && (
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/80 rounded-3xl p-8 text-center space-y-3 shadow-sm animate-fade-in">
            <div className="text-3xl">⚠️</div>
            <div className="font-bold text-slate-900 dark:text-white text-base">Certificate Record Not Found</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">{message}</p>
            <div className="pt-3 text-xs text-slate-500">
              Please double check the certificate identifier format (e.g. <code className="font-mono font-bold text-cyan-600 dark:text-cyan-400">SB-ISL-2026-XXXXXX</code>).
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
