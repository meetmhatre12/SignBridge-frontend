import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Camera, 
  MessageSquare, 
  BookOpen, 
  Award, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Volume2, 
  HelpCircle,
  ShieldAlert,
  Zap,
  Globe
} from 'lucide-react';

export const LandingPage: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  return (
    <div className="space-y-24 pb-16">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-8 sm:pt-20 sm:pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Hero Tag */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-900/90 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-400 text-xs font-bold shadow-sm dark:shadow-lg">
          <Sparkles className="w-4 h-4 text-amber-700 dark:text-cyan-400" />
          <span>Learn, Translate & Communicate in ISL</span>
        </div>

        {/* Hero Headline */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Seamless Communication for Indian Sign Language.
          </h1>
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Real-time camera vision recognizes ISL gestures, structures multi-sign sequences, generates natural English sentences, and speaks aloud after stable recognition and sentence assembly.
          </p>
        </div>

        {/* Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            to="/translator"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-black text-base transition-all shadow-xl shadow-amber-600/20 flex items-center justify-center space-x-2 group hover:scale-[1.02]"
          >
            <Camera className="w-5 h-5 text-white" />
            <span>Try Live Translator</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/learn"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold text-base transition-all border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-xl flex items-center justify-center space-x-2"
          >
            <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span>Start Learning ISL</span>
          </Link>
        </div>

        {/* Hero Feature Pills */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-semibold">
          <span className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Stable Recognition Acceptance</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Recognition-ready signs with expandable learning content</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Modular Spoken Output Architecture</span>
          </span>
        </div>
      </section>

      {/* 2. HOW IT WORKS WORKFLOW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">End-to-End Pipeline</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">How SignBridge Works</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            From physical gestures to natural vocal speech in milliseconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { step: '01', title: 'Camera & Vision', desc: 'Captures 30 FPS video frames and extracts 21 3D hand landmarks per hand in-browser.', icon: Camera },
            { step: '02', title: 'Sign Recognition', desc: 'Evaluates spatial angles and temporal motion against verified ISL templates.', icon: Zap },
            { step: '03', title: 'Confidence Gate', desc: 'Accepts output only if confidence ≥90%. Low confidence triggers retry guidance.', icon: ShieldCheck },
            { step: '04', title: 'NLP Sentence', desc: 'Converts raw sign sequence tokens into fluent, grammatically natural English.', icon: MessageSquare },
            { step: '05', title: 'Text & Voice', desc: 'Outputs visual text and speaks natural voice aloud for hearing companions.', icon: Volume2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white dark:bg-slate-900/90 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 relative group hover:border-amber-500/40 shadow-sm dark:shadow-md transition-all"
              >
                <span className="text-2xl font-black text-slate-300 dark:text-slate-700 group-hover:text-amber-500/60 transition-colors">
                  {item.step}
                </span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-cyan-200 dark:border-amber-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. TWO-WAY CONVERSATION & EMERGENCY HIGHLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          
          {/* Card 1: Two-Way Conversation */}
          <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm dark:shadow-xl transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Two-Way Conversational Loop</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Direction A translates ISL gestures into spoken voice. Direction B transcribes the hearing companion's speech into readable visual text on the ISL user's display in real time.
            </p>
            <Link
              to="/conversation"
              className="inline-flex items-center space-x-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 pt-2"
            >
              <span>Explore Conversation Mode</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Emergency Mode */}
          <div className="bg-rose-50/50 dark:bg-gradient-to-br dark:from-rose-950/40 dark:via-slate-950 dark:to-slate-950 p-8 rounded-3xl border-2 border-rose-300 dark:border-rose-500/40 space-y-5 shadow-sm dark:shadow-xl transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">High-Reliability Emergency Mode</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Prioritizes life-safety reliability over vocabulary breadth. Instant 8-sign scanner and one-touch vocal siren for medical, police, water, and assistance alerts.
            </p>
            <Link
              to="/emergency"
              className="inline-flex items-center space-x-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-500 pt-2"
            >
              <span>Launch Emergency Mode</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* 4. LEARNING & CERTIFICATION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Learn • Practice • Certify</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">4-Level Practical ISL Curriculum</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Learn through camera practice with real-time accuracy scoring, then take formal practical assessments to earn verifiable certificates.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { level: 'Level 1', title: 'ISL Foundations', signs: 'Greetings, Please, Thanks, Yes, No', hours: '1.5 hrs' },
            { level: 'Level 2', title: 'Everyday Needs', signs: 'Water, Food, Need, Stop, Go, Come', hours: '2.0 hrs' },
            { level: 'Level 3', title: 'Practical Dialogue', signs: 'Home, School, Family, Where, What', hours: '2.5 hrs' },
            { level: 'Level 4', title: 'Urgent & Assistive', signs: 'Doctor, Hospital, Police, Help', hours: '3.0 hrs' },
          ].map(lvl => (
            <div
              key={lvl.level}
              className="bg-white dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between hover:border-amber-400/60 shadow-sm dark:shadow-md transition-all"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                  {lvl.level}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{lvl.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{lvl.signs}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-semibold flex justify-between">
                <span>{lvl.hours}</span>
                <span className="text-cyan-600 dark:text-cyan-400">Camera Exam</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. PLAN ENTITLEMENTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Access Plans</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Choose Your Plan</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Clear entitlement tiers for individuals, power learners, and institutions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Free Plan */}
          <div className="bg-white dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5 flex flex-col justify-between shadow-sm dark:shadow-md">
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Starter</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">FREE</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Essential communication tools for daily use.</p>

              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Live ISL Camera Translator</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Full 105+ ISL Dictionary</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Level 1 Starter Curriculum</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Emergency Assistive Mode</span>
                </li>
              </ul>
            </div>

            <Link
              to="/translator"
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs text-center block transition-all"
            >
              Get Started Free
            </Link>
          </div>

          {/* Premium Plan */}
          <div className="bg-cyan-50/40 dark:bg-gradient-to-b dark:from-cyan-950/20 dark:to-slate-950 p-6 rounded-3xl border-2 border-cyan-400 dark:border-cyan-500/50 space-y-5 flex flex-col justify-between shadow-lg relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-600 text-white text-[10px] font-black uppercase tracking-wider shadow">
              Recommended
            </span>

            <div className="space-y-3">
              <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase">Power Learner</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">PREMIUM</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Complete curriculum, certifications, and personalization.</p>

              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-cyan-200 dark:border-slate-800">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>All 4 Learning Levels & Chapters</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Two-Way Continuous Conversation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Formal Camera Assessments</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Cryptographic QR Certificates</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Grounded ISL AI Assistant</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenAuth}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs text-center block shadow-md shadow-cyan-600/20 transition"
            >
              Sign Up for Premium
            </button>
          </div>

          {/* Institution Plan */}
          <div className="bg-white dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5 flex flex-col justify-between shadow-sm dark:shadow-md">
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Organizations</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">INSTITUTION</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">For schools, hospitals, and public service providers.</p>

              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Multi-User Student Accounts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Institutional Learning Analytics</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Batch Assessment Certification</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Dedicated Admin Control Studio</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenAuth}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs text-center block transition-all"
            >
              Contact for Enterprise
            </button>
          </div>

        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Common Questions</span>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: 'Does SignBridge recognize all Indian Sign Language?',
              a: 'SignBridge separates educational curriculum from camera vision. Our learning platform covers 105+ verified ISL signs, while our high-precision camera vision system is calibrated specifically on 25 core high-utility signs (greetings, needs, hospital, police, emergency).'
            },
            {
              q: 'How does SignBridge decide when a recognition is stable enough for voice output?',
              a: 'Safety and clarity are paramount in communication. To prevent speaking erroneous words, voice output is only generated when camera vision confidence reaches or exceeds 90%.'
            },
            {
              q: 'Is raw camera video stored on servers?',
              a: 'No. By default, video frames are processed locally inside your browser to extract numerical landmark coordinates. Raw video is never stored.'
            },
            {
              q: 'How does certificate verification work?',
              a: 'Every issued certificate contains a unique ID (e.g. ISL-2026-XXXXXX) and a QR code that links to the public verification portal on SignBridge.'
            }
          ].map((faq, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>{faq.q}</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
