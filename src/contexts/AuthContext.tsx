import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { isPWA, isTWA } from '@/utils/twaDetection';
import { debugLogger } from '@/utils/debugLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isTWA: boolean;
  isPWA: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [twaEnvironment, setTwaEnvironment] = useState(false);
  const [pwaEnvironment, setPwaEnvironment] = useState(false);

  // Simplified TWA/PWA detection for faster initialization
  useEffect(() => {
    const twaDetected = isTWA();
    const pwaDetected = isPWA();
    setTwaEnvironment(twaDetected);
    setPwaEnvironment(pwaDetected);
    console.log('📱 Auth environment detected:', { twaDetected, pwaDetected });
  }, []);

  // Enhanced session recovery function
  const recoverSession = useCallback(async () => {
    debugLogger.logSession('INFO', 'Attempting session recovery');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        debugLogger.logSession('WARN', 'Session recovery error', error);
        return false;
      }
      
      if (session) {
        setSession(session);
        setUser(session.user);
        debugLogger.logSession('INFO', 'Session recovered successfully', {
          userId: session.user.id,
          expiresAt: session.expires_at
        });
        return true;
      } else {
        debugLogger.logSession('WARN', 'No session found to recover');
        return false;
      }
    } catch (error) {
      debugLogger.logSession('ERROR', 'Session recovery failed', error);
      return false;
    }
  }, []);

  // Enhanced PWA/TWA session recovery on app resume and startup
  useEffect(() => {
    if (!pwaEnvironment && !twaEnvironment) return;

    // Immediate session recovery on startup
    if (!session) {
      console.log('🚀 PWA/TWA startup session recovery');
      recoverSession();
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && !session) {
        debugLogger.logTWA('INFO', 'PWA/TWA app resumed, attempting session recovery', {
          hidden: document.hidden,
          hasSession: !!session,
          isPWA: pwaEnvironment,
          isTWA: twaEnvironment
        });
        recoverSession();
      }
    };

    const handleFocus = () => {
      if (!session) {
        debugLogger.logTWA('INFO', 'PWA/TWA app focused, attempting session recovery');
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
  }, [session, twaEnvironment, pwaEnvironment, recoverSession]);

  useEffect(() => {
    debugLogger.logAuth('INFO', 'Setting up auth state management');
    
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      debugLogger.logAuth('INFO', 'Auth state changed', {
        event,
        hasSession: !!session,
        sessionExpiry: session?.expires_at,
        userId: session?.user?.id
      });
      
      // Synchronous updates only - no async calls in callback
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      // Log session state for debugging
      if (session) {
        debugLogger.logAuth('INFO', 'User authenticated', { email: session.user.email });
      } else {
        debugLogger.logAuth('INFO', 'User not authenticated');
      }
    });

    // Simplified session recovery for faster startup
    const startupRecoverSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔐 Session check:', !!session);
        
        if (session) {
          setSession(session);
          setUser(session.user);
        }
        
        if (error) {
          console.error('❌ Session recovery error:', error);
        }
      } catch (error) {
        console.error('❌ Session recovery error:', error);
      } finally {
        // Ensure loading state is cleared even on error
        setIsLoading(false);
      }
    };

    startupRecoverSession();

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, remember: boolean) => {
  setIsLoading(true);
  debugLogger.logAuth('INFO', 'Login attempt started', { email, remember, isTWA: twaEnvironment, isPWA: pwaEnvironment });
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      debugLogger.logAuth('ERROR', 'Login failed', error);
      throw error;
    }

    debugLogger.logAuth('INFO', 'Login successful, setting up persistence');

    // 1. Session is already persisted by default in Supabase client config

    // 2. Request persistent storage for PWA
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const granted = await navigator.storage.persist();
        debugLogger.logStorage('INFO', 'Persistent storage request', { granted });
      } catch (persistErr) {
        debugLogger.logStorage('WARN', 'Persistent storage request failed', persistErr);
      }
    }

    // 3. Save session backup in sessionStorage
    if (data.session) {
      sessionStorage.setItem('session-backup', JSON.stringify(data.session));
      debugLogger.logSession('INFO', 'Session backup saved', {
        expiresAt: data.session.expires_at,
        hasTokens: !!(data.session.access_token && data.session.refresh_token)
      });
    }

    // Store "remember me" preference
    if (remember) {
      localStorage.setItem('auth-remember-preference', 'true');
      debugLogger.logStorage('INFO', 'Remember preference saved');
    } else {
      localStorage.removeItem('auth-remember-preference');
      debugLogger.logStorage('INFO', 'Remember preference cleared');
    }

    setSession(data.session);
    setUser(data.session.user);
    debugLogger.logAuth('INFO', 'Login completed successfully');
    toast.success('Successfully logged in!');
  } catch (error: any) {
    debugLogger.logAuth('ERROR', 'Login process failed', error);
    toast.error(error.message || 'Error logging in');
    throw error;
  } finally {
    setIsLoading(false);
  }
};

  const register = async (name: string, email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
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
      
      // If session is immediately available (no email confirmation required)
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        console.log('✅ Session set immediately after registration');
      }
      
      toast.success('Registration successful! Please check your email to confirm your account.');
    } catch (error: any) {
      toast.error(error.message || 'Error during registration');
      throw error;
    }
  };

  const logout = async () => {
    try {
      debugLogger.logAuth('INFO', 'Logout attempt started');
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      // Clear all auth-related localStorage items
      const itemsToRemove = ['auth-remember-preference', 'twa-remember-login', 'auth-remember'];
      itemsToRemove.forEach(item => {
        if (localStorage.getItem(item)) {
          localStorage.removeItem(item);
          debugLogger.logStorage('INFO', `Removed localStorage item: ${item}`);
        }
      });
      
      if (sessionStorage.getItem('session-backup')) {
        sessionStorage.removeItem('session-backup');
        debugLogger.logStorage('INFO', 'Removed session backup');
      }
      
      // Attempt server logout
      const { error } = await supabase.auth.signOut();
      if (error && !error.message.includes('session_not_found')) {
        debugLogger.logAuth('WARN', 'Server logout error', error);
      } else {
        debugLogger.logAuth('INFO', 'Successfully logged out from server');
      }
      
      toast.success('Successfully logged out');
    } catch (error: any) {
      // Even if server logout fails, clear local state
      debugLogger.logAuth('ERROR', 'Logout error', error);
      setUser(null);
      setSession(null);
      toast.success('Successfully logged out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, login, register, logout, isLoading, isTWA: twaEnvironment, isPWA: pwaEnvironment }}>
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
