import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const twaEnvironment = isTWA();

  // TWA session recovery on app resume
  useEffect(() => {
    if (!twaEnvironment) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && !session) {
        // App resumed without session, try to recover
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            setSession(session);
            setUser(session.user);
            console.log('📱 TWA session recovered on app resume');
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, twaEnvironment]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Synchronous updates only - no async calls in callback
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string, remember: boolean) => {
    try {
      // For TWA, always persist sessions regardless of remember option
      const shouldPersist = twaEnvironment || remember;
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Store remember preference for TWA
      if (twaEnvironment && remember) {
        localStorage.setItem('twa-remember-login', 'true');
      }

      toast.success('Successfully logged in!');
    } catch (error: any) {
      toast.error(error.message || 'Error logging in');
      throw error;
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
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      // Clear TWA remember preference
      if (twaEnvironment) {
        localStorage.removeItem('twa-remember-login');
      }
      
      // Attempt server logout if session exists
      if (session) {
        const { error } = await supabase.auth.signOut();
        if (error && !error.message.includes('session_not_found')) {
          console.warn('Logout error:', error.message);
        }
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