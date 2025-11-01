-- Create function to atomically increment daily_stories_used counter
CREATE OR REPLACE FUNCTION increment_daily_stories(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_limits 
  SET daily_stories_used = daily_stories_used + 1
  WHERE user_id = user_id_param;
  
  -- If no row was updated, the user_limits record doesn't exist yet
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User limits not found for user_id: %', user_id_param;
  END IF;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION increment_daily_stories IS 
'Atomically increments the daily_stories_used counter for a user. Called after successful story generation.';