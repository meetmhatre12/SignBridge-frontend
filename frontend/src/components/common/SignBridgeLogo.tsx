import React from 'react';

interface SignBridgeLogoProps {
  compact?: boolean;
  showTagline?: boolean;
  className?: string;
}

export const SignBridgeLogo: React.FC<SignBridgeLogoProps> = ({ compact = false, showTagline = true, className = '' }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <img src="/signbridge-logo.svg" alt="SignBridge logo" className={compact ? 'w-9 h-9' : 'w-11 h-11'} />
    {!compact && (
      <div className="min-w-0">
        <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">SignBridge <span className="text-cyan-600 dark:text-cyan-400">AI</span></div>
        {showTagline && <div className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Signs • Connect • Hearts</div>}
      </div>
    )}
  </div>
);
