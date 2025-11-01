import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  const query = useQuery({
    queryKey: ['userLimits', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .rpc('get_or_create_user_limits', { p_user_id: user.id });

      if (error) {
        console.error('Error fetching user limits:', error);
        throw error;
      }

      return data as UserLimits;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });

  const refreshLimits = () => {
    queryClient.invalidateQueries({ queryKey: ['userLimits', user?.id] });
  };

  return {
    limits: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refreshLimits,
  };
};
