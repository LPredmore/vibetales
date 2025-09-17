import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Get environment variables and validate they exist
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing environment variable: VITE_SUPABASE_URL');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: VITE_SUPABASE_ANON_KEY');
}

// Helper function to detect TWA safely - moved outside of configuration
const detectTWA = (): boolean => {
  try {
    // Safe TWA detection that doesn't run during SSR
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent || '';
    const isTWAUserAgent = userAgent.includes('wv') && userAgent.includes('Chrome');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const hasAndroidInterface = 'Android' in window;
    const hasTWAInterface = 'TWA' in window;
    const referrer = document.referrer || '';
    const isTWAReferrer = referrer.includes('android-app://');
    
    return isTWAUserAgent || isStandalone || hasAndroidInterface || hasTWAInterface || isTWAReferrer;
  } catch (error) {
    console.warn('TWA detection failed:', error);
    return false;
  }
};

// Configure auth options for enhanced session persistence
const authOptions = {
  auth: {
    // Always persist sessions, especially important for TWA
    persistSession: true,
    // Enhanced localStorage implementation for TWA compatibility
    storage: {
      getItem: (key: string) => {
        try {
          const value = localStorage.getItem(key);
          return value;
        } catch (error) {
          console.warn('Auth storage getItem error:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn('Auth storage setItem error:', error);
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn('Auth storage removeItem error:', error);
        }
      }
    },
    // Enhanced token refresh for TWA and mobile environments
    autoRefreshToken: true,
    // Detect session in URL for all environments
    detectSessionInUrl: true,
    // Use PKCE flow for enhanced security
    flowType: 'pkce' as const,
    // Reduce token refresh margin for faster recovery
    debug: false
  }
};

// Create and export the typed Supabase client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, authOptions);

// Export the Database type for convenience
export type { Database };