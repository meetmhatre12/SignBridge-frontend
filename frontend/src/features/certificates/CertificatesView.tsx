import React, { useState, useEffect } from 'react';
import { Certificate } from '../../types';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';
import { CertificateModal } from './CertificateModal';
import { useAuth } from '../../context/AuthContext';

export const CertificatesView: React.FC = () => {
  const { user, isLoading: authLoading, updateUser } = useAuth();
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAge, setProfileAge] = useState('');
  const [profileGender, setProfileGender] = useState('PREFER_NOT_TO_SAY');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const profileComplete = Boolean(user?.phone && user?.age);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certificateRequests, setCertificateRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => { if (user) { setProfilePhone(user.phone || ''); setProfileAge(user.age ? String(user.age) : ''); setProfileGender(user.gender || 'PREFER_NOT_TO_SAY'); } }, [user]);

  const saveCertificateProfile = async (event: React.FormEvent) => {
    event.preventDefault(); setSavingProfile(true); setProfileMessage('');
    try { await updateUser({ phone: profilePhone.trim(), age: Number(profileAge), gender: profileGender as any }); setProfileMessage('Certificate profile saved.'); }
    catch (error: any) { setProfileMessage(error?.message || 'Unable to save your details.'); }
    finally { setSavingProfile(false); }
  };

  useEffect(() => {
    if (authLoading || !user || !profileComplete) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    setLoadError('');
    Promise.all([api.getMyCertificates(), api.getMyCertificateRequests()])
      .then(([res, requestRes]) => {
        if (requestRes.success && requestRes.data) setCertificateRequests(requestRes.data);
        if (!active) return;
        if (res.success && res.data) {
          setCertificates([...res.data].sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()));
        } else {
          setLoadError(res.error || 'Unable to load certificates. Please try again.');
        }
      })
      .catch(() => { if (active) setLoadError('Unable to connect to the certificate service. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, authLoading, profileComplete]);

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


      {!profileComplete && <section className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/20 p-5 sm:p-6 space-y-4">
        <div><h2 className="text-lg font-black">Complete your certificate profile</h2><p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Enter your phone number and age before certificate access is enabled. Gender is optional and includes a privacy choice.</p></div>
        <form onSubmit={saveCertificateProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm font-semibold">Phone number<input required value={profilePhone} onChange={e=>setProfilePhone(e.target.value)} inputMode="tel" placeholder="10-digit mobile number" className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5"/></label>
          <label className="text-sm font-semibold">Age<input required type="number" min="13" max="120" step="1" value={profileAge} onChange={e=>setProfileAge(e.target.value)} placeholder="Your age" className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5"/></label>
          <label className="text-sm font-semibold sm:col-span-2">Gender (optional)<select value={profileGender} onChange={e=>setProfileGender(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5"><option value="PREFER_NOT_TO_SAY">Prefer not to say</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="NON_BINARY">Non-binary</option></select></label>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3"><button disabled={savingProfile} className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 font-black text-slate-950 disabled:opacity-60">{savingProfile?'Saving…':'Save certificate details'}</button>{profileMessage&&<span role="status" className="text-sm text-slate-600 dark:text-slate-300">{profileMessage}</span>}</div>
        </form>
      </section>}

      {profileComplete && certificateRequests.length > 0 && <section className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/20 p-4 sm:p-5"><h2 className="font-black text-slate-900 dark:text-white">Certificate request status</h2><div className="mt-3 space-y-2">{certificateRequests.map(request => <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white dark:bg-slate-900 p-3 border border-amber-100 dark:border-amber-900"><div><p className="text-sm font-bold">{request.courseTitle} · Level {request.levelNumber}</p><p className="text-xs text-slate-500">Submitted {new Date(request.requestedAt).toLocaleString()} · Score {request.score}%</p></div><span className="text-xs font-black">{request.status === 'PENDING' ? 'Awaiting admin approval' : request.status}</span></div>)}</div><p className="mt-3 text-xs text-slate-600 dark:text-slate-400">A certificate is issued only after SignBridge administration reviews and approves your eligible assessment request.</p></section>}

      {profileComplete && loadError && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 p-4 text-sm text-rose-700 dark:text-rose-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><span>{loadError}</span><button onClick={() => { setLoading(true); setLoadError(''); api.getMyCertificates().then(res => { if (res.success && res.data) setCertificates([...res.data].sort((a,b) => new Date(b.issueDate).getTime()-new Date(a.issueDate).getTime())); else setLoadError(res.error || 'Unable to load certificates.'); }).catch(() => setLoadError('Unable to connect to the certificate service.')).finally(() => setLoading(false)); }} className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 font-bold">Retry</button></div>}
      {!profileComplete ? <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500">Complete the form above to unlock your certificate records and download options.</div> : loading ? (
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

      {selectedCert && profileComplete && (
        <CertificateModal
          certificate={selectedCert}
          onClose={() => setSelectedCert(null)}
        />
      )}
    </div>
  );
};
