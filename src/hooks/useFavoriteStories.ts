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
    onSuccess: () => {
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
    onSuccess: () => {
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
