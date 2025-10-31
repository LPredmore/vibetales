import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { debugLogger } from '@/utils/debugLogger';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, session, isLoading } = useAuth();
  const navigate = useNavigate();
  const [mountTime] = useState(Date.now());

  useEffect(() => {
    debugLogger.logLifecycle('INFO', 'AuthGuard: Component mounted', {
      hasUser: !!user,
      hasSession: !!session,
      isLoading,
      currentPath: window.location.pathname,
      timestamp: Date.now()
    });
  }, []);

  useEffect(() => {
    debugLogger.logAuth('INFO', 'AuthGuard: Auth state changed', {
      hasUser: !!user,
      hasSession: !!session,
      isLoading,
      userId: user?.id,
      sessionExpiry: session?.expires_at,
      timestamp: Date.now()
    });
  }, [user, session, isLoading]);

  useEffect(() => {
    // Listen for auth errors in the global scope
    const handleAuthError = (event: CustomEvent) => {
      debugLogger.logAuth('ERROR', 'Auth error event received', event.detail);
      console.warn('Auth error detected:', event.detail);
      toast.error('Session expired. Please log in again.');
      navigate('/auth');
    };

    window.addEventListener('auth-error' as any, handleAuthError);
    return () => window.removeEventListener('auth-error' as any, handleAuthError);
  }, [navigate]);

  useEffect(() => {
    if (!isLoading && !user) {
      // Wait at least 500ms after mount before redirecting
      const timeSinceMount = Date.now() - mountTime;
      const delay = Math.max(0, 500 - timeSinceMount);
      
      const timer = setTimeout(() => {
        if (!user) {  // Check again after delay
          debugLogger.logAuth('WARN', 'AuthGuard: Redirecting to /auth - no user after delay', {
            isLoading,
            hasUser: !!user,
            hasSession: !!session,
            currentPath: window.location.pathname,
            delayMs: delay,
            timeSinceMount: Date.now() - mountTime
          });
          navigate('/auth');
        } else {
          debugLogger.logAuth('INFO', 'AuthGuard: User appeared during delay, redirect cancelled', {
            userId: user.id
          });
        }
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, navigate, mountTime]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center">
        <div>Redirecting to auth...</div>
      </div>
    );
  }

  return <>{children}</>;
};