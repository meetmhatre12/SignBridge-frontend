import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api';

export const AdminLearnerAnalyticsPage: React.FC = () => {
  const { userId = '' } = useParams();
  const [days, setDays] = useState(90);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      const response = await api.getAdminLearnerAnalytics(userId, days);
      if (!mounted) return;
      if (response.success && response.data) setReport(response.data);
      else setError(response.error || 'Unable to load learner analytics.');
      setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [userId, days, refreshKey]);

  const exportReport = () => {
    if (!report) return;
    const rows: Array<Array<string | number>> = [
      ['SignBridge AI learner analytics'],
      ['Learner', report.learner?.fullName || ''],
      ['Email', report.learner?.email || ''],
      ['User ID', report.learner?.id || ''],
      ['Generated at', new Date().toISOString()],
      ['Period (days)', report.periodDays],
      [],
      ['Metric', 'Value'],
      ...Object.entries(report.summary || {}).map(([key, value]) => [key, value == null ? 'Unavailable' : String(value)]),
      [],
      ['Course', 'Completed lessons', 'Total lessons', 'Completion percent', 'Enrolled'],
      ...(report.courseProgress || []).map((course: any) => [course.courseTitle, course.completedLessons, course.totalLessons, course.completionPercent == null ? 'Unavailable' : course.completionPercent, course.enrolled ? 'Yes' : 'No']),
      [],
      ['Activity type', 'Timestamp', 'Reference', 'Detail'],
      ...(report.activityTimeline || []).map((event: any) => [event.type, event.timestamp, event.referenceId || '', event.detail || ''])
    ];
    const csv = rows.map(row => row.map(value => {
      const text = String(value ?? '');
      return `"${text.replace(/"/g, '""')}"`;
    }).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `signbridge-learner-${report.learner?.id || 'report'}-${days}d.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const revokeSessions = async () => {
    if (!window.confirm('Revoke every active session for this learner? They will need to sign in again.')) return;
    setActionBusy(true);
    const response = await api.revokeAdminUserSessions(userId);
    if (!response.success) setError(response.error || 'Unable to revoke learner sessions.');
    else setRefreshKey(value => value + 1);
    setActionBusy(false);
  };

  const summary = report?.summary;
  const learner = report?.learner;
  const cards = [
    ['Enrolled courses', summary?.enrolledCourses],
    ['Completed courses', summary?.completedCourses],
    ['Completed lessons', summary?.completedLessons],
    ['Practice attempts', summary?.practiceAttempts],
    ['Exam attempts', summary?.assessmentAttempts],
    ['Passed exams', summary?.passedAssessments],
    ['Failed exams', summary?.failedAssessments],
    ['Certificates issued', summary?.certificatesIssued],
    ['Successful logins', summary?.loginCount],
    ['Recorded logouts', summary?.logoutCount],
    ['Active sessions', summary?.activeSessions],
    ['Failed logins', summary?.failedLoginCount],
    ['Password changes', summary?.passwordChanges]
  ];

  return <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-8 sm:px-6">
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <Link to="/admin/records" className="text-sm font-bold text-amber-700 dark:text-amber-300">← Back to user records</Link>
          <p className="mt-3 text-xs uppercase tracking-widest text-amber-700 dark:text-amber-300 font-bold">Administration / Learner intelligence</p>
          <h1 className="text-3xl font-black mt-1">Individual learner analytics</h1>
          <p className="text-sm text-slate-500 mt-2">Recorded learning progress, practice, examinations and certificate history.</p>
        </div>
        <label className="text-sm font-semibold">Activity window
          <select value={days} onChange={event => setDays(Number(event.target.value))} className="ml-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
            <option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={180}>Last 180 days</option><option value={365}>Last 365 days</option>
          </select>
        </label>
        <button onClick={exportReport} disabled={!report || loading} className="rounded-xl px-4 py-2 bg-amber-500 text-slate-950 text-sm font-bold disabled:opacity-40">Export CSV</button>
      </header>

      {loading ? <p className="py-20 text-center text-slate-500">Loading learner analytics…</p> : error ? <div role="alert" className="rounded-xl bg-rose-50 text-rose-700 p-4">{error}</div> : report && <>
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-900 grid place-items-center text-xl font-black">{learner?.fullName?.slice(0,1) || '?'}</div>
          <div className="min-w-0 flex-1"><h2 className="text-xl font-black">{learner?.fullName}</h2><p className="text-sm text-slate-500 break-all">{learner?.email} · {learner?.id}</p><p className="text-xs mt-1">Account: <b>{learner?.accountStatus}</b> · Email: <b>{learner?.emailVerified ? 'Verified' : 'Not verified'}</b> · Joined: {learner?.createdAt ? new Date(learner.createdAt).toLocaleDateString() : 'Unknown'}</p></div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map(([label,value])=><article key={String(label)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-black mt-1">{value ?? '—'}</p></article>)}
          <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><p className="text-xs text-slate-500">Average exam score</p><p className="text-2xl font-black mt-1">{summary?.averageAssessmentScore == null ? '—' : `${summary.averageAssessmentScore}%`}</p></article>
        </section>

        <section className="grid lg:grid-cols-2 gap-5">
          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="font-black text-lg">Course progress</h3>
            <div className="mt-4 space-y-4">{(report.courseProgress || []).map((course:any)=><div key={course.courseId}>
              <div className="flex justify-between gap-3 text-sm"><b>{course.courseTitle}</b><span className="text-slate-500">{course.completedLessons}/{course.totalLessons} lessons · {course.completionPercent == null ? 'No lesson data' : `${course.completionPercent}%`}</span></div>
              <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-amber-500" style={{width:`${course.completionPercent ?? 0}%`}} /></div>
              <p className="text-xs text-slate-500 mt-1">{course.enrolled ? 'Enrolled' : 'Not marked as enrolled'}</p>
            </div>)}</div>
          </article>
          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="font-black text-lg">Recorded activity by day</h3>
            <div className="mt-4 space-y-2">{(report.activityByDay || []).slice(-14).map((item:any)=><div key={item.date} className="grid grid-cols-[90px_1fr_28px] gap-2 items-center text-xs"><span className="text-slate-500">{item.date}</span><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{width:`${Math.min(100,item.events*12)}%`}} /></div><b className="text-right">{item.events}</b></div>)}{!report.activityByDay?.length&&<p className="text-sm text-slate-500">No activity records in this period.</p>}</div>
          </article>
        </section>

        <section className="grid lg:grid-cols-2 gap-5">
          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3"><h3 className="font-black text-lg">Authentication and session history</h3><button onClick={()=>void revokeSessions()} disabled={actionBusy || !(report.activeSessions||[]).length} className="rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 px-3 py-2 text-xs font-bold disabled:opacity-40">{actionBusy?'Revoking…':'Revoke all active sessions'}</button></div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm"><div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3"><p className="text-xs text-slate-500">Last login</p><b>{summary?.lastLoginAt?new Date(summary.lastLoginAt).toLocaleString():'Not recorded'}</b></div><div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3"><p className="text-xs text-slate-500">Last logout</p><b>{summary?.lastLogoutAt?new Date(summary.lastLogoutAt).toLocaleString():'Not recorded'}</b></div></div>
            <div className="space-y-2 max-h-72 overflow-y-auto">{(report.authEvents||[]).slice(0,40).map((event:any)=><div key={event.id} className="flex justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2 text-xs"><div><b>{event.eventType.replaceAll('_',' ')}</b><p className="text-slate-500">{event.source}</p></div><time className="text-slate-500">{new Date(event.occurredAt).toLocaleString()}</time></div>)}{!report.authEvents?.length&&<p className="text-sm text-slate-500">No authentication events recorded in this tracking period.</p>}</div>
            <h4 className="font-bold text-sm mt-4 mb-2">Active sessions ({report.activeSessions?.length||0})</h4>
            {(report.activeSessions||[]).map((session:any)=><div key={session.id} className="text-xs border-t border-slate-100 dark:border-slate-800 py-2"><b>{session.userAgent||'Unknown device'}</b><p className="text-slate-500">Last seen {new Date(session.lastSeenAt).toLocaleString()} · Expires {new Date(session.expiresAt).toLocaleDateString()}</p></div>)}
          </article>
          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 overflow-x-auto"><h3 className="font-black text-lg mb-3">Examination history</h3><table className="w-full text-sm text-left"><thead><tr className="text-xs text-slate-500 border-b"><th className="py-2">Date</th><th>Assessment</th><th>Score</th><th>Result</th></tr></thead><tbody>{(report.assessmentHistory || []).slice(0,20).map((item:any)=><tr key={item.id} className="border-b border-slate-100 dark:border-slate-800"><td className="py-2">{new Date(item.createdAt).toLocaleDateString()}</td><td>{item.assessmentId}</td><td>{item.score}%</td><td className={item.passed?'text-emerald-600':'text-rose-600'}>{item.passed?'Passed':'Not passed'}</td></tr>)}</tbody></table>{!report.assessmentHistory?.length&&<p className="text-sm text-slate-500">No examination attempts recorded.</p>}</article>
          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 overflow-x-auto"><h3 className="font-black text-lg mb-3">Certificate history</h3><div className="space-y-3">{(report.certificateRequests || []).map((item:any)=><div key={item.id} className="border-b border-slate-100 dark:border-slate-800 pb-2 text-sm"><div className="flex justify-between gap-2"><b>{item.courseTitle}</b><span>{item.status}</span></div><p className="text-xs text-slate-500">Requested {new Date(item.requestedAt).toLocaleString()}{item.reviewNote ? ` · ${item.reviewNote}` : ''}</p></div>)}{(report.certificates || []).map((item:any)=><div key={item.id} className="border-b border-slate-100 dark:border-slate-800 pb-2 text-sm"><div className="flex justify-between gap-2"><b>{item.certificateNumber}</b><span>{item.status}</span></div><p className="text-xs text-slate-500">{item.courseTitle} · Issued {new Date(item.issueDate).toLocaleDateString()}</p></div>)}{!report.certificateRequests?.length&&!report.certificates?.length&&<p className="text-sm text-slate-500">No certificate records.</p>}</div></article>
        </section>

        <section className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/20 p-4">
          <h3 className="font-bold text-sm">Data coverage and interpretation</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{report.dataCoverage?.note} Missing historical events are not represented as zero.</p>
        </section>
      </>}
    </div>
  </main>;
};
