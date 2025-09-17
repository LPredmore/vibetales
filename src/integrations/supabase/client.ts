// This file re-exports the unified Supabase client configuration
// The actual implementation is now in src/lib/supabase.ts with environment variable validation

export { supabase, type Database } from '@/lib/supabase';