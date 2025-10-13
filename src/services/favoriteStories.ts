
import { supabase } from "@/integrations/supabase/client";

export interface FavoriteStory {
  id: string;
  user_id: string;
  title: string;
  content: string;
  reading_level: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

export const saveFavoriteStory = async (
  title: string,
  content: string,
  readingLevel: string,
  theme: string
) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { data, error } = await supabase
    .from("favorite_stories")
    .insert({
      user_id: user.id,
      title,
      content,
      reading_level: readingLevel,
      theme
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const getFavoriteStories = async (): Promise<FavoriteStory[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { data, error } = await supabase
    .from("favorite_stories")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

export const deleteFavoriteStory = async (id: string) => {
  const { error } = await supabase
    .from("favorite_stories")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
};
