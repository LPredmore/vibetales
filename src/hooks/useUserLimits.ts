import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserLimits {
  daily_stories_used: number;
  trial_started_at: string;
  trial_used: boolean;
}

export const useUserLimits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: limits, isLoading } = useQuery<UserLimits | null>({
    queryKey: ['userLimits', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .rpc('get_or_create_user_limits', { p_user_id: user.id });

      if (error) {
        console.error('Error fetching user limits:', error);
        if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          console.warn('Authentication issue detected, user may need to re-login');
        }
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
    retry: 1, // Only retry once to avoid excessive calls
  });

  const refreshLimits = () => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['userLimits', user.id] });
    }
  };

  return { limits, isLoading, refreshLimits };
};
