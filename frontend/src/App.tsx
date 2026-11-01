import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { AdminCertificateRequestsPage } from './features/admin/AdminCertificateRequestsPage';
import { SignGamesHub } from './features/games/SignGamesHub';
import { GoogleAuthCallback } from './features/auth/GoogleAuthCallback';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
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

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode; onOpenAuth: () => void }> = ({ children, onOpenAuth }) => {
  const { user, isAdmin, isLoading, logout } = useAuth();
  if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-500">Verifying administrative access...</div>;

  if (!user) {
    return (
      <section className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-xl">
          <div className="text-4xl">🔐</div>
          <h1 className="mt-4 text-2xl font-black">Administrator sign-in required</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Sign in with the verified Gmail account that has been authorized for SignBridge administration.</p>
          <button onClick={onOpenAuth} className="mt-6 px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-black text-sm">Sign in to Admin Studio</button>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-3xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 p-8 text-center shadow-xl">
          <div className="text-4xl">⛔</div>
          <h1 className="mt-4 text-2xl font-black">This account is not an administrator</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Admin access is granted only to verified Gmail accounts listed in the backend Render environment variable ADMIN_EMAILS. After the server configuration is updated, sign out and sign in again.</p>
          <button onClick={() => { logout(); onOpenAuth(); }} className="mt-6 px-5 py-3 rounded-xl bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 font-black text-sm">Switch administrator account</button>
        </div>
      </section>
    );
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const openAuth = () => navigate('/login');

  return (
    <AppErrorBoundary>
    <AppLayout
      onOpenAuth={openAuth}
    >
      <Routes>
        <Route path="/" element={<MainDashboard />} />
        <Route path="/login" element={<AuthModal isOpen={true} onClose={() => navigate('/', { replace: true })} />} />
        <Route path="/auth/callback" element={<GoogleAuthCallback />} />
        <Route path="/overview" element={<LandingPage onOpenAuth={() => navigate('/login')} />} />
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
        <Route path="/progress" element={<ProgressView onOpenAuth={openAuth} />} />
        <Route path="/settings" element={<SettingsView onOpenAuth={openAuth} />} />
        <Route path="/institution" element={<Navigate to="/" replace />} />
        <Route path="/contribute" element={<ProtectedUserRoute onOpenAuth={openAuth}><DatasetContributionStudio /></ProtectedUserRoute>} />
        <Route path="/developer" element={<Navigate to="/" replace />} />
        <Route path="/reset-password" element={<ResetPasswordPage onOpenAuth={openAuth} />} />
        <Route path="/verify/:certificateId" element={<PublicVerify />} />
        <Route path="/verify" element={<PublicVerify />} />
        <Route path="/profile" element={<UserProfile onOpenAuth={openAuth} />} />
        <Route path="/admin/records" element={<ProtectedAdminRoute onOpenAuth={openAuth}><AdminRecordsPage /></ProtectedAdminRoute>} />
        <Route path="/admin/certificate-requests" element={<ProtectedAdminRoute onOpenAuth={openAuth}><AdminCertificateRequestsPage /></ProtectedAdminRoute>} />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute onOpenAuth={openAuth}>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

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
