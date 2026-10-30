import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Footer } from '../common/Footer';

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenAuth: () => void;
  onOpenAIAssistant: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, onOpenAuth, onOpenAIAssistant }) => {
  const location = useLocation();

  // Every route/query navigation starts at the top. This fixes footer-originated
  // navigation and deep links that previously preserved the old scroll position.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased font-sans">
      <Topbar onOpenAuth={onOpenAuth} onOpenAIAssistant={onOpenAIAssistant} />
      <main id="main-content" className="min-h-[calc(100vh-8rem)] min-w-0 overflow-x-hidden px-3 py-4 pb-10 sm:px-5 sm:py-5 lg:px-7 lg:py-7">
        {children}
      </main>
      <Footer />
    </div>
  );
};
