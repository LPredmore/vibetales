-- Create a table to track user usage limits and trial status
CREATE TABLE public.user_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  daily_stories_used INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  trial_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own limits" 
ON public.user_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own limits" 
ON public.user_limits 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own limits" 
ON public.user_limits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_limits_updated_at
BEFORE UPDATE ON public.user_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();

-- Create function to get or create user limits
CREATE OR REPLACE FUNCTION public.get_or_create_user_limits(p_user_id UUID)
RETURNS public.user_limits
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_limit_record public.user_limits;
BEGIN
  -- Try to get existing record
  SELECT * INTO user_limit_record 
  FROM public.user_limits 
  WHERE user_id = p_user_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_limits (user_id, trial_used)
    VALUES (p_user_id, false)
    RETURNING * INTO user_limit_record;
  END IF;
  
  RETURN user_limit_record;
END;
$$;