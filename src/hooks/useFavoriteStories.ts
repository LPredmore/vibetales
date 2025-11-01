import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFavoriteStories, deleteFavoriteStory, saveFavoriteStory, FavoriteStory } from '@/services/favoriteStories';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useFavoriteStories = () => {
  const { user, isSubscribed } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['favoriteStories', user?.id],
    queryFn: async () => {
      if (!isSubscribed) return [];
      return await getFavoriteStories();
    },
    enabled: !!user && !!isSubscribed,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFavoriteStory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteStories', user?.id] });
      toast.success('Story removed from favorites');
    },
    onError: (error) => {
      console.error('Error deleting favorite:', error);
      toast.error('Failed to remove story');
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({ title, content, readingLevel, theme }: {
      title: string;
      content: string;
      readingLevel: string;
      theme: string;
    }) => saveFavoriteStory(title, content, readingLevel, theme),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteStories', user?.id] });
      toast.success('Story saved to favorites!');
    },
    onError: (error: any) => {
      console.error('Error saving story:', error);
      if (error.message?.includes('duplicate key')) {
        toast.error('This story is already in your favorites');
      } else {
        toast.error('Failed to save story');
      }
    },
  });

  return {
    favorites: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    deleteFavorite: deleteMutation.mutate,
    saveFavorite: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
