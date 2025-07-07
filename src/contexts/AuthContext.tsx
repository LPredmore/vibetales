import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const validateSession = async (session: Session | null) => {
    if (!session) return null;
    
    try {
      // Validate session by making a simple auth check
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.warn('Invalid session detected, clearing local state');
        setSession(null);
        setUser(null);
        // Clear any stored auth data
        localStorage.removeItem('sb-hyiyuhjabjnksjbqfwmn-auth-token');
        return null;
      }
      return session;
    } catch (error) {
      console.warn('Session validation failed:', error);
      setSession(null);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    // Check active sessions and set up real-time subscription
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const validSession = await validateSession(session);
      setSession(validSession);
      setUser(validSession?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || !session) {
        setSession(session);
        setUser(session?.user ?? null);
      } else {
        const validSession = await validateSession(session);
        setSession(validSession);
        setUser(validSession?.user ?? null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string, remember: boolean) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
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
    <AuthContext.Provider value={{ user, session, login, register, logout, isLoading }}>
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