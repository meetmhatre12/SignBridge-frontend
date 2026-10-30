import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { SignBridgeLogo } from './SignBridgeLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 text-sm mt-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          
          {/* Brand Col */}
          <div className="col-span-2 space-y-3">
            <Link to="/" className="inline-block"><SignBridgeLogo compact={false} showTagline={true} /></Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              Indian Sign Language communication and learning platform. Real-time camera gesture recognition, sequence synthesis, context-aware NLP, and accessible assistive communication.
            </p>
            <div className="pt-2 flex items-center space-x-2 text-xs text-cyan-600 dark:text-cyan-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy-aware, account-scoped learning records</span>
            </div>
          </div>

          {/* Features Col */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Assistive Tools</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/translator" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Live Translator</Link></li>
              <li><Link to="/conversation" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Two-Way Conversation</Link></li>
              <li><Link to="/emergency" className="text-rose-600 dark:text-rose-400 hover:text-rose-500 font-medium transition-colors">Emergency Mode</Link></li>
              <li><Link to="/dictionary" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">ISL Dictionary</Link></li>
            </ul>
          </div>

          {/* Learning & Certificates */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Learn & Certify</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/learn" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Structured Curriculum</Link></li>
              <li><Link to="/assessment" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Camera Assessment</Link></li>
              <li><Link to="/certificates" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Earn ISL Certificate</Link></li>
              <li><Link to="/certificates" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">My Certificates</Link></li>
              <li><Link to="/verify" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Verify Certificate</Link></li>
            </ul>
          </div>

          {/* Legal & Governance */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Transparency</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/profile" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Privacy & Data Settings</Link></li>
              <li><span className="text-slate-500 dark:text-slate-400">Camera Permission Policy</span></li>
              <li><span className="text-slate-500 dark:text-slate-400">Recognition scope is shown in the Translate and Practice interfaces</span></li>
              <li><span className="text-slate-500 dark:text-slate-400">Accessibility Guidelines</span></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 SignBridge. Developed for accessible Indian Sign Language communication.</p>
          <div className="flex items-center space-x-4 mt-3 sm:mt-0">
            <span>Development recognition baseline</span>
            <span>•</span>
            <span className="text-slate-600 dark:text-slate-400">Metrics require audited evaluation</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
