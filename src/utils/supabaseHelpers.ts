import { supabase } from '@/integrations/supabase/client';

/**
 * Centralized helper for getting the current authenticated user
 * @throws Error if user is not authenticated or auth fails
 * @returns The authenticated user object
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    throw new Error(`Authentication error: ${error.message}`);
  }
  
  if (!user) {
    throw new Error('User must be authenticated');
  }
  
  return user;
};

/**
 * Centralized Supabase error handler
 * @param error The error object from Supabase
 * @param context Description of what operation failed
 * @throws Formatted error with helpful message
 */
export const handleSupabaseError = (error: any, context: string) => {
  console.error(`${context} error:`, error);
  
  if (error.code === 'PGRST116') {
    throw new Error('Resource not found');
  }
  
  if (error.message) {
    throw new Error(error.message);
  }
  
  throw new Error(`Failed to ${context.toLowerCase()}`);
};
