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
      console.error('Error checking subscription:', error);
      setIsSubscribed(false);
    } finally {
      setIsCheckingSubscription(false);
    }
  }, [user]);

  // Enhanced session recovery function with parallel subscription check
  const recoverSession = useCallback(async () => {
    console.log('🔄 Attempting session recovery');
    try {
      // Parallel: Check session AND subscription status
      const [sessionResult, subscriptionResult] = await Promise.all([
        supabase.auth.getSession(),
        user ? supabase.functions.invoke('check-subscription', { body: { userId: user.id } }).catch(() => null) : Promise.resolve(null)
      ]);
      
      if (sessionResult.error) {
        console.warn('⚠️ Session recovery error:', sessionResult.error);
        return false;
      }
      
      if (sessionResult.data.session) {
        setSession(sessionResult.data.session);
        setUser(sessionResult.data.session.user);
        
        // Update subscription status if we got it
        if (subscriptionResult?.data) {
          setIsSubscribed(subscriptionResult.data.isSubscribed || false);
        }
        
        console.log('✅ Session recovered successfully');
        return true;
      } else {
        console.warn('⚠️ No session found to recover');
        return false;
      }
    } catch (error) {
      console.error('❌ Session recovery failed:', error);
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
        console.log('📱 PWA/TWA app resumed, recovering session');
        recoverSession();
      }
    };

    const handleFocus = () => {
      if (!session) {
        console.log('🔍 PWA/TWA app focused, recovering session');
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
    console.log('🔐 Setting up auth state management');
    
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, !!session);
      
      // Synchronous updates only - no async calls in callback
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (!session) {
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
  console.log('🔑 Login attempt started');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }

    console.log('✅ Login successful');

    // Parallel: Setup persistence + prefetch user data
    const persistencePromises = [];

    // 1. Request persistent storage for PWA
    if ('storage' in navigator && 'persist' in navigator.storage) {
      persistencePromises.push(
        navigator.storage.persist().catch(err => {
          console.warn('⚠️ Persistent storage request failed:', err);
          return false;
        })
      );
    }

    // 2. Save session backup in sessionStorage
    if (data.session) {
      sessionStorage.setItem('session-backup', JSON.stringify(data.session));
    }

    // 3. Store "remember me" preference
    if (remember) {
      localStorage.setItem('auth-remember-preference', 'true');
    } else {
      localStorage.removeItem('auth-remember-preference');
    }

    // 4. Prefetch user data in parallel (don't await - happens in background)
    if (data.session.user) {
      Promise.all([
        supabase.from('sight_words').select('words_objects').eq('user_id', data.session.user.id).maybeSingle(),
        supabase.rpc('get_or_create_user_limits', { p_user_id: data.session.user.id }),
        supabase.from('favorite_stories').select('*').eq('user_id', data.session.user.id).limit(10)
      ]).catch(err => console.warn('⚠️ Prefetch failed:', err));
    }

    // Wait for critical persistence operations
    await Promise.all(persistencePromises);

    setSession(data.session);
    setUser(data.session.user);
    notifications.loginSuccess();
  } catch (error: any) {
    console.error('❌ Login process failed:', error);
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
      console.log('👋 Logout attempt started');
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      // Clear all auth-related localStorage items
      const itemsToRemove = ['auth-remember-preference', 'twa-remember-login', 'auth-remember'];
      itemsToRemove.forEach(item => localStorage.removeItem(item));
      sessionStorage.removeItem('session-backup');
      
      // Attempt server logout
      const { error } = await supabase.auth.signOut();
      if (error && !error.message.includes('session_not_found')) {
        console.warn('⚠️ Server logout error:', error);
      } else {
        console.log('✅ Successfully logged out');
      }
      
      notifications.logoutSuccess();
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      // Even if server logout fails, clear local state
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
