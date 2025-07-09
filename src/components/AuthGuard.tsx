import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, session, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth errors in the global scope
    const handleAuthError = (event: CustomEvent) => {
      console.warn('Auth error detected:', event.detail);
      toast.error('Session expired. Please log in again.');
      navigate('/login');
    };

    window.addEventListener('auth-error' as any, handleAuthError);
    return () => window.removeEventListener('auth-error' as any, handleAuthError);
  }, [navigate]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
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
        <div>Redirecting to login...</div>
      </div>
    );
  }

  return <>{children}</>;
};