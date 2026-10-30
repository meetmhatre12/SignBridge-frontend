import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { UserCorrection, DatasetSample, ModelVersionInfo, SignItem } from '../../types';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SIGNS' | 'CURRICULUM' | 'CORRECTIONS' | 'DATASET' | 'MODELS'>('OVERVIEW');
  const [stats, setStats] = useState<any>(null);
  const [corrections, setCorrections] = useState<UserCorrection[]>([]);
  const [datasetData, setDatasetData] = useState<{ samples: DatasetSample[]; splitsSummary: Record<string, number> } | null>(null);
  const [models, setModels] = useState<ModelVersionInfo[]>([]);
  const [signs, setSigns] = useState<SignItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Sign Modal State
  const [showNewSignModal, setShowNewSignModal] = useState(false);
  const [newSign, setNewSign] = useState({
    id: '',
    name: '',
    categoryId: 'GREETINGS',
    meaning: '',
    englishTranslation: '',
    difficulty: 'EASY' as 'EASY' | 'MEDIUM' | 'HARD',
    isTwoHanded: false,
    isEmergency: false,
    description: '',
    instructions: ''
  });

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, correctionsRes, datasetRes, modelsRes, signsRes] = await Promise.all([
        api.getAdminStats(),
        api.getReviewQueue(),
        api.getDatasetSamples(),
        api.getModelVersions(),
        api.getSigns()
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (correctionsRes.success && correctionsRes.data) setCorrections(correctionsRes.data);
      if (datasetRes.success && datasetRes.data) setDatasetData(datasetRes.data);
      if (modelsRes.success && modelsRes.data) setModels(modelsRes.data);
      if (signsRes.success && signsRes.data) setSigns(signsRes.data);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleUpdateCorrection = async (correctionId: string, status: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW') => {
    try {
      const res = await api.updateCorrectionStatus(correctionId, status);
      if (res.success) {
        setCorrections(prev => prev.map(c => c.id === correctionId ? { ...c, status } : c));
        loadAllData();
      }
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleCreateSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSign.id || !newSign.name || !newSign.meaning) {
      alert('Please fill in Sign ID, Name, and Meaning.');
      return;
    }

    try {
      const res = await api.createSign(newSign);
      if (res.success) {
        setShowNewSignModal(false);
        setNewSign({
          id: '',
          name: '',
          categoryId: 'GREETINGS',
          meaning: '',
          englishTranslation: '',
          difficulty: 'EASY',
          isTwoHanded: false,
          isEmergency: false,
          description: '',
          instructions: ''
        });
        loadAllData();
      } else {
        alert(res.error || 'Failed to create sign.');
      }
    } catch {
      alert('Error creating sign.');
    }
  };

  const handleDeleteSign = async (signId: string) => {
    if (!confirm(`Are you sure you want to remove sign ${signId}?`)) return;
    try {
      const res = await api.deleteSign(signId);
      if (res.success) {
        setSigns(prev => prev.filter(s => s.id !== signId));
      }
    } catch {
      alert('Error deleting sign.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8 transition-colors">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading Admin Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1">
              Platform Governance & ML Curation
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">SignBridge Admin Studio</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Manage dictionary vocabulary, curriculum levels, human-in-the-loop corrections, and model lifecycles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a href="/admin/records" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition">
              Users & Certificates
            </a>
            <button
              onClick={loadAllData}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 no-scrollbar">
          {[
            { id: 'OVERVIEW', label: '📊 System Overview' },
            { id: 'SIGNS', label: `🤟 Signs Dictionary (${signs.length})` },
            { id: 'CORRECTIONS', label: `📥 Corrections Queue (${corrections.filter(c => c.status === 'PENDING').length})` },
            { id: 'DATASET', label: `🗂 Dataset Splits (${datasetData?.samples.length || 0})` },
            { id: 'MODELS', label: '🧠 Model Center' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/20'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Active Users</div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">{stats?.metrics?.totalUsers || 0}</div>
              </div>
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Supported Signs</div>
                <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400">{stats?.metrics?.totalSigns || 25}</div>
              </div>
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Pending Corrections</div>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{stats?.metrics?.pendingCorrections || 0}</div>
              </div>
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Curated Dataset Samples</div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats?.metrics?.totalDatasetSamples || 0}</div>
              </div>
            </div>

            {/* Model Lifecycle Banner */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-3 flex items-center gap-2">
                <span>Active Production Model:</span>
                <span className="px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-mono text-xs border border-cyan-200 dark:border-cyan-500/40">
                  {stats?.activeModel?.version || 'v1.0'}
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                Dataset: <strong>{stats?.activeModel?.datasetVersion}</strong> | Acceptance Gate: <strong>90% Calibrated Threshold</strong>
              </p>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                {stats?.activeModel?.evalMetrics ? (
                  <div>Metrics available</div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>ℹ️</span>
                    <span>No evaluation data available yet for this production build. Evaluation runs will display upon formal benchmark execution.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SIGNS MANAGEMENT */}
        {activeTab === 'SIGNS' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Manage 25 curated V1 camera vocabulary definitions and instructional gestures.
              </p>
              <button
                onClick={() => setShowNewSignModal(true)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow transition flex items-center space-x-1.5"
              >
                <span>➕</span>
                <span>Add New Sign</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Sign ID</th>
                      <th className="p-3">Name & Translation</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Hands</th>
                      <th className="p-3">Difficulty</th>
                      <th className="p-3">Emergency</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {signs.map((sign) => (
                      <tr key={sign.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">{sign.id}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{sign.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">"{sign.englishTranslation}"</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px]">
                            {sign.categoryId}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${sign.isTwoHanded ? 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                            {sign.isTwoHanded ? 'Two Hands' : 'Single Hand'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            sign.difficulty === 'EASY' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : sign.difficulty === 'MEDIUM' ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                          }`}>
                            {sign.difficulty}
                          </span>
                        </td>
                        <td className="p-3">
                          {sign.isEmergency ? (
                            <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px]">
                              🚨 Emergency
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteSign(sign.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-[11px] border border-rose-200 dark:border-rose-800 transition"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CORRECTIONS REVIEW QUEUE */}
        {activeTab === 'CORRECTIONS' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Human-in-the-loop review queue. Approving a correction promotes it to the <strong>TRAIN</strong> dataset split for model retraining.
            </p>

            {corrections.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                No user corrections currently pending review.
              </div>
            ) : (
              <div className="space-y-3">
                {corrections.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-cyan-600 dark:text-cyan-400 font-bold">{item.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'PENDING' ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                          item.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                          'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {item.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Recognized Signs: </span>
                        <span className="font-mono text-slate-900 dark:text-white font-bold">{item.recognizedSigns.join(', ')}</span>
                      </div>

                      <div className="text-sm">
                        <span className="text-slate-600 dark:text-slate-400">User's Intended Meaning: </span>
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold">"{item.suggestedMeaning}"</span>
                      </div>

                      {item.feedbackNotes && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                          Notes: {item.feedbackNotes}
                        </div>
                      )}
                    </div>

                    {item.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateCorrection(item.id, 'APPROVED')}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition"
                        >
                          ✓ Approve & Add to Dataset
                        </button>
                        <button
                          onClick={() => handleUpdateCorrection(item.id, 'REJECTED')}
                          className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-semibold text-xs border border-rose-200 dark:border-rose-800 transition"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DATASET CENTER */}
        {activeTab === 'DATASET' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 dark:text-slate-400">Training Split (Train)</div>
                <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{datasetData?.splitsSummary.train || 0}</div>
              </div>
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 dark:text-slate-400">Validation Split (Val)</div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{datasetData?.splitsSummary.validation || 0}</div>
              </div>
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 dark:text-slate-400">Test Split (Holdout)</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{datasetData?.splitsSummary.test || 0}</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Curated Landmark Feature Samples</h3>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {datasetData?.samples.length === 0 ? (
                  <p>No extra curated dataset samples yet. Approve pending user corrections to expand the training split.</p>
                ) : (
                  <div className="space-y-2">
                    {datasetData?.samples.map(s => (
                      <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{s.signName}</span>
                          <span className="text-[10px] text-slate-500 ml-2 font-mono">{s.id}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-[10px] border border-cyan-200 dark:border-cyan-800">
                          {s.split}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MODEL CENTER */}
        {activeTab === 'MODELS' && (
          <div className="space-y-4">
            {models.map(m => (
              <div key={m.version} className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400">{m.version}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold">
                      {m.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Released {m.releaseDate}</span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">{m.releaseNotes}</p>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  {m.evalMetrics ? (
                    <div>Evaluation Metrics</div>
                  ) : (
                    <div>No evaluation data available yet for this production build. (Zero fabricated metrics)</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Sign Modal */}
        {showNewSignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Add New ISL Sign</h3>
                <button onClick={() => setShowNewSignModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateSign} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 mb-1">Sign ID (Uppercase e.g. WELCOME)</label>
                  <input
                    type="text"
                    value={newSign.id}
                    onChange={e => setNewSign({ ...newSign, id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white shadow-sm"
                    placeholder="WELCOME"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={newSign.name}
                    onChange={e => setNewSign({ ...newSign, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white shadow-sm"
                    placeholder="Welcome"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 mb-1">Meaning / Definition</label>
                  <input
                    type="text"
                    value={newSign.meaning}
                    onChange={e => setNewSign({ ...newSign, meaning: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white shadow-sm"
                    placeholder="Friendly welcome greeting"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 mb-1">Category</label>
                    <select
                      value={newSign.categoryId}
                      onChange={e => setNewSign({ ...newSign, categoryId: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white shadow-sm"
                    >
                      <option value="GREETINGS">Greetings</option>
                      <option value="NEEDS">Needs</option>
                      <option value="ENTITIES">Entities</option>
                      <option value="QUESTIONS">Questions</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 mb-1">Difficulty</label>
                    <select
                      value={newSign.difficulty}
                      onChange={e => setNewSign({ ...newSign, difficulty: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white shadow-sm"
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-1">
                  <label className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSign.isTwoHanded}
                      onChange={e => setNewSign({ ...newSign, isTwoHanded: e.target.checked })}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>Requires Two Hands</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSign.isEmergency}
                      onChange={e => setNewSign({ ...newSign, isEmergency: e.target.checked })}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>Emergency Sign</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowNewSignModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                  >
                    Create Sign
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
