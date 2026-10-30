import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Accessibility, ArrowRight, ArrowUpRight, Award, BookOpen, BookMarked,
  Camera, CheckCircle2, Gamepad2, GraduationCap, Search, ShieldAlert,
  Sparkles, Target, Volume2, Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const quickLinks = [
  { title: 'Live Translator', detail: 'Camera-based sign recognition', to: '/translator', icon: Camera, tone: 'gold' },
  { title: 'Learn ISL', detail: 'Structured lessons and chapters', to: '/learn', icon: BookOpen, tone: 'gold' },
  { title: 'Practice & Games', detail: 'Build confidence through practice', to: '/games', icon: Gamepad2, tone: 'green' },
  { title: 'Dictionary', detail: 'Find signs and meanings', to: '/dictionary', icon: Search, tone: 'gold' },
  { title: 'Emergency Mode', detail: 'Quick communication references', to: '/emergency', icon: ShieldAlert, tone: 'rose' },
  { title: 'Certificates', detail: 'View earned credentials', to: '/certificates', icon: Award, tone: 'gold' },
  { title: 'Accessibility', detail: 'Display and language preferences', to: '/settings', icon: Accessibility, tone: 'gold' }
];

const lessons = [
  { title: 'ISL Alphabet', subtitle: 'Start with A–Z', image: '/signs/alphabets/a.jpg', tag: 'Beginner', to: '/learn' },
  { title: 'Everyday Signs', subtitle: 'Build useful vocabulary', image: '/signs/alphabets/b.jpg', tag: 'Beginner', to: '/dictionary' },
  { title: 'Handshape Practice', subtitle: 'Observe and practise', image: '/signs/alphabets/c.jpg', tag: 'Practice', to: '/practice' },
  { title: 'Keep Learning', subtitle: 'Continue your course path', image: '/signs/alphabets/d.jpg', tag: 'Learning path', to: '/learn' }
];

const games = [
  { title: 'Sign Recognition', detail: 'Identify the displayed sign', icon: Target, to: '/games', tone: 'amber' },
  { title: 'Word Quiz', detail: 'Test your ISL vocabulary', icon: BookMarked, to: '/games', tone: 'emerald' },
  { title: 'Sentence Practice', detail: 'Build simple sentences', icon: BookOpen, to: '/practice', tone: 'blue' },
  { title: 'Daily Practice', detail: 'Make learning a habit', icon: Zap, to: '/practice', tone: 'violet' }
];

export const MainDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<any>(null);
  const [dictionaryQuery, setDictionaryQuery] = useState('');

  useEffect(() => {
    if (!user) { setProgress(null); return; }
    let active = true;
    api.getMyProgress()
      .then(response => { if (active && response.success) setProgress(response.data); })
      .catch(() => { if (active) setProgress(null); });
    return () => { active = false; };
  }, [user]);

  const completed = progress?.courses?.reduce((sum: number, course: any) => sum + Number(course.completedLessons || 0), 0) || 0;
  const total = progress?.courses?.reduce((sum: number, course: any) => sum + Number(course.totalLessons || 0), 0) || 0;
  const percent = total ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const firstName = user?.fullName?.trim().split(/\s+/)[0] || 'Learner';

  const searchDictionary = (event: React.FormEvent) => {
    event.preventDefault();
    const query = dictionaryQuery.trim();
    if (query) navigate(`/dictionary?search=${encodeURIComponent(query)}`);
  };

  return (
    <div className="sb-dashboard mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:space-y-5 sm:px-5 lg:px-7 lg:py-6">
      <section className="sb-dash-hero relative isolate grid min-h-[360px] overflow-hidden rounded-[28px] border border-[#eadfc6] bg-[#fffdf8] shadow-[0_18px_55px_rgba(100,72,22,.09)] lg:grid-cols-[1.02fr_.98fr]">
        <div className="sb-hero-orb sb-hero-orb-one" aria-hidden="true" />
        <div className="sb-hero-orb sb-hero-orb-two" aria-hidden="true" />
        <div className="relative z-10 flex flex-col justify-center px-6 py-8 sm:px-9 lg:px-11 lg:py-10">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#ead6a8] bg-[#fff3d5] px-3.5 py-2 text-[11px] font-extrabold tracking-wide text-[#875d12]">
            <Sparkles className="h-4 w-4" /> BRIDGING COMMUNICATION, BUILDING INCLUSION
          </div>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.02] tracking-tight text-[#171717] sm:text-5xl xl:text-[58px]">
            {user ? <>Welcome back,<br /><span className="sb-gold-text">{firstName}.</span></> : <>Sign<span className="sb-gold-text">Bridge</span> AI</>}
          </h1>
          <h2 className="mt-4 max-w-xl text-xl font-bold leading-tight text-[#25221d] sm:text-2xl">Indian Sign Language for a more inclusive world.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#686158] sm:text-base">Learn ISL, practise everyday signs and use camera-based communication tools in one welcoming workspace.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/learn" className="sb-gold-cta inline-flex items-center gap-2 rounded-xl px-5 py-3.5 text-sm font-extrabold">Start Learning <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/translator" className="inline-flex items-center gap-2 rounded-xl border border-[#e9dfcb] bg-white px-5 py-3.5 text-sm font-extrabold text-[#28231a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#c99a39]"><Camera className="h-4 w-4 text-[#a8791d]" /> Open Translator</Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-[#766e62]">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#a8791d]" /> Learn at your pace</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#a8791d]" /> Camera-based practice</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#a8791d]" /> Accessible tools</span>
          </div>
        </div>

        <div className="relative flex min-h-[290px] items-center justify-center px-5 pb-7 pt-2 sm:px-8 lg:min-h-[360px] lg:px-7 lg:py-8">
          <div className="sb-hero-art absolute inset-0" aria-hidden="true" />
          <div className="sb-float-note sb-note-left"><span className="text-[#a8791d]">✦</span> Together for an<br />inclusive tomorrow</div>
          <div className="sb-hero-person relative z-10 flex h-[250px] w-[min(78%,390px)] items-end justify-center overflow-hidden rounded-t-[48%] border border-white/80 bg-gradient-to-b from-[#f8e8c3] to-[#e8c990] shadow-[0_18px_45px_rgba(94,65,18,.17)] sm:h-[290px] lg:h-[315px]">
            <img src="/images/signbridge-presenters.webp" alt="Two Indian SignBridge presenters demonstrating inclusive sign-language communication" loading="eager" fetchPriority="high" className="h-full w-full object-cover object-center" />
            
          </div>
          <div className="sb-float-note sb-note-right"><span className="text-[#a8791d]">✦</span> ISL connects<br />people</div>
          <div className="absolute bottom-5 right-4 z-20 hidden rounded-2xl border border-[#eadfc6] bg-white/95 p-3 shadow-lg sm:block">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#28231a]"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Learn • Translate • Communicate</div>
            <p className="mt-1 text-[10px] text-[#7b7368]">A more inclusive everyday experience</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-7">
        {quickLinks.map(({ title, detail, to, icon: Icon, tone }) => (
          <Link key={title} to={to} className="sb-quick-card group flex min-h-[104px] items-center gap-3 rounded-2xl border border-[#eee6d8] bg-white p-3 shadow-[0_5px_18px_rgba(48,38,20,.035)] sm:flex-col sm:items-start sm:p-4">
            <span className={`sb-quick-icon sb-tone-${tone} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl`}><Icon className="h-5 w-5" /></span>
            <span className="min-w-0"><span className="block text-xs font-extrabold text-[#25221d]">{title}</span><span className="mt-1 block text-[10px] leading-4 text-[#82796d]">{detail}</span></span>
            <ArrowUpRight className="ml-auto hidden h-4 w-4 text-[#b1842b] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block" />
          </Link>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <div className="sb-panel rounded-[22px] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="sb-eyebrow">YOUR LEARNING JOURNEY</p><h2 className="mt-1 text-lg font-black text-[#211e19]"><GraduationCap className="mr-2 inline h-5 w-5 text-[#a8791d]" />Structured Learning Path</h2></div>
            <Link to="/learn" className="text-xs font-extrabold text-[#a8791d]">View all <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
          </div>
          <div className="mb-4 flex flex-wrap gap-2"><span className="sb-level-pill sb-level-active">Beginner</span><span className="sb-level-pill">Intermediate</span><span className="sb-level-pill">Advanced</span><span className="sb-level-pill">Daily life</span></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {lessons.map((lesson, index) => (
              <Link to={lesson.to} key={lesson.title} className="sb-lesson-card overflow-hidden rounded-xl border border-[#eee8dc] bg-white">
                <div className="relative h-24 overflow-hidden bg-[#f5eee0] sm:h-28"><img src={lesson.image} alt={lesson.title + ' handshape reference'} loading="lazy" className="h-full w-full object-contain p-2 transition duration-500 hover:scale-105" /><span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-bold text-[#89621a]">{lesson.tag}</span></div>
                <div className="p-3"><p className="text-[11px] font-extrabold text-[#29251e]">{index + 1}. {lesson.title}</p><p className="mt-1 text-[10px] text-[#81786b]">{lesson.subtitle}</p><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#a8791d]">Explore <ArrowRight className="h-3 w-3" /></span></div>
              </Link>
            ))}
          </div>
          {user && <div className="mt-4 rounded-xl bg-[#fbf6eb] p-3.5"><div className="flex items-center justify-between gap-3"><span className="text-xs font-extrabold text-[#4b402e]">Your course progress</span><span className="text-xs font-black text-[#986b17]">{total ? `${percent}%` : 'Not started'}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e9dfcb]"><div className="h-full rounded-full bg-gradient-to-r from-[#d6a640] to-[#a87516] transition-all duration-700" style={{ width: `${percent}%` }} /></div><p className="mt-2 text-[10px] text-[#7c7160]">{total ? `${completed} of ${total} lessons completed` : 'Your completed lessons will appear here when progress is available.'}</p></div>}
        </div>

        <div className="sb-panel rounded-[22px] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between"><div><p className="sb-eyebrow">FIND A SIGN</p><h2 className="mt-1 text-lg font-black text-[#211e19]"><Search className="mr-2 inline h-5 w-5" />Dictionary Search</h2></div><BookMarked className="h-6 w-6 text-[#a8791d]" /></div>
          <form onSubmit={searchDictionary} className="flex gap-2"><input value={dictionaryQuery} onChange={event => setDictionaryQuery(event.target.value)} placeholder="Search a word, e.g. water" aria-label="Search the ISL dictionary" className="min-w-0 flex-1 rounded-xl border border-[#e9e1d3] bg-[#fcfbf8] px-3 py-3 text-sm text-[#29251e] outline-none transition focus:border-[#c69a42] focus:ring-2 focus:ring-[#c69a42]/15" /><button type="submit" className="sb-gold-cta rounded-xl px-4 text-xs font-extrabold">Search</button></form>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link to="/dictionary?search=hello" className="sb-dictionary-chip"><img src="/signs/alphabets/h.jpg" alt="" /><span><b>Hello</b><small>Common greeting</small></span><ArrowUpRight className="ml-auto h-4 w-4" /></Link>
            <Link to="/dictionary?search=water" className="sb-dictionary-chip"><img src="/signs/alphabets/w.jpg" alt="" /><span><b>Water</b><small>Everyday need</small></span><ArrowUpRight className="ml-auto h-4 w-4" /></Link>
            <Link to="/dictionary?search=help" className="sb-dictionary-chip"><img src="/signs/alphabets/a.jpg" alt="" /><span><b>Help</b><small>Useful expression</small></span><ArrowUpRight className="ml-auto h-4 w-4" /></Link>
            <Link to="/dictionary" className="sb-dictionary-chip"><span className="sb-dictionary-more"><BookOpen className="h-5 w-5" /></span><span><b>Browse signs</b><small>Open the dictionary</small></span><ArrowUpRight className="ml-auto h-4 w-4" /></Link>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#eee3cf] bg-[#fffaf0] p-3 text-[10px] leading-4 text-[#786b55]"><Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-[#a8791d]" />Use the dictionary to explore sign references and available learning media. Search results depend on the records currently available in the project.</div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="sb-panel rounded-[22px] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between"><div><p className="sb-eyebrow">LEARN BY DOING</p><h2 className="mt-1 text-lg font-black text-[#211e19]"><Gamepad2 className="mr-2 inline h-5 w-5 text-[#a8791d]" />Practice & Game Studio</h2></div><Link to="/games" className="text-xs font-extrabold text-[#a8791d]">All games <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>
          <div className="grid grid-cols-2 gap-3">
            {games.map(({ title, detail, icon: Icon, to, tone }) => <Link to={to} key={title} className={`sb-game-card sb-game-${tone} rounded-xl border p-4 transition hover:-translate-y-1`}><span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80"><Icon className="h-5 w-5" /></span><b className="block text-xs text-[#27231c]">{title}</b><span className="mt-1 block min-h-8 text-[10px] leading-4 text-[#71685c]">{detail}</span><span className="mt-3 inline-flex rounded-lg bg-[#b7831f] px-3 py-2 text-[10px] font-extrabold text-white">Open practice</span></Link>)}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/emergency" className="sb-emergency-panel flex min-h-[190px] flex-col justify-between rounded-[22px] border border-rose-200 bg-gradient-to-br from-[#fff7f5] to-[#fff0ed] p-5"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><ShieldAlert className="h-6 w-6" /></span><span className="text-xs font-black text-rose-900">QUICK ACCESS</span></div><div><h3 className="text-xl font-black text-[#2b211f]">Emergency Mode</h3><p className="mt-1 text-xs leading-5 text-[#7c625e]">Open essential communication references for urgent situations.</p><span className="mt-3 inline-flex items-center gap-2 text-xs font-extrabold text-rose-700">Open emergency tools <ArrowRight className="h-4 w-4" /></span></div></Link>
          <div className="sb-profile-panel flex min-h-[190px] flex-col justify-between rounded-[22px] border border-[#eadfc6] bg-gradient-to-br from-[#fffdf8] to-[#f8f0df] p-5">
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4e6c6] text-[#936714]"><Award className="h-6 w-6" /></span><span className="text-xs font-black text-[#8b671f]">YOUR ACHIEVEMENTS</span></div>
            <div><h3 className="text-xl font-black text-[#2b261e]">Certificates</h3><p className="mt-1 text-xs leading-5 text-[#786f61]">Track earned certificates and check your learning eligibility.</p><Link to="/certificates" className="mt-3 inline-flex items-center gap-2 text-xs font-extrabold text-[#946713]">View certificates <ArrowRight className="h-4 w-4" /></Link></div>
          </div>
        </div>
      </section>

      <section className="sb-dashboard-footer flex flex-col items-start justify-between gap-4 rounded-[22px] bg-[#171612] p-5 text-white sm:flex-row sm:items-center sm:px-7">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#d8b15d]">SignBridge AI</p><h2 className="mt-1 text-lg font-black">Bridging barriers through Indian Sign Language.</h2><p className="mt-1 text-xs text-white/60">Learn • Translate • Communicate</p></div>
        <div className="flex flex-wrap gap-2"><Link to="/help" className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-white/85 transition hover:border-[#d6aa4b] hover:text-[#f3d58e]">Help & Support</Link><Link to="/profile" className="rounded-lg bg-[#c3922e] px-4 py-2 text-xs font-extrabold text-[#17130b] transition hover:bg-[#e0b34f]">My Profile</Link></div>
      </section>
    </div>
  );
};
