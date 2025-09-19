// Authentication related types
import type { Session, User } from '@supabase/supabase-js';

export interface AuthError {
  message: string;
  status?: number;
  code?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface ResetPasswordCredentials {
  email: string;
}

export interface AuthEventData {
  error?: AuthError;
  session?: Session | null;
  user?: User | null;
}

export interface SupabaseAuthResponse {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: AuthError | null;
}