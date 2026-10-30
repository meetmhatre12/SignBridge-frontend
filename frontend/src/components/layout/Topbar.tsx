import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, HelpCircle, LogOut, Settings, UserCircle, Home, Camera, BookOpen, Gamepad2, Target, ArrowRight, MessageSquare, Building2, Upload, Code, Award, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { SignItem } from '../../types';
import { SignBridgeLogo } from '../common/SignBridgeLogo';
import { SignRepository } from '../../../../ml/sign_repository';

interface TopbarProps { onOpenAuth: () => void; }
interface SearchResult { title: string; subtitle: string; to: string; icon: React.ElementType; keywords: string[]; }

const MAIN_NAV = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/translator', label: 'Translate', icon: Camera },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/games', label: 'Practice', icon: Gamepad2 },
  { to: '/dictionary', label: 'Dictionary', icon: BookOpen },
  { to: '/emergency', label: 'Emergency', icon: ShieldAlert },
  { to: '/certificates', label: 'Certificates', icon: Award },
  { to: '/settings', label: 'Accessibility', icon: Settings },
  { to: '/help', label: 'Help & Support', icon: HelpCircle },
];

const STATIC_SEARCH: SearchResult[] = [
  { title: 'Emergency Mode', subtitle: 'Emergency recognition, confirmation and official contacts', to: '/emergency', icon: HelpCircle, keywords: ['emergency','help','police','ambulance','doctor','fire','security','hospital','112','108','1033'] },
  { title: 'Two-Way Conversation', subtitle: 'Signer ↔ speaking companion conversation workspace', to: '/conversation', icon: MessageSquare, keywords: ['conversation','two way','two-way','speak','speech','microphone','hearing'] },
  { title: 'Learning Hub', subtitle: 'Lessons, chapters, theory and ISL learning path', to: '/learn', icon: BookOpen, keywords: ['learn','learning','hub','lesson','chapter','theory','alphabet','sentence','video'] },
  { title: 'Institution & School Portal', subtitle: 'Manage classrooms, batches, teacher rosters and compliance audits', to: '/institution', icon: Building2, keywords: ['institution','school','classrooms','teacher','batch','student','roster','enterprise'] },
  { title: 'Dataset Contribution Studio', subtitle: 'Contribute hand landmark samples with informed consent', to: '/contribute', icon: Upload, keywords: ['contribute','contribution','dataset','sample','landmarks','ethical','review'] },
  { title: 'Developer & API Platform', subtitle: 'B2B integration keys, webhooks and OpenAPI 3.0 documentation', to: '/developer', icon: Code, keywords: ['developer','api','keys','webhooks','openapi','integration','token','rest'] },
  { title: 'Dictionary', subtitle: 'Search verified ISL sign references and media', to: '/dictionary', icon: BookOpen, keywords: ['dictionary','sign','word','meaning','handshape','movement'] },
  { title: 'Practice Studio', subtitle: 'Camera-guided sign practice', to: '/practice', icon: Target, keywords: ['practice','camera','training','perform','hand'] },
  { title: 'Assessments', subtitle: 'Complete the required learning path before certification', to: '/assessment', icon: Target, keywords: ['assessment','exam','test','certificate','certification'] },
  { title: 'My Certificate', subtitle: 'View certificates earned by the signed-in account', to: '/certificates', icon: Target, keywords: ['certificate','my certificate','credential','award'] },
  { title: 'Certificate Verifier', subtitle: 'Verify an ISL certificate publicly', to: '/verify', icon: Target, keywords: ['verify','certificate verifier','verification','credential'] },
  { title: 'Help & Support', subtitle: 'Get unstuck with guided explanations', to: '/help', icon: HelpCircle, keywords: ['help','question','how','support','stuck'] },
  { title: 'Settings', subtitle: '5 Themes, camera perception and regional ISL dialect preferences', to: '/settings', icon: Settings, keywords: ['settings','theme','dark','light','preferences','dialects','contrast'] },
];

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

export const Topbar: React.FC<TopbarProps> = ({ onOpenAuth }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [signs, setSigns] = useState<SignItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getSigns().then(res => {
      if (res.success && res.data?.length) setSigns(res.data);
      else setSigns(SignRepository.getAllSigns().map(s => ({ ...s, name: s.displayName, englishMeaning: s.englishMeaning })) as SignItem[]);
    }).catch(() => setSigns(SignRepository.getAllSigns().map(s => ({ ...s, name: s.displayName, englishMeaning: s.englishMeaning })) as SignItem[]));
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'SB';

  const results = useMemo(() => {
    const q = normalise(query);
    if (!q) return [] as SearchResult[];
    const tokens = q.split(' ');
    const isEmergencyQuery = /(emergency|police|ambulance|doctor|hospital|help|security|fire|officer|112|108|1033)/.test(q);
    const staticRanked = STATIC_SEARCH.map(item => {
      let score = 0;
      const hay = normalise([item.title, item.subtitle, ...item.keywords].join(' '));
      if (hay.includes(q)) score += 80;
      tokens.forEach(t => { if (hay.includes(t)) score += 12; });
      if (isEmergencyQuery && item.title === 'Emergency Mode') score += 55;
      if (q.includes('certificate') && item.title.includes('Certificate')) score += 30;
      return { item, score };
    }).filter(x => x.score > 0).sort((a,b) => b.score-a.score).map(x => x.item);

    const signResults: SearchResult[] = signs.filter(s => {
      const hay = normalise([s.id, s.name, s.displayName, s.englishMeaning, s.category, ...(s.aliases || [])].filter(Boolean).join(' '));
      return tokens.every(t => hay.includes(t));
    }).slice(0, 6).map(s => ({
      title: s.displayName || s.name || s.id,
      subtitle: `Sign • ${s.englishMeaning || 'ISL reference'} • ${s.learningLevel ? `Level ${s.learningLevel}` : 'Dictionary'}`,
      to: `/dictionary?search=${encodeURIComponent(s.displayName || s.name || s.id)}`,
      icon: BookOpen,
      keywords: [s.id, s.name, s.displayName, s.englishMeaning, s.category, ...(s.aliases || [])].filter(Boolean) as string[]
    }));

    return [...staticRanked.slice(0, 7), ...signResults].slice(0, 10);
  }, [query, signs]);

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    const first = results[0];
    if (first) navigate(first.to);
    else navigate(`/dictionary?search=${encodeURIComponent(q)}`);
    setSearchOpen(false);
  };

  const signOut = () => {
    logout();
    setMenuOpen(false);
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 dark:border-slate-800 dark:bg-[#14130f]/95 backdrop-blur-xl shadow-sm">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-7">
        <div className="min-h-16 flex items-center gap-3 lg:gap-5">
          <Link to="/" className="shrink-0" aria-label="SignBridge Home"><SignBridgeLogo compact /></Link>
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1 shrink-0">
            {MAIN_NAV.map(({to,label,icon:Icon,exact}) => {
              const active = exact ? location.pathname === '/' : location.pathname === to || location.pathname.startsWith(to + '/');
              return <Link key={to} to={to} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition ${active ? 'bg-[#f8e8c3] text-[#80570f] shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Icon className="w-4 h-4" />{label}</Link>;
            })}
          </nav>
          <div ref={searchRef} className="relative flex-1 min-w-[130px] max-w-2xl ml-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input value={query} onChange={e => { setQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onKeyDown={e => { if (e.key === 'Enter') submitSearch(); if (e.key === 'Escape') setSearchOpen(false); }} type="search" placeholder="Search signs, lessons, emergency help…" aria-label="Global search" className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c3922e]/20 focus:border-[#c3922e]" />
            {searchOpen && query.trim() && <div className="absolute top-[calc(100%+8px)] left-0 right-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
              {results.length ? results.map((r,i) => { const Icon=r.icon; return <button key={`${r.to}-${i}`} onClick={() => { navigate(r.to); setSearchOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b last:border-b-0 border-slate-100 dark:border-slate-800"><span className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-[#9b711f] dark:text-[#e0b34f] flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span><span className="min-w-0"><span className="block text-xs font-black text-slate-900 dark:text-white truncate">{r.title}</span><span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">{r.subtitle}</span></span><ArrowRight className="w-4 h-4 text-slate-300 ml-auto shrink-0" /></button>; }) : <button onClick={submitSearch} className="w-full p-4 text-left text-xs text-slate-500">No direct match. Search the Dictionary for <b>{query}</b>.</button>}
            </div>}
          </div>
          <button onClick={() => navigate('/help')} title="Help & Support" className="hidden sm:inline-flex p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700"><HelpCircle className="w-4 h-4" /></button>
          {user ? <div className="relative" ref={menuRef}><button onClick={() => setMenuOpen(v=>!v)} className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#d7aa48] to-[#9b711f] text-white flex items-center justify-center font-black text-xs">{user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initials}</div><span className="hidden lg:block max-w-28 truncate text-xs font-bold">{user.fullName}</span></button>{menuOpen && <div className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-2 z-50"><div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1"><div className="text-sm font-black truncate">{user.fullName}</div><div className="text-[11px] text-slate-500 truncate">{user.email}</div></div><Link to="/profile" onClick={()=>setMenuOpen(false)} className="flex gap-3 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"><UserCircle className="w-4 h-4 text-[#a8791d]"/>Profile</Link><Link to="/institution" onClick={()=>setMenuOpen(false)} className="flex gap-3 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"><Building2 className="w-4 h-4 text-[#a8791d]"/>Institution Portal</Link><Link to="/contribute" onClick={()=>setMenuOpen(false)} className="flex gap-3 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"><Upload className="w-4 h-4 text-[#a8791d]"/>Contribute Data</Link><Link to="/developer" onClick={()=>setMenuOpen(false)} className="flex gap-3 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"><Code className="w-4 h-4 text-[#a8791d]"/>Developer API</Link>{(user.role === 'admin' || user.role === 'organization_admin') && <Link to="/admin" onClick={()=>setMenuOpen(false)} className="flex gap-3 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-amber-500"><Target className="w-4 h-4 text-amber-500"/>Admin Studio</Link>}<Link to="/settings" onClick={()=>setMenuOpen(false)} className="flex gap-3 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"><Settings className="w-4 h-4 text-[#a8791d]"/>Settings & Themes</Link><button onClick={signOut} className="w-full flex gap-3 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-t border-slate-100 dark:border-slate-800 mt-1 pt-2"><LogOut className="w-4 h-4"/>Sign Out</button></div>}</div> : <button onClick={onOpenAuth} className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20">Sign In</button>}
        </div>
        <nav aria-label="Mobile primary navigation" className="md:hidden flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
          {MAIN_NAV.map(({to,label,icon:Icon,exact}) => { const active=exact?location.pathname==='/':location.pathname===to||location.pathname.startsWith(to+'/'); return <Link key={to} to={to} className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black ${active?'bg-[#f8e8c3] text-[#80570f]':'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}><Icon className="w-3.5 h-3.5"/>{label}</Link>; })}
        </nav>
      </div>
    </header>
  );
};
