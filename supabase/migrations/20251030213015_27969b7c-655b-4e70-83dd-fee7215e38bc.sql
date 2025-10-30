-- Fix search_path for increment_daily_stories function for security
CREATE OR REPLACE FUNCTION increment_daily_stories(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_limits 
  SET daily_stories_used = daily_stories_used + 1
  WHERE user_id = user_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User limits not found for user_id: %', user_id_param;
  END IF;
END;
$$;