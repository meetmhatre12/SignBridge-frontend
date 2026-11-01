import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { api } from '../services/api';
import { signOutSupabase, startGoogleOAuth } from '../services/supabaseAuth';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (fullName: string, email: string, password: string, phone?: string) => Promise<{ verificationRequired: boolean; email: string }>;
  logout: () => void;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  completeSession: (token: string, user: UserProfile) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('signbridge_token');
    if (token) {
      api.getProfile()
        .then(res => {
          if (res.success && res.data) {
            setUser(res.data);
          } else {
            logout();
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    if (res.success && res.data) {
      localStorage.setItem('signbridge_token', res.data.token);
      setUser(res.data.user);
    } else {
      throw new Error(res.error || 'Login failed');
    }
  };

  const loginWithGoogle = async () => {
    // A Google sign-in is an account switch operation. Clear any stale local
    // SignBridge session before leaving for Google's account chooser so the
    // callback cannot briefly render the previous user's dashboard.
    localStorage.removeItem('signbridge_token');
    sessionStorage.removeItem('signbridge_supabase_access_token');
    await startGoogleOAuth();
  };

  const register = async (fullName: string, email: string, password: string, phone?: string) => {
    const res = await api.register({ fullName, email, password, phone });
    if (res.success && res.data?.verificationRequired) return { verificationRequired: true, email: res.data.email || email };
    if (res.success && res.data?.token && res.data?.user) {
      localStorage.setItem('signbridge_token', res.data.token); setUser(res.data.user);
      return { verificationRequired: false, email };
    }
    throw new Error(res.error || 'Registration failed');
  };

  const logout = () => {
    const supabaseAccessToken = sessionStorage.getItem('signbridge_supabase_access_token') || undefined;
    void signOutSupabase(supabaseAccessToken);
    sessionStorage.removeItem('signbridge_supabase_access_token');
    localStorage.removeItem('signbridge_token');
    setUser(null);
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      const supabaseAccessToken = sessionStorage.getItem('signbridge_supabase_access_token') || undefined;
      void signOutSupabase(supabaseAccessToken);
      sessionStorage.removeItem('signbridge_supabase_access_token');
      localStorage.removeItem('signbridge_token');
      setUser(null);
    };
    window.addEventListener('signbridge:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('signbridge:unauthorized', handleUnauthorized);
  }, []);

  const updateUser = async (updates: Partial<UserProfile>) => {
    const res = await api.updateProfile(updates);
    if (res.success && res.data) {
      setUser(res.data);
      return;
    }
    throw new Error(res.error || 'Unable to update your profile.');
  };

  const completeSession = (token: string, nextUser: UserProfile) => { localStorage.setItem('signbridge_token', token); setUser(nextUser); };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, register, logout, updateUser, completeSession, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
