import { useEffect } from 'react';
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

  useEffect(() => {
    debugLogger.logLifecycle('INFO', 'AuthGuard mounted', {
      hasUser: !!user,
      hasSession: !!session,
      isLoading,
      currentPath: window.location.pathname
    });
  }, []);

  useEffect(() => {
    debugLogger.logAuth('INFO', 'AuthGuard auth state changed', {
      hasUser: !!user,
      hasSession: !!session,
      isLoading,
      userId: user?.id,
      sessionExpiry: session?.expires_at
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
      debugLogger.logAuth('INFO', 'AuthGuard redirecting to auth - no user found', {
        isLoading,
        hasUser: !!user,
        currentPath: window.location.pathname
      });
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  // Timeout fallback - if loading takes more than 5 seconds, redirect to auth
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Auth loading timeout - redirecting to auth');
        navigate('/auth');
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-purple-600 font-semibold">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center">
        <div className="text-purple-600">Redirecting to auth...</div>
      </div>
    );
  }

  return <>{children}</>;
};