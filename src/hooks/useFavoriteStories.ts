import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FavoriteStory } from '@/services/favoriteStories';

export const useFavoriteStories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: stories = [], isLoading } = useQuery<FavoriteStory[]>({
    queryKey: ['favoriteStories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('favorite_stories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FavoriteStory[];
    },
    enabled: !!user?.id,
    staleTime: 60000, // Cache for 60 seconds
  });

  const saveMutation = useMutation({
    mutationFn: async (story: { 
      title: string; 
      content: string; 
      reading_level: string; 
      theme: string 
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('favorite_stories')
        .insert({ 
          ...story, 
          user_id: user.id 
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update for instant UI feedback
    onMutate: async (newStory) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['favoriteStories', user?.id] });

      // Snapshot previous value
      const previousStories = queryClient.getQueryData<FavoriteStory[]>(['favoriteStories', user?.id]);

      // Optimistically update
      const optimisticStory: FavoriteStory = {
        id: `temp-${Date.now()}`,
        user_id: user!.id,
        ...newStory,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<FavoriteStory[]>(
        ['favoriteStories', user?.id],
        (old) => [optimisticStory, ...(old || [])]
      );

      return { previousStories };
    },
    onError: (err, newStory, context) => {
      // Rollback on error
      if (context?.previousStories) {
        queryClient.setQueryData(['favoriteStories', user?.id], context.previousStories);
      }
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['favoriteStories', user?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('favorite_stories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    // Optimistic update for instant UI feedback
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['favoriteStories', user?.id] });

      const previousStories = queryClient.getQueryData<FavoriteStory[]>(['favoriteStories', user?.id]);

      // Optimistically remove
      queryClient.setQueryData<FavoriteStory[]>(
        ['favoriteStories', user?.id],
        (old) => (old || []).filter((story) => story.id !== deletedId)
      );

      return { previousStories };
    },
    onError: (err, deletedId, context) => {
      if (context?.previousStories) {
        queryClient.setQueryData(['favoriteStories', user?.id], context.previousStories);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteStories', user?.id] });
    },
  });

  return {
    stories,
    isLoading,
    saveStory: saveMutation.mutate,
    deleteStory: deleteMutation.mutate,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
