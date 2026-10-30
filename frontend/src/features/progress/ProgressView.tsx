import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { BarChart2, Flame, Award, BookOpen, Target, Lock, ArrowRight, Clock3 } from 'lucide-react';
import { api } from '../../services/api';

interface ProgressData {
  stats: { activeStreak: number; completedLessons: number; practiceAccuracy: number | null; certificates: number };
  courses: Array<{ id: string; levelNumber: number; title: string; completedLessons: number; totalLessons: number; percent: number; status: string }>;
  recentAssessments: Array<{ id: string; title: string; date: string; score: number; passed: boolean; certificateNumber: string | null }>;
}

export const ProgressView: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { user } = useAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { setData(null); return; }
    setLoading(true); setError('');
    api.getMyProgress().then(res => {
      if (res.success && res.data) setData(res.data);
      else setError(res.error || 'Unable to load your progress.');
    }).finally(() => setLoading(false));
  }, [user]);

  if (!user) return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-sm">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center"><Lock className="w-7 h-7" /></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Private learning data</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Sign in to view My Progress</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">Your lessons, practice accuracy, assessment attempts, streaks, and certificates are private account data. They are not shown in Guest Mode.</p>
        <button onClick={onOpenAuth} className="mt-6 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-md">Sign In / Create Account</button>
      </div>
    </div>
  );

  if (loading && !data) return <div className="p-10 text-center text-sm text-slate-500">Loading your progress…</div>;
  if (error) return <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300">{error}</div>;
  if (!data) return null;

  const stats = [
    { label: 'Active Streak', value: data.stats.activeStreak ? `${data.stats.activeStreak} Day${data.stats.activeStreak === 1 ? '' : 's'}` : 'Not started', sub: 'Based on recorded practice', icon: Flame },
    { label: 'Lessons Completed', value: `${data.stats.completedLessons}`, sub: 'Verified completions', icon: BookOpen },
    { label: 'Practice Accuracy', value: data.stats.practiceAccuracy === null ? '—' : `${data.stats.practiceAccuracy}%`, sub: 'Average recorded score', icon: Target },
    { label: 'Verified Credentials', value: `${data.stats.certificates}`, sub: 'Valid certificates', icon: Award }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Learning Analytics & History</div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-1">My Progress</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Real progress from your SignBridge activity.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(({ label, value, sub, icon: Icon }) => <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span><Icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /></div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-3">{value}</div><div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{sub}</div>
        </div>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="font-extrabold text-slate-900 dark:text-white">Course Progression</h2><Link to="/learn" className="text-xs font-bold text-cyan-600 dark:text-cyan-400">Learning Hub <ArrowRight className="inline w-3 h-3" /></Link></div>
          <div className="space-y-3 mt-5">{data.courses.map(course => <div key={course.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between gap-3 text-xs font-bold"><span className="text-slate-900 dark:text-white">Level {course.levelNumber}: {course.title}</span><span className="text-cyan-600 dark:text-cyan-400">{course.percent}%</span></div>
            <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-3"><div className="h-full bg-cyan-500 rounded-full" style={{ width: `${course.percent}%` }} /></div>
            <div className="flex justify-between mt-2 text-[11px] text-slate-500 dark:text-slate-400"><span>{course.completedLessons} of {course.totalLessons} lessons</span><span>{course.status}</span></div>
          </div>)}</div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="font-extrabold text-slate-900 dark:text-white">Recent Assessments</h2><Link to="/assessment" className="text-xs font-bold text-cyan-600 dark:text-cyan-400">Assessments <ArrowRight className="inline w-3 h-3" /></Link></div>
          {data.recentAssessments.length === 0 ? <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400"><Clock3 className="w-7 h-7 mx-auto mb-2 opacity-50" />No assessment attempts yet.</div> : <div className="space-y-3 mt-5">{data.recentAssessments.map(a => <div key={a.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-xs font-bold text-slate-900 dark:text-white truncate">{a.title}</div><div className="text-[10px] text-slate-500 mt-1">{new Date(a.date).toLocaleDateString()} {a.certificateNumber ? `• ${a.certificateNumber}` : ''}</div></div><span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg border ${a.passed ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' : 'text-slate-600 bg-slate-100 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'}`}>{a.score}% {a.passed ? 'Passed' : 'Not Passed'}</span></div>)}</div>}
        </section>
      </div>
    </div>
  );
};
