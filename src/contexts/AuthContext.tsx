import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { isPWA, isTWA } from '@/utils/twaDetection';
import { debugLogger } from '@/utils/debugLogger';
import { authRecoverySystem } from '@/utils/authRecoverySystem';
import { offlineAuthSystem } from '@/utils/offlineAuthSystem';
import { authFailureHandler } from '@/utils/authFailureHandler';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isTWA: boolean;
  isPWA: boolean;
  authMode: 'full' | 'limited' | 'guest' | 'offline';
  isOfflineMode: boolean;
  isGuestMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [twaEnvironment, setTwaEnvironment] = useState(false);
  const [pwaEnvironment, setPwaEnvironment] = useState(false);
  const [authMode, setAuthMode] = useState<'full' | 'limited' | 'guest' | 'offline'>('full');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Simplified TWA/PWA detection for faster initialization
  useEffect(() => {
    const twaDetected = isTWA();
    const pwaDetected = isPWA();
    setTwaEnvironment(twaDetected);
    setPwaEnvironment(pwaDetected);
    console.log('📱 Auth environment detected:', { twaDetected, pwaDetected });
  }, []);

  // Enhanced session recovery function with new recovery system
  const recoverSession = useCallback(async () => {
    debugLogger.logSession('INFO', 'Attempting enhanced session recovery');
    try {
      // First try the enhanced recovery system
      const recoveryResult = await authRecoverySystem.attemptSessionRecovery({
        enableRetry: true,
        maxRetries: 2,
        fallbackToGuest: false,
        validateIntegrity: true
      });

      if (recoveryResult.success && recoveryResult.session) {
        setSession(recoveryResult.session);
        setUser(recoveryResult.user || null);
        setAuthMode(recoveryResult.mode);
        setIsOfflineMode(recoveryResult.mode === 'offline');
        setIsGuestMode(recoveryResult.mode === 'guest');
        
        debugLogger.logSession('INFO', 'Enhanced session recovery successful', {
          mode: recoveryResult.mode,
          method: recoveryResult.recoveryMethod
        });
        return true;
      }

      // If enhanced recovery failed, try offline auth
      const offlineResult = await offlineAuthSystem.recoverOfflineAuth();
      if (offlineResult.success) {
        setUser(offlineResult.user || null);
        setSession(null); // No active session in offline mode
        setAuthMode('offline');
        setIsOfflineMode(true);
        setIsGuestMode(false);
        
        debugLogger.logSession('INFO', 'Offline authentication recovery successful');
        return true;
      }

      // If all recovery methods failed, check if we should enable guest mode
      if (!navigator.onLine || recoveryResult.mode === 'guest') {
        const guestResult = await offlineAuthSystem.enableGuestMode();
        if (guestResult.success) {
          setUser(null);
          setSession(null);
          setAuthMode('guest');
          setIsOfflineMode(false);
          setIsGuestMode(true);
          
          debugLogger.logSession('INFO', 'Guest mode enabled as fallback');
          return true;
        }
      }

      debugLogger.logSession('WARN', 'All session recovery methods failed');
      return false;
      
    } catch (error) {
      debugLogger.logSession('ERROR', 'Enhanced session recovery failed', error);
      
      // Handle the failure with the failure handler
      const failureResult = await authFailureHandler.handleAuthFailure(error, {
        context: 'session_recovery',
        isTWA: twaEnvironment,
        isPWA: pwaEnvironment
      });

      if (failureResult.success) {
        setUser(failureResult.user || null);
        setSession(failureResult.session || null);
        setAuthMode(failureResult.mode);
        setIsOfflineMode(failureResult.mode === 'offline');
        setIsGuestMode(failureResult.mode === 'guest');
        return true;
      }

      return false;
    }
  }, [twaEnvironment, pwaEnvironment]);

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

  // Network connectivity monitoring and sync
  useEffect(() => {
    const handleOnline = async () => {
      debugLogger.logAuth('INFO', 'Network connectivity restored');
      
      // If we're in offline mode, try to sync and recover full authentication
      if (isOfflineMode) {
        try {
          const syncResult = await offlineAuthSystem.synchronizeWhenOnline();
          debugLogger.logAuth('INFO', 'Offline sync completed', syncResult);
          
          // Try to recover full authentication
          const recoveryResult = await authRecoverySystem.attemptSessionRecovery();
          if (recoveryResult.success && recoveryResult.session) {
            setSession(recoveryResult.session);
            setUser(recoveryResult.user || null);
            setAuthMode('full');
            setIsOfflineMode(false);
            toast.success('Connection restored! Full features are now available.');
          }
        } catch (error) {
          debugLogger.logAuth('ERROR', 'Online sync failed', error);
        }
      }
      
      // If we're in guest mode, try to recover authentication
      if (isGuestMode && !session) {
        const recoveryResult = await recoverSession();
        if (recoveryResult) {
          toast.success('Connection restored! Please log in to access all features.');
        }
      }
    };

    const handleOffline = () => {
      debugLogger.logAuth('INFO', 'Network connectivity lost');
      
      // If we have a valid session, try to enable offline mode
      if (session && user && !isOfflineMode) {
        offlineAuthSystem.setupOfflineAuth(
          user.id,
          user.email || '',
          user.user_metadata?.name
        ).then((success) => {
          if (success) {
            setAuthMode('offline');
            setIsOfflineMode(true);
            toast.info('You\'re now offline. Some features may be limited.');
          }
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOfflineMode, isGuestMode, session, user, recoverSession]);

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

  const login = async (email: string, password: string, remember: boolean) => {
    setIsLoading(true);
    debugLogger.logAuth('INFO', 'Enhanced login attempt started', { email, remember, isTWA: twaEnvironment, isPWA: pwaEnvironment });
    
    try {
      // Use retry mechanism for login
      const loginResult = await authFailureHandler.retryAuthentication(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }

        if (!data.session) {
          throw new Error('No session returned from login');
        }

        return {
          success: true,
          session: data.session,
          user: data.session.user,
          mode: 'full' as const
        };
      }, {
        maxAttempts: 3,
        baseDelay: 1000
      });

      if (!loginResult.success) {
        throw new Error(loginResult.error || 'Login failed');
      }

      debugLogger.logAuth('INFO', 'Login successful, setting up enhanced persistence');

      // Setup offline authentication for future use
      if (loginResult.user) {
        await offlineAuthSystem.setupOfflineAuth(
          loginResult.user.id,
          loginResult.user.email || email,
          loginResult.user.user_metadata?.name
        );
      }

      // Request persistent storage for PWA/TWA
      if ('storage' in navigator && 'persist' in navigator.storage) {
        try {
          const granted = await navigator.storage.persist();
          debugLogger.logStorage('INFO', 'Persistent storage request', { granted });
        } catch (persistErr) {
          debugLogger.logStorage('WARN', 'Persistent storage request failed', persistErr);
        }
      }

      // Store "remember me" preference
      if (remember) {
        localStorage.setItem('auth-remember-preference', 'true');
        debugLogger.logStorage('INFO', 'Remember preference saved');
      } else {
        localStorage.removeItem('auth-remember-preference');
        debugLogger.logStorage('INFO', 'Remember preference cleared');
      }

      setSession(loginResult.session!);
      setUser(loginResult.user!);
      setAuthMode('full');
      setIsOfflineMode(false);
      setIsGuestMode(false);
      
      debugLogger.logAuth('INFO', 'Enhanced login completed successfully');
      toast.success('Successfully logged in!');
      
    } catch (error: any) {
      debugLogger.logAuth('ERROR', 'Login process failed', error);
      
      // Handle login failure with enhanced error handling
      const failureResult = await authFailureHandler.handleAuthFailure(error, {
        context: 'login_attempt',
        email,
        remember,
        isTWA: twaEnvironment,
        isPWA: pwaEnvironment
      });

      if (failureResult.success) {
        // Partial success - user is in guest/offline mode
        setUser(failureResult.user || null);
        setSession(failureResult.session || null);
        setAuthMode(failureResult.mode);
        setIsOfflineMode(failureResult.mode === 'offline');
        setIsGuestMode(failureResult.mode === 'guest');
        
        const friendlyMessage = authFailureHandler.getUserFriendlyMessage(
          authFailureHandler.categorizeError(error)
        );
        toast.warning(`${friendlyMessage} You're now in ${failureResult.mode} mode.`);
      } else {
        // Complete failure
        const friendlyMessage = authFailureHandler.getUserFriendlyMessage(
          authFailureHandler.categorizeError(error)
        );
        toast.error(friendlyMessage);
        throw error;
      }
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
      debugLogger.logAuth('INFO', 'Enhanced logout attempt started');
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      setAuthMode('full');
      setIsOfflineMode(false);
      setIsGuestMode(false);
      
      // Clear all auth-related localStorage items
      const itemsToRemove = ['auth-remember-preference', 'twa-remember-login', 'auth-remember'];
      itemsToRemove.forEach(item => {
        if (localStorage.getItem(item)) {
          localStorage.removeItem(item);
          debugLogger.logStorage('INFO', `Removed localStorage item: ${item}`);
        }
      });
      
      // Clear session backup
      if (sessionStorage.getItem('session-backup')) {
        sessionStorage.removeItem('session-backup');
        debugLogger.logStorage('INFO', 'Removed session backup');
      }

      // Clear offline authentication data
      await offlineAuthSystem.clearOfflineAuthData();
      
      // Clear stored sessions from recovery system
      await authRecoverySystem.clearStoredSessions();
      
      // Clear auth error history
      authFailureHandler.clearErrorHistory();
      
      // Attempt server logout
      const { error } = await supabase.auth.signOut();
      if (error && !error.message.includes('session_not_found')) {
        debugLogger.logAuth('WARN', 'Server logout error', error);
      } else {
        debugLogger.logAuth('INFO', 'Successfully logged out from server');
      }
      
      debugLogger.logAuth('INFO', 'Enhanced logout completed successfully');
      toast.success('Successfully logged out');
      
    } catch (error: any) {
      // Even if server logout fails, clear local state
      debugLogger.logAuth('ERROR', 'Logout error', error);
      setUser(null);
      setSession(null);
      setAuthMode('full');
      setIsOfflineMode(false);
      setIsGuestMode(false);
      toast.success('Successfully logged out');
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
      authMode,
      isOfflineMode,
      isGuestMode
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
