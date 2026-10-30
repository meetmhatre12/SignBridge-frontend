import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, BookOpen, Gamepad2, BookMarked, Bot, ShieldCheck, UserCircle, ArrowRight, CircleHelp } from 'lucide-react';

const items = [
  { icon: Camera, title: 'Camera & recognition', body: 'Allow camera access, keep the full hand inside the guide, use even front lighting, and hold a sign steady for a moment. If the camera is busy, close other camera tabs/apps and restart the preview.', to: '/practice' },
  { icon: BookOpen, title: 'Learning Hub', body: 'Start with a chapter, open a lesson, read the short theory, study the included signs, then move to practice. Complete lessons only after you understand the target signs.', to: '/learn' },
  { icon: Gamepad2, title: 'Games', body: 'Alphabet Quiz shows an ISL reference image first. Pick A–D, then review the exact answer. Flashcards use reveal → review → next, while Sign Match counts every pair attempt.', to: '/games' },
  { icon: BookMarked, title: 'Dictionary', body: 'Search by sign name or meaning. Open a sign to see meaning, hand shape, starting position, palm orientation, movement and ending position. If verified media is unavailable, SignBridge says so instead of inventing it.', to: '/dictionary' },
  { icon: Bot, title: 'AI Assistant', body: 'Ask naturally: “How do I do HELLO?”, “What does WATER mean?”, or “Can the camera recognize this sign?” The assistant keeps sign instructions grounded in SignBridge reference data.', to: '/assistant' },
  { icon: UserCircle, title: 'Profile & password', body: 'Edit your name and optional phone number from Profile. Google profile photos stay managed by Google. A Google account can create a separate SignBridge password for email/password login.', to: '/profile' },
  { icon: ShieldCheck, title: 'Assessment & certificate', body: 'Sign in, complete the practical assessment, meet the required score, and then access the certificate. Signing up alone does not falsely award a certificate.', to: '/assessment' },
];

export const HelpSupport: React.FC<{ onOpenAIAssistant?: () => void }> = ({ onOpenAIAssistant }) => (
  <div className="max-w-6xl mx-auto px-3 sm:px-5 py-5 sm:py-8 space-y-6">
    <header className="relative overflow-hidden rounded-[2rem] border border-amber-200 bg-gradient-to-br from-white via-amber-50 to-sky-50 p-6 sm:p-9 shadow-sm">
      <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="relative max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white border border-amber-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-800"><CircleHelp className="w-4 h-4" /> Help & Support</div>
        <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">Get unstuck without guessing.</h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-6">Use these short guides for the camera, learning, games, dictionary, AI, profile and certification. Every guide tells you what to do next.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {onOpenAIAssistant && <button onClick={onOpenAIAssistant} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 shadow-sm">Ask SignBridge AI <ArrowRight className="w-4 h-4" /></button>}
          <Link to="/dictionary" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800">Open Dictionary <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </header>
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(({ icon: Icon, title, body, to }) => (
        <Link key={title} to={to} className="group rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 hover:-translate-y-0.5 hover:border-amber-300 transition shadow-sm">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
          <h2 className="mt-4 text-lg font-black text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-amber-700">Open section <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" /></div>
        </Link>
      ))}
    </section>
  </div>
);
