import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useToastNotifications } from '@/hooks/useToastNotifications';
import { isPWA, isTWA } from '@/utils/twaDetection';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isTWA: boolean;
  isPWA: boolean;
  isSubscribed: boolean | null;
  isCheckingSubscription: boolean;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [twaEnvironment, setTwaEnvironment] = useState(false);
  const [pwaEnvironment, setPwaEnvironment] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const notifications = useToastNotifications();

  // Simplified TWA/PWA detection for faster initialization
  useEffect(() => {
    const twaDetected = isTWA();
    const pwaDetected = isPWA();
    setTwaEnvironment(twaDetected);
    setPwaEnvironment(pwaDetected);
    console.log('📱 Auth environment detected:', { twaDetected, pwaDetected });
  }, []);

  // Centralized subscription check function
  const refreshSubscription = useCallback(async () => {
    if (!user) {
      setIsSubscribed(false);
      return;
    }
    
    setIsCheckingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        body: { userId: user.id }
      });
      
      if (error) throw error;
      setIsSubscribed(data?.isSubscribed || false);
    } catch (error) {
      console.error('[AUTH] Error checking subscription:', error);
      setIsSubscribed(false);
    } finally {
      setIsCheckingSubscription(false);
    }
  }, [user]);

  // Enhanced session recovery function with parallel loading
  const recoverSession = useCallback(async () => {
    console.log('[SESSION] Attempting session recovery');
    try {
      // Load session and subscription in parallel
      const [sessionResult, subscriptionResult] = await Promise.all([
        supabase.auth.getSession(),
        user ? supabase.functions.invoke('check-subscription', { 
          body: { userId: user.id } 
        }) : Promise.resolve(null)
      ]);
      
      if (sessionResult.error) {
        console.warn('[SESSION] Recovery error:', sessionResult.error);
        return false;
      }
      
      if (sessionResult.data?.session) {
        setSession(sessionResult.data.session);
        setUser(sessionResult.data.session.user);
        
        // Update subscription if available
        if (subscriptionResult?.data) {
          setIsSubscribed(subscriptionResult.data.isSubscribed || false);
        }
        
        console.log('[SESSION] Recovered successfully');
        return true;
      } else {
        console.warn('[SESSION] No session found to recover');
        return false;
      }
    } catch (error) {
      console.error('[SESSION] Recovery failed:', error);
      return false;
    }
  }, [user]);

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
        console.log('[TWA] App resumed, attempting session recovery');
        recoverSession();
      }
    };

    const handleFocus = () => {
      if (!session) {
        console.log('[TWA] App focused, attempting session recovery');
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
    console.log('[AUTH] Setting up auth state management');
    
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH] Auth state changed:', {
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
        console.log('[AUTH] User authenticated:', { email: session.user.email });
      } else {
        console.log('[AUTH] User not authenticated');
        setIsSubscribed(false);
      }
    });

    // Simplified session recovery for faster startup
    const startupRecoverSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔐 Session check:', !!session);
      } catch (error) {
        console.error('❌ Session recovery error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    startupRecoverSession();

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  // Check subscription status when user changes
  useEffect(() => {
    if (user) {
      refreshSubscription();
    }
  }, [user, refreshSubscription]);

  const login = async (email: string, password: string, remember: boolean) => {
    setIsLoading(true);
    console.log('[AUTH] Login attempt started:', { email, remember, isTWA: twaEnvironment, isPWA: pwaEnvironment });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[AUTH] Login failed:', error);
        throw error;
      }

      console.log('[AUTH] Login successful, setting up persistence');

      // 1. Session is already persisted by default in Supabase client config

      // 2. Request persistent storage for PWA
      if ('storage' in navigator && 'persist' in navigator.storage) {
        try {
          const granted = await navigator.storage.persist();
          console.log('[STORAGE] Persistent storage request:', { granted });
        } catch (persistErr) {
          console.warn('[STORAGE] Persistent storage request failed:', persistErr);
        }
      }

      // 3. Save session backup in sessionStorage
      if (data.session) {
        sessionStorage.setItem('session-backup', JSON.stringify(data.session));
        console.log('[SESSION] Session backup saved');
      }

      // Store "remember me" preference
      if (remember) {
        localStorage.setItem('auth-remember-preference', 'true');
      } else {
        localStorage.removeItem('auth-remember-preference');
      }

      setSession(data.session);
      setUser(data.session.user);
      console.log('[AUTH] Login completed successfully');
      notifications.loginSuccess();
    } catch (error: any) {
      console.error('[AUTH] Login process failed:', error);
      notifications.loginFailed(error.message);
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
      notifications.registrationSuccess();
    } catch (error: any) {
      notifications.registrationFailed(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('[AUTH] Logout attempt started');
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      // Clear all auth-related localStorage items
      const itemsToRemove = ['auth-remember-preference', 'twa-remember-login', 'auth-remember'];
      itemsToRemove.forEach(item => {
        if (localStorage.getItem(item)) {
          localStorage.removeItem(item);
        }
      });
      
      if (sessionStorage.getItem('session-backup')) {
        sessionStorage.removeItem('session-backup');
      }
      
      // Attempt server logout
      const { error } = await supabase.auth.signOut();
      if (error && !error.message.includes('session_not_found')) {
        console.warn('[AUTH] Server logout error:', error);
      } else {
        console.log('[AUTH] Successfully logged out from server');
      }
      
      notifications.logoutSuccess();
    } catch (error: any) {
      // Even if server logout fails, clear local state
      console.error('[AUTH] Logout error:', error);
      setUser(null);
      setSession(null);
      notifications.logoutSuccess();
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      login, 
      register, 
      logout, 
      isLoading, 
      isTWA: twaEnvironment, 
      isPWA: pwaEnvironment,
      isSubscribed,
      isCheckingSubscription,
      refreshSubscription
    }}>
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
