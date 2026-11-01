import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { UserCorrection, SignItem, CourseLevel, Chapter, Lesson } from '../../types';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SIGNS' | 'CURRICULUM' | 'CORRECTIONS'>('OVERVIEW');
  const [stats, setStats] = useState<any>(null);
  const [corrections, setCorrections] = useState<UserCorrection[]>([]);
  const [signs, setSigns] = useState<SignItem[]>([]);
  const [courses, setCourses] = useState<CourseLevel[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showNewLessonModal, setShowNewLessonModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState({ chapterId: '', title: '', description: '', orderIndex: 1, passingScore: 80 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // New/Edit Sign Modal State
  const [showNewSignModal, setShowNewSignModal] = useState(false);
  const [editingSignId, setEditingSignId] = useState<string | null>(null);
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
    setLoadError('');
    try {
      const [statsRes, correctionsRes, signsRes, coursesRes, chaptersRes, lessonsRes] = await Promise.all([
        api.getAdminStats(), api.getReviewQueue(), api.getSigns(), api.getCourses(), api.getChapters(), api.getAdminLessons()
      ]);

      // Admin endpoints return { success: false } for HTTP 401/403 rather than throwing.
      // Treat those responses as actionable errors instead of rendering an empty dashboard.
      const protectedResults = [
        ['System overview', statsRes],
        ['Review queue', correctionsRes],
        ['Curriculum management', lessonsRes]
      ] as const;
      const failedProtected = protectedResults.find(([, result]) => !result.success);
      if (failedProtected) {
        throw new Error(
          failedProtected[1].error ||
          `${failedProtected[0]} could not be loaded. Confirm your administrator role and backend deployment.`
        );
      }

      setStats(statsRes.data ?? null);
      setCorrections(correctionsRes.data ?? []);
      if (signsRes.success && signsRes.data) setSigns(signsRes.data);
      if (coursesRes.success && coursesRes.data) setCourses(coursesRes.data);
      if (chaptersRes.success && chaptersRes.data) setChapters(chaptersRes.data);
      if (lessonsRes.success && lessonsRes.data) setLessons(lessonsRes.data);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      const message = err instanceof Error ? err.message : '';
      setLoadError(
        message ||
        'Some admin data could not be loaded. Confirm that the latest backend is deployed and your account has administrator access.'
      );
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
      const signPayload = { ...newSign, name: newSign.name.trim(), meaning: newSign.meaning.trim(), id: newSign.id.trim().toUpperCase().replace(/\s+/g, '_') };
      const res = editingSignId ? await api.updateSign(editingSignId, signPayload) : await api.createSign(signPayload);
      if (res.success) {
        setShowNewSignModal(false);
        setEditingSignId(null);
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

  const handleCreateLesson = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newLesson.chapterId || !newLesson.title.trim()) { alert('Select a chapter and enter a lesson title.'); return; }
    try {
      const lessonPayload = { ...newLesson, title: newLesson.title.trim() };
      const result = editingLessonId ? await api.updateLesson(editingLessonId, lessonPayload) : await api.createLesson(lessonPayload);
      if (!result.success) { alert(result.error || 'Unable to create lesson.'); return; }
      setShowNewLessonModal(false);
      setEditingLessonId(null);
      setNewLesson({ chapterId: '', title: '', description: '', orderIndex: lessons.length + 1, passingScore: 80 });
      await loadAllData();
    } catch { alert('Unable to create lesson. Please try again.'); }
  };

  const openEditSign = (sign: SignItem) => {
    setEditingSignId(sign.id);
    setNewSign({ id: sign.id, name: sign.displayName || sign.name || sign.canonicalName || sign.id, categoryId: sign.category || sign.categoryId || 'GREETINGS', meaning: sign.englishMeaning || sign.meaning || sign.englishTranslation || '', englishTranslation: sign.englishMeaning || sign.englishTranslation || '', difficulty: sign.difficulty || 'EASY', isTwoHanded: sign.handedness === 'TWO_HANDED' || Boolean(sign.isTwoHanded), isEmergency: sign.emergency ?? Boolean(sign.isEmergency), description: sign.instruction?.movement || sign.description || '', instructions: sign.instruction?.handConfiguration || sign.instructions || '' });
    setShowNewSignModal(true);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setNewLesson({ chapterId: lesson.chapterId, title: lesson.title, description: lesson.description || '', orderIndex: lesson.orderIndex, passingScore: lesson.passingScore });
    setShowNewLessonModal(true);
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
    <div className="sb-admin min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1">
              PLATFORM ADMINISTRATION
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">SignBridge Admin Studio</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Manage platform records, ISL vocabulary, learning content, certificates and user activity.
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

        {loadError && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{loadError} <button onClick={loadAllData} className="ml-2 font-black underline">Retry</button></div>}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 no-scrollbar">
          {[
            { id: 'OVERVIEW', label: '📊 System Overview' },
            { id: 'SIGNS', label: `🤟 Signs Dictionary (${signs.length})` },
            { id: 'CURRICULUM', label: `📚 Curriculum (${lessons.length})` },
            { id: 'CORRECTIONS', label: `📥 Review Queue (${corrections.filter(c => c.status === 'PENDING').length})` }
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
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Registered Learners</div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">{stats?.metrics?.totalUsers || 0}</div>
              </div>
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">ISL Signs</div>
                <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400">{stats?.metrics?.totalSigns ?? 0}</div>
              </div>
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Pending Reviews</div>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{stats?.metrics?.pendingCorrections || 0}</div>
              </div>
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Available Lessons</div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats?.metrics?.totalLessons || 0}</div>
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
                          <div className="font-semibold text-slate-900 dark:text-white">{sign.displayName || sign.name || sign.canonicalName || sign.id}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">"{sign.englishMeaning || sign.meaning || sign.englishTranslation || "Meaning not provided"}"</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px]">
                            {sign.category || sign.categoryId || 'Uncategorised'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${(sign.handedness === 'TWO_HANDED' || sign.isTwoHanded) ? 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                            {(sign.handedness === 'TWO_HANDED' || sign.isTwoHanded) ? 'Two Hands' : 'Single Hand'}
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
                          {(sign.emergency ?? sign.isEmergency) ? (
                            <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px]">
                              🚨 Emergency
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button onClick={() => openEditSign(sign)} className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] border border-amber-200 dark:border-amber-800 transition">Edit</button>
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

        {activeTab === 'CURRICULUM' && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-lg font-black text-slate-900 dark:text-white">Learning curriculum</h2><p className="text-xs text-slate-500">Review courses, chapters and lessons. New lessons are saved to the backend.</p></div>
              <button onClick={() => { setEditingLessonId(null); setNewLesson({ chapterId: "", title: "", description: "", orderIndex: lessons.length + 1, passingScore: 80 }); setShowNewLessonModal(true); }} disabled={!chapters.length} className="rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">＋ Add lesson</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">Courses</p><p className="mt-1 text-2xl font-black">{courses.length}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">Chapters</p><p className="mt-1 text-2xl font-black">{chapters.length}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">Lessons</p><p className="mt-1 text-2xl font-black">{lessons.length}</p></div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="bg-slate-100 text-slate-500 dark:bg-slate-800"><tr>{['Lesson','Chapter','Order','Passing score'].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lessons.map(lesson => <tr key={lesson.id}><td className="p-4"><b>{lesson.title}</b><small className="mt-1 block text-slate-500">{lesson.description || 'No description provided'}</small></td><td className="p-4">{chapters.find(chapter => chapter.id === lesson.chapterId)?.title || lesson.chapterId}</td><td className="p-4">{lesson.orderIndex}</td><td className="p-4">{lesson.passingScore}%</td><td className="p-4"><button type="button" onClick={() => openEditLesson(lesson)} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">Edit</button></td></tr>)}
                </tbody>
              </table>
              {!lessons.length && <p className="p-8 text-center text-sm text-slate-500">No lessons are currently available.</p>}
            </div>
          </section>
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

        {showNewLessonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <form onSubmit={handleCreateLesson} className="w-full max-w-lg space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between"><h2 className="text-lg font-black">{editingLessonId ? "Edit curriculum lesson" : "Add curriculum lesson"}</h2><button type="button" onClick={() => { setShowNewLessonModal(false); setEditingLessonId(null); }} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">Close</button></div>
              <label className="block text-xs font-bold">Chapter<select required value={newLesson.chapterId} onChange={event => setNewLesson(value => ({ ...value, chapterId: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">Select a chapter</option>{chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label>
              <label className="block text-xs font-bold">Lesson title<input required value={newLesson.title} onChange={event => setNewLesson(value => ({ ...value, title: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
              <label className="block text-xs font-bold">Description<textarea value={newLesson.description} onChange={event => setNewLesson(value => ({ ...value, description: event.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
              <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold">Order<input type="number" min="1" value={newLesson.orderIndex} onChange={event => setNewLesson(value => ({ ...value, orderIndex: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><label className="block text-xs font-bold">Passing score (%)<input type="number" min="1" max="100" value={newLesson.passingScore} onChange={event => setNewLesson(value => ({ ...value, passingScore: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label></div>
              <button type="submit" className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-black text-white">{editingLessonId ? "Update lesson" : "Save lesson"}</button>
            </form>
          </div>
        )}

        {/* Add New Sign Modal */}
        {showNewSignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{editingSignId ? "Edit ISL Sign" : "Add New ISL Sign"}</h3>
                <button onClick={() => { setShowNewSignModal(false); setEditingSignId(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">✕</button>
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
