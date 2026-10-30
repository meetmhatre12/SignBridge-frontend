import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, BookOpen, Target, ArrowRight, Gamepad2, Award, BookMarked, ShieldAlert, Accessibility, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const MainDashboard: React.FC = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<any>(null);
  useEffect(() => { if (!user) return; api.getMyProgress().then(r => { if (r.success) setProgress(r.data); }); }, [user]);
  const completed = progress?.courses?.reduce((n:number,c:any)=>n+Number(c.completedLessons||0),0) || 0;
  const total = progress?.courses?.reduce((n:number,c:any)=>n+Number(c.totalLessons||0),0) || 0;
  const percent = total ? Math.round((completed/total)*100) : 0;
  const actions = [
    { title:'Live Translator', text:'Use your camera for supported ISL sign recognition and sentence building.', to:'/translator', icon:Camera, label:'Start translating' },
    { title:'Learning Hub', text:'Learn ISL step-by-step with chapters, theory, practice and quizzes.', to:'/learn', icon:BookOpen, label:'Continue learning' },
    { title:'Practice Studio', text:'Practice target signs and receive recognition-based feedback.', to:'/practice', icon:Target, label:'Start practice' },
    { title:'Game Studio', text:'Reinforce sign recognition with interactive visual games.', to:'/games', icon:Gamepad2, label:'Play a game' },
    { title:'ISL Dictionary', text:'Search sign names, meanings, categories and verified learning references.', to:'/dictionary', icon:BookMarked, label:'Find a sign' },
    { title:'Emergency Mode', text:'Open quick communication references for urgent situations.', to:'/emergency', icon:ShieldAlert, label:'Open emergency tools' },
    { title:'Accessibility Tools', text:'Adjust display, camera and language preferences.', to:'/settings', icon:Accessibility, label:'Open accessibility' },
    { title:'My Certificates', text:'View earned credentials and certificate eligibility after learning and assessment.', to:'/certificates', icon:Award, label:'View certificates' }
  ];
  return <div className="max-w-[1500px] mx-auto px-3 sm:px-5 lg:px-7 py-4 sm:py-6 space-y-5 sm:space-y-7">
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fffdf8] via-white to-[#f7f0df] text-slate-900 border border-[#eadfc6] shadow-sm sb-gold-glow p-6 sm:p-9 lg:p-12 min-h-[280px] flex items-center">
      <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-[#c49a45]/10"/><div className="absolute right-20 -bottom-28 w-80 h-80 rounded-full bg-[#c49a45]/5"/>
      <div className="relative max-w-4xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#f7f0df] text-[#8b671f] border border-[#eadfc6] px-3 py-1.5 text-xs font-black uppercase tracking-wider"><Sparkles className="w-3.5 h-3.5"/> ISL communication workspace</div>
        <h1 className="mt-5 text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">{user ? `Welcome back, ${user.fullName.split(' ')[0]}.` : 'Learn. Translate. Communicate.'}</h1>
        <p className="mt-4 text-sm sm:text-base lg:text-lg text-slate-600 max-w-3xl leading-7">A professional Indian Sign Language workspace to learn, practise, translate and communicate. Learn at your pace, use camera-based tools, and earn a certificate after meeting the course and assessment requirements.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link to="/translator" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 text-slate-950 px-5 py-3 text-sm font-black shadow-lg">Open Translator <ArrowRight className="w-4 h-4"/></Link><Link to="/learn" className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#eadfc6] text-slate-800 px-5 py-3 text-sm font-black">Learning Hub</Link></div>
      </div>
    </section>

    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[['Learning progress',`${percent}%`,'Lessons completed',BookOpen],['Completed lessons',String(completed),'Across your courses',BookMarked],['Certificates',user?'View credentials':'Sign in to access', 'Verified records',Award],['Practice', 'Camera based','Recognition feedback',Target]].map(([title,value,sub,Icon]:any)=><div key={title} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5"><Icon className="w-5 h-5 text-amber-700"/><p className="mt-3 text-xs font-bold text-slate-500">{title}</p><div className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{value}</div><p className="mt-1 text-[11px] text-slate-500">{sub}</p></div>)}
    </section>

    {user && <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-cyan-600">Your path</p><h2 className="mt-1 text-xl sm:text-2xl font-black">{percent === 100 ? 'Ready for the next challenge' : 'Continue your learning journey'}</h2></div><Link to="/progress" className="text-sm font-black text-cyan-600">Open Progress <ArrowRight className="inline w-4 h-4"/></Link></div><div className="mt-5 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-amber-500 transition-all" style={{width:`${percent}%`}}/></div><p className="mt-2 text-xs text-slate-500">{completed} of {total || 'available'} lessons completed</p></section>}

    <section><div className="flex items-end justify-between mb-3"><div><p className="text-xs font-black uppercase tracking-widest text-cyan-600">Workspace</p><h2 className="text-2xl font-black text-slate-900 dark:text-white">What do you want to do?</h2></div></div><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{actions.map(({title,text,to,icon:Icon,label})=><Link key={to} to={to} className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 hover:-translate-y-1 hover:border-amber-400 transition-all"><div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-amber-950/40 text-cyan-600 flex items-center justify-center"><Icon className="w-6 h-6"/></div><h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">{title}</h3><p className="mt-2 text-sm text-slate-500 leading-6 min-h-[48px]">{text}</p><div className="mt-5 inline-flex items-center gap-2 text-xs font-black text-cyan-600">{label}<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition"/></div></Link>)}</div></section>

    <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-5 sm:p-7"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-black">🤟</div><div><h3 className="font-black text-slate-900 dark:text-white">Recognition works best with clear, continuous movement</h3><p className="mt-1 text-sm text-slate-500 leading-6">Keep your hands visible, use even lighting, and pause naturally between signs. SignBridge rejects uncertain gestures instead of inventing a translation.</p></div></div></section>
  </div>;
};
