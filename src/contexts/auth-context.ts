import { createContext } from 'react';
import { Session, User } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isTWA: boolean;
  isPWA: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);