import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { isTWA } from '@/utils/twaDetection';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isTWA: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [twaEnvironment, setTwaEnvironment] = useState(false);

  // Initialize TWA detection after component mount
  useEffect(() => {
    setTwaEnvironment(isTWA());
    console.log('🔧 AuthProvider initialized, TWA detected:', isTWA());
  }, []);

  // Enhanced session recovery function
  const recoverSession = useCallback(async () => {
    console.log('🔄 Attempting session recovery...');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Session recovery error:', error);
        return false;
      }
      
      if (session) {
        setSession(session);
        setUser(session.user);
        console.log('✅ Session recovered successfully');
        return true;
      } else {
        console.log('❌ No session found to recover');
        return false;
      }
    } catch (error) {
      console.error('Session recovery failed:', error);
      return false;
    }
  }, []);

  // Enhanced TWA session recovery on app resume and startup
  useEffect(() => {
    if (!twaEnvironment) return;

    // Immediate session recovery on startup
    if (!session) {
      console.log('🚀 TWA startup session recovery');
      recoverSession();
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && !session) {
        console.log('👁️ TWA app resumed, attempting session recovery');
        recoverSession();
      }
    };

    const handleFocus = () => {
      if (!session) {
        console.log('🎯 TWA app focused, attempting session recovery');
        recoverSession();
      }
    };

    // Add multiple event listeners for comprehensive recovery
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [session, twaEnvironment, recoverSession]);

  useEffect(() => {
    console.log('🔧 Setting up auth state management...');
    
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, session ? 'session exists' : 'no session');
      
      // Synchronous updates only - no async calls in callback
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      // Log session state for debugging
      if (session) {
        console.log('✅ User authenticated:', session.user.email);
      } else {
        console.log('❌ User not authenticated');
      }
    });

    // Enhanced session recovery on startup
    const recoverSession = async () => {
      // 1. Try standard recovery
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
        setUser(session.user);
        setIsLoading(false);
        return;
      }

      // 2. Fallback: sessionStorage backup
      const backup = sessionStorage.getItem('session-backup');
      if (backup) {
        try {
          const { access_token, refresh_token, expires_at } = JSON.parse(backup);
          if (Date.now() / 1000 < expires_at) {
            const { data } = await supabase.auth.setSession({ access_token, refresh_token });
            if (data.session) {
              setSession(data.session);
              setUser(data.session.user);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          sessionStorage.removeItem('session-backup');
        }
      }
      
      setIsLoading(false);
    };

    recoverSession();

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, remember: boolean) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // 1. Supabase persistence is set to localStorage by default in client config

      // 2. Request persistent storage for PWA
      if ('storage' in navigator && 'persist' in navigator.storage) {
        try {
          const granted = await navigator.storage.persist();
          console.log('Persistent storage granted:', granted);
        } catch (persistErr) {
          console.warn('Persistent storage request failed:', persistErr);
        }
      }

      // 3. Save session backup in sessionStorage
      if (data.session) {
        sessionStorage.setItem('session-backup', JSON.stringify(data.session));
      }

      // Store "remember me" preference
      if (remember) {
        localStorage.setItem('auth-remember', 'true');
      }

      setSession(data.session);
      setUser(data.session.user);
      toast.success('Successfully logged in!');
    } catch (error: any) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Error logging in');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
      toast.success('Registration successful! Please check your email to confirm your account.');
    } catch (error: any) {
      toast.error(error.message || 'Error during registration');
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Attempting logout...');
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      // Clear all auth-related localStorage items
      localStorage.removeItem('auth-remember-preference');
      localStorage.removeItem('twa-remember-login');
      
      // Attempt server logout
      const { error } = await supabase.auth.signOut();
      if (error && !error.message.includes('session_not_found')) {
        console.warn('Logout error:', error.message);
      } else {
        console.log('✅ Successfully logged out from server');
      }
      
      toast.success('Successfully logged out');
    } catch (error: any) {
      // Even if server logout fails, clear local state
      console.warn('Logout error:', error.message);
      setUser(null);
      setSession(null);
      toast.success('Successfully logged out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, login, register, logout, isLoading, isTWA: twaEnvironment }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};