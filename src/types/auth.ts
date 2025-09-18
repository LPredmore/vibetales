// Authentication related types

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
  session?: any;
  user?: any;
}

export interface SupabaseAuthResponse {
  data: {
    user: any;
    session: any;
  };
  error: AuthError | null;
}