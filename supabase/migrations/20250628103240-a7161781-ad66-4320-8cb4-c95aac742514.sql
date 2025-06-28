
-- Create a table to store users' favorite stories
CREATE TABLE public.favorite_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  reading_level TEXT NOT NULL,
  theme TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, title, content) -- Prevent duplicate favorites
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.favorite_stories ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own favorite stories" 
  ON public.favorite_stories 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorite stories" 
  ON public.favorite_stories 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite stories" 
  ON public.favorite_stories 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger to update the updated_at column
CREATE TRIGGER update_favorite_stories_updated_at
  BEFORE UPDATE ON public.favorite_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();
