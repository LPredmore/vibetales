import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SightWord } from '@/types/sightWords';
import { toast } from 'sonner';

export const useSightWords = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sightWords', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('sight_words')
        .select('words_objects')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.words_objects) {
        // Convert JSONB objects to SightWord objects
        const sightWords: SightWord[] = data.words_objects.map((obj: any) => ({
          word: obj.word,
          active: obj.active
        }));
        return sightWords;
      }

      // Create new record if none exists
      const { error: insertError } = await supabase
        .from('sight_words')
        .insert({ user_id: user.id, words_objects: [] });

      if (insertError) throw insertError;
      return [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: async (words: SightWord[]) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('sight_words')
        .update({ words_objects: words as any })
        .eq('user_id', user.id);

      if (error) throw error;
      return words;
    },
    onSuccess: (words) => {
      queryClient.setQueryData(['sightWords', user?.id], words);
    },
    onError: (error) => {
      console.error('Error updating sight words:', error);
      toast.error('Failed to update sight words');
    },
  });

  return {
    words: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateWords: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};
