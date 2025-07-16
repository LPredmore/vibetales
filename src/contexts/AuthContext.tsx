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

    // THEN check for existing session with enhanced error handling
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Session initialization error:', error);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        console.log('🏁 Session initialization complete:', session ? 'authenticated' : 'not authenticated');
      } catch (error) {
        console.error('Critical session initialization error:', error);
        setIsLoading(false);
      }
    };

    initializeSession();

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, remember: boolean) => {
    try {
      console.log('🔐 Attempting login...', { email, remember, twaEnvironment });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        throw error;
      }

      // Store remember preference for enhanced session persistence
      if (remember || twaEnvironment) {
        localStorage.setItem('auth-remember-preference', 'true');
        console.log('💾 Remember preference stored');
      } else {
        localStorage.removeItem('auth-remember-preference');
      }

      // Verify session was established
      if (data.session) {
        console.log('✅ Login successful, session established');
        setSession(data.session);
        setUser(data.session.user);
      }

      toast.success('Successfully logged in!');
    } catch (error: any) {
      console.error('Login failed:', error);
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