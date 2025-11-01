import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToastNotifications } from '@/hooks/useToastNotifications';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const notifications = useToastNotifications();

  useEffect(() => {
    // Listen for auth errors in the global scope
    const handleAuthError = (event: CustomEvent) => {
      console.warn('⚠️ Auth error detected:', event.detail);
      notifications.sessionExpired();
      navigate('/auth');
    };

    window.addEventListener('auth-error' as any, handleAuthError);
    return () => window.removeEventListener('auth-error' as any, handleAuthError);
  }, [navigate, notifications]);

  useEffect(() => {
    if (!isLoading && !user) {
      console.log('🔒 No user found, redirecting to auth');
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

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
