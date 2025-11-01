-- Add the always_unlim column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN always_unlim BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster lookups
CREATE INDEX idx_profiles_always_unlim ON public.profiles(always_unlim) 
WHERE always_unlim = true;

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a new granular update policy that excludes always_unlim
CREATE POLICY "Users can update their own profile except always_unlim" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND always_unlim = (SELECT always_unlim FROM public.profiles WHERE user_id = auth.uid())
);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.always_unlim IS 
'Grants permanent unlimited access. Can only be modified by service role. Users attempting to change this field will have their update rejected.';