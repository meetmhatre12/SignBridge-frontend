import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DatasetContribution } from '../../types';
import { CameraPreview } from '../../components/camera/CameraPreview';

export const DatasetContributionStudio: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'CONTRIBUTE' | 'REVIEW'>('CONTRIBUTE');

  // Contribution state
  const [signId, setSignId] = useState('HELLO');
  const [canonicalName, setCanonicalName] = useState('Hello');
  const [regionalVariant, setRegionalVariant] = useState('STANDARD');
  const [handCount, setHandCount] = useState<1 | 2>(1);
  const [consentGiven, setConsentGiven] = useState(false);
  const [capturedLandmarks, setCapturedLandmarks] = useState<any[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  // Review Queue state
  const [contributions, setContributions] = useState<DatasetContribution[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewSplit, setReviewSplit] = useState<Record<string, 'TRAIN' | 'VALIDATION' | 'TEST'>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState<Record<string, boolean>>({});

  const isReviewer = user?.role === 'admin' || user?.role === 'organization_admin';

  const loadContributions = async () => {
    setLoadingContributions(true);
    try {
      const res = await api.getContributions();
      if (res.success && res.data) {
        setContributions(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load contributions', err);
    } finally {
      setLoadingContributions(false);
    }
  };

  useEffect(() => {
    loadContributions();
  }, [activeTab]);

  const handleLandmarksDetected = (data: any) => {
    // If user has hands detected in CameraPreview, store snapshot of landmarks
    if (data?.landmarks && Array.isArray(data.landmarks) && data.landmarks.length > 0) {
      setCapturedLandmarks(data.landmarks);
    }
  };

  const handleSubmitSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) {
      setSubmitMessage({ type: 'warning', text: 'You must grant informed consent before contributing sign samples.' });
      return;
    }
    if (!capturedLandmarks || capturedLandmarks.length === 0) {
      setSubmitMessage({
        type: 'warning',
        text: 'No hand landmarks detected. Enable your camera, place your hand in view, and wait for the 21-point hand tracking result before submitting.'
      });
      return;
    }

    setSubmitting(true);
    setSubmitMessage(null);

    try {
      // Only submit landmarks captured from the live camera; never fabricate training data.
      const landmarksToSubmit = capturedLandmarks;

      const res = await api.submitContribution({
        signId,
        canonicalName,
        regionalVariant,
        handCount,
        landmarks: landmarksToSubmit,
        consentGiven: true
      });

      if (res.success) {
        setSubmitMessage({
          type: res.message?.includes('duplicate') ? 'warning' : 'success',
          text: res.message || 'Sample submitted to expert review queue!'
        });
        setConsentGiven(false);
        loadContributions();
      } else {
        setSubmitMessage({ type: 'error', text: res.error || 'Submission failed.' });
      }
    } catch (err: any) {
      setSubmitMessage({ type: 'error', text: err?.message || 'Error submitting contribution.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setReviewSubmitting(prev => ({ ...prev, [id]: true }));
    try {
      const notes = reviewNotes[id] || '';
      const split = reviewSplit[id] || 'TRAIN';
      const res = await api.reviewContribution(id, status, notes, split);
      if (res.success) {
        await loadContributions();
      }
    } catch (err: any) {
      console.error('Review failed', err);
    } finally {
      setReviewSubmitting(prev => ({ ...prev, [id]: false }));
    }
  };

  const standardSigns = [
    { id: 'HELLO', name: 'Hello', hands: 1 },
    { id: 'THANK_YOU', name: 'Thank You', hands: 1 },
    { id: 'WATER', name: 'Water', hands: 1 },
    { id: 'HELP', name: 'Help', hands: 2 },
    { id: 'PLEASE', name: 'Please', hands: 2 },
    { id: 'GOOD_MORNING', name: 'Good Morning', hands: 2 },
    { id: 'HOSPITAL', name: 'Hospital', hands: 2 },
    { id: 'DOCTOR', name: 'Doctor', hands: 1 },
    { id: 'FAMILY', name: 'Family', hands: 2 },
    { id: 'SCHOOL', name: 'School', hands: 2 }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              <Sparkles className="w-4 h-4" /> Open ISL Dataset Initiative
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black">Dataset Contribution & Expert Review</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Contribute real Indian Sign Language samples with verified informed consent to empower transparent, reproducible AI research across regional dialects.
            </p>
          </div>

          {/* Navigation Pill */}
          <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('CONTRIBUTE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'CONTRIBUTE'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Contribute Sample
            </button>
            <button
              onClick={() => setActiveTab('REVIEW')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'REVIEW'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Review Queue
              {contributions.filter(c => c.status === 'PENDING_REVIEW').length > 0 && (
                <span className="w-4 h-4 rounded-full bg-cyan-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {contributions.filter(c => c.status === 'PENDING_REVIEW').length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Tab 1: Contribute Studio */}
      {activeTab === 'CONTRIBUTE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live Camera Landmark Recorder */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <h2 className="text-sm font-bold">Live Hand Landmark Stream</h2>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  CV Sensor Active
                </span>
              </div>

              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-800">
                <CameraPreview
                  onHandsDetected={(hands) => {
                    if (hands && hands.length > 0) {
                      setCapturedLandmarks(hands[0].landmarks);
                    }
                  }}
                  recognitionMode={handCount === 1 ? 'ALL' : 'WORD_ONLY'}
                  showSkeleton={true}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-cyan-500" /> 21 3D spatial joint coordinates extracted in-browser
                </span>
                <span>Spatial Centroid Checked</span>
              </div>
            </div>

            {/* Ethical Consent Card */}
            <div className="rounded-3xl border border-amber-300 dark:border-amber-800/80 bg-amber-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Ethical AI & Informed Consent Declaration</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Under SignBridge AI data protection guidelines, hand landmarks are anonymized spatial vectors (no raw RGB facial imagery is permanently saved). Submitted samples are reviewed for community accessibility and regional dialect diversity.
              </p>
              <label className="flex items-start gap-3 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={e => setConsentGiven(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-amber-400 text-amber-500 accent-amber-500"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  I voluntarily confirm this sign demonstration is provided with informed consent for open-source ISL model evaluation and training.
                </span>
              </label>
            </div>
          </div>

          {/* Right Column: Metadata & Submission Panel */}
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleSubmitSample} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="text-base font-black">Sign Metadata & Classification</h2>

              {/* Sign Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Target ISL Sign</label>
                <select
                  value={signId}
                  onChange={e => {
                    setSignId(e.target.value);
                    const found = standardSigns.find(s => s.id === e.target.value);
                    if (found) {
                      setCanonicalName(found.name);
                      setHandCount(found.hands as 1 | 2);
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                >
                  {standardSigns.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.hands}-handed)</option>
                  ))}
                </select>
              </div>

              {/* Regional Variant */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Regional Dialect / Zone</label>
                <select
                  value={regionalVariant}
                  onChange={e => setRegionalVariant(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                >
                  <option value="STANDARD">Standard National (ISLRTC)</option>
                  <option value="NORTHERN">Northern Dialect (Delhi / Punjab)</option>
                  <option value="SOUTHERN">Southern Dialect (Tamil / Kannada)</option>
                  <option value="WESTERN">Western Dialect (Maharashtra / Gujarat)</option>
                  <option value="EASTERN">Eastern Dialect (Bengal / Assam)</option>
                </select>
              </div>

              {/* Hand Count Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Hand Configuration</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setHandCount(1)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      handCount === 1
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    1-Handed Sign
                  </button>
                  <button
                    type="button"
                    onClick={() => setHandCount(2)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      handCount === 2
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    2-Handed Sign
                  </button>
                </div>
              </div>

              {/* Duplicate Detection & Feedback Banner */}
              {submitMessage && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                    submitMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : submitMessage.type === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {submitMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                  {submitMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                  <span>{submitMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !consentGiven}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {submitting ? 'Submitting Sample…' : 'Submit Landmark Sample'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Review Queue Studio */}
      {activeTab === 'REVIEW' && (
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">Expert Review Queue</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isReviewer
                  ? 'Evaluate community samples, check landmark fidelity, and approve into production train/val splits.'
                  : 'Your submitted sign samples awaiting expert review.'}
              </p>
            </div>
            <button
              onClick={loadContributions}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Refresh Queue
            </button>
          </div>

          {loadingContributions ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading samples…</div>
          ) : contributions.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              <p className="text-sm">No contributions submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contributions.map(c => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{c.canonicalName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                        {c.signId}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        {c.regionalVariant || 'STANDARD'}
                      </span>
                      {c.duplicateOf && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Potential Duplicate
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>Submitted by {c.contributorName} ({c.contributorRole})</span>
                      <span>•</span>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      <span>{c.handCount}-handed</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {c.status === 'PENDING_REVIEW' ? (
                      isReviewer ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={reviewSplit[c.id] || 'TRAIN'}
                            onChange={e => setReviewSplit({ ...reviewSplit, [c.id]: e.target.value as any })}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs font-bold"
                          >
                            <option value="TRAIN">Split: Train</option>
                            <option value="VALIDATION">Split: Val</option>
                            <option value="TEST">Split: Test</option>
                          </select>
                          <button
                            onClick={() => handleReviewAction(c.id, 'APPROVED')}
                            disabled={reviewSubmitting[c.id]}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReviewAction(c.id, 'REJECTED')}
                            disabled={reviewSubmitting[c.id]}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 transition"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Pending Review
                        </span>
                      )
                    ) : c.status === 'APPROVED' ? (
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Approved into Dataset
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-rose-500">Rejected</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
