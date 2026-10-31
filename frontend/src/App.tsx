import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { AuthModal } from './components/auth/AuthModal';

// Feature Views
import { MainDashboard } from './features/dashboard/MainDashboard';
import { LandingPage } from './features/landing/LandingPage';
import { LiveTranslator } from './features/translator/LiveTranslator';
import { TwoWayConversation } from './features/conversation/TwoWayConversation';
import { EmergencyMode } from './features/emergency/EmergencyMode';
import { SignDictionary } from './features/dictionary/SignDictionary';
import { LearningPlatform } from './features/learning/LearningPlatform';
import { PracticeStudio } from './features/practice/PracticeStudio';
import { AssessmentStudio } from './features/assessment/AssessmentStudio';
import { CertificatesView } from './features/certificates/CertificatesView';
import { PublicVerify } from './features/certificates/PublicVerify';
import { UserProfile } from './features/profile/UserProfile';
import { ProgressView } from './features/progress/ProgressView';
import { SettingsView } from './features/settings/SettingsView';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { AdminRecordsPage } from './features/admin/AdminRecordsPage';
import { SignGamesHub } from './features/games/SignGamesHub';
import { GoogleAuthCallback } from './features/auth/GoogleAuthCallback';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { InstitutionPortal } from './features/institution/InstitutionPortal';
import { DeveloperPortal } from './features/developer/DeveloperPortal';
import { HelpSupport } from './features/help/HelpSupport';
import { DatasetContributionStudio } from './features/contribution/DatasetContributionStudio';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';

// Protected Admin Guard

const ProtectedUserRoute: React.FC<{ children: React.ReactNode; onOpenAuth: () => void }> = ({ children, onOpenAuth }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-500">Checking your account…</div>;
  if (!user) return <div className="min-h-[60vh] flex items-center justify-center p-6"><div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-xl"><div className="text-4xl">🔐</div><h1 className="mt-4 text-2xl font-black">Sign in required</h1><p className="mt-2 text-sm text-slate-500">Certificate verification is available only to authenticated SignBridge users.</p><button onClick={onOpenAuth} className="mt-6 px-5 py-3 rounded-xl bg-cyan-600 text-white font-black text-sm">Sign in</button></div></div>;
  return <>{children}</>;
};

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return <div className="p-20 text-center text-slate-400">Verifying administrative access...</div>;
  if (!user || !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <AppErrorBoundary>
    <AppLayout
      onOpenAuth={() => setAuthModalOpen(true)}
    >
      <Routes>
        <Route path="/" element={<MainDashboard />} />
        <Route path="/auth/callback" element={<GoogleAuthCallback />} />
        <Route path="/overview" element={<LandingPage onOpenAuth={() => setAuthModalOpen(true)} />} />
        <Route path="/translator" element={<LiveTranslator />} />
        <Route path="/live" element={<Navigate to="/translator" replace />} />
        <Route path="/learn" element={<LearningPlatform />} />
        <Route path="/games" element={<SignGamesHub />} />
        <Route path="/help" element={<HelpSupport />} />
        <Route path="/assistant" element={<Navigate to="/help" replace />} />
        <Route path="/dictionary" element={<SignDictionary />} />
        <Route path="/practice" element={<PracticeStudio />} />
        <Route path="/assessment" element={<AssessmentStudio />} />
        <Route path="/certificates" element={<CertificatesView />} />
        <Route path="/emergency" element={<EmergencyMode />} />
        <Route path="/conversation" element={<TwoWayConversation />} />
        <Route path="/progress" element={<ProgressView onOpenAuth={() => setAuthModalOpen(true)} />} />
        <Route path="/settings" element={<SettingsView onOpenAuth={() => setAuthModalOpen(true)} />} />
        <Route path="/institution" element={<InstitutionPortal />} />
        <Route path="/contribute" element={<ProtectedUserRoute onOpenAuth={() => setAuthModalOpen(true)}><DatasetContributionStudio /></ProtectedUserRoute>} />
        <Route path="/developer" element={<DeveloperPortal />} />
        <Route path="/reset-password" element={<ResetPasswordPage onOpenAuth={() => setAuthModalOpen(true)} />} />
        <Route path="/verify/:certificateId" element={<PublicVerify />} />
        <Route path="/verify" element={<PublicVerify />} />
        <Route path="/profile" element={<UserProfile onOpenAuth={() => setAuthModalOpen(true)} />} />
        <Route path="/admin/records" element={<ProtectedAdminRoute><AdminRecordsPage /></ProtectedAdminRoute>} />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Floating Modals */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </AppLayout>
    </AppErrorBoundary>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
