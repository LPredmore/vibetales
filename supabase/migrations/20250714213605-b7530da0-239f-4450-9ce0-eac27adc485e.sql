-- Reset daily story count for current user as temporary workaround
UPDATE user_limits 
SET daily_stories_used = 0, 
    last_reset_date = CURRENT_DATE 
WHERE last_reset_date = '2025-07-14';