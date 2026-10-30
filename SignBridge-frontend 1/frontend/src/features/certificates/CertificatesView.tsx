import React, { useState, useEffect } from 'react';
import { Certificate } from '../../types';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';
import { CertificateModal } from './CertificateModal';
import { useAuth } from '../../context/AuthContext';

export const CertificatesView: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  useEffect(() => {
    if (authLoading || !user) { setLoading(false); return; }
    setLoading(true);
    api.getMyCertificates()
      .then(res => {
        if (res.success && res.data) setCertificates(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (!authLoading && !user) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <div className="text-4xl">🏆</div><h1 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">Sign in to view certificates</h1>
          <p className="mt-2 text-sm text-slate-500">Certificates are tied to your verified SignBridge account and are created only after a passed assessment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Certificate</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-xs font-bold">
              Verified Credentials
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Your certificate is created only after the required learning course is fully completed and the final practical assessment is passed.
          </p>
        </div>

        <Link
          to="/assessment"
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center space-x-1.5 self-start sm:self-auto transition"
        >
          <span>🏆 Take Assessment Exam</span>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">Loading your certificates...</div>
      ) : certificates.length === 0 ? (
        <div className="p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-lg mx-auto bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-slate-900 border border-amber-200 dark:border-slate-800 flex items-center justify-center mx-auto text-3xl">
            📜
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Certificates Earned Yet</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Finish every required lesson in the selected learning level, then pass its practical assessment. A certificate is never created just for opening or passing an assessment early.
          </p>
          <Link
            to="/assessment"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition"
          >
            <span>Start Level 1 Assessment</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map(cert => (
            <div
              key={cert.id}
              className="p-6 rounded-3xl border border-amber-200 dark:border-amber-500/30 hover:border-amber-400/60 transition-all flex flex-col justify-between space-y-5 bg-white dark:bg-gradient-to-b dark:from-slate-900/90 dark:to-slate-950/90 shadow-sm dark:shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">
                    {cert.certificateNumber}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    ✓ {cert.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {cert.courseTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Level {cert.levelNumber}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Exam Score</span>
                    <span className="text-base font-black text-cyan-600 dark:text-cyan-400">{cert.score}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Issue Date</span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                      {new Date(cert.issueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setSelectedCert(cert)}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-1"
                >
                  <span>📜 View / Print</span>
                </button>
                <Link
                  to={`/verify/${cert.certificateNumber}`}
                  className="py-2.5 px-3 rounded-xl bg-cyan-50 dark:bg-slate-800 hover:bg-cyan-600 hover:text-white text-cyan-700 dark:text-slate-200 text-xs font-bold transition border border-cyan-200 dark:border-slate-700 flex items-center justify-center space-x-1"
                >
                  <span>🔍 Verify</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCert && (
        <CertificateModal
          certificate={selectedCert}
          onClose={() => setSelectedCert(null)}
        />
      )}
    </div>
  );
};
