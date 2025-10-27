-- Create premium_codes table for influencer coupon codes
CREATE TABLE public.premium_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id text NOT NULL UNIQUE,
  influencer_name text NOT NULL,
  influencer_email text NOT NULL,
  influencer_code text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true NOT NULL
);

-- Enable RLS
ALTER TABLE public.premium_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read active codes (needed for validation)
CREATE POLICY "Active codes are readable by authenticated users"
ON public.premium_codes FOR SELECT
TO authenticated
USING (is_active = true);

-- Index for faster lookups
CREATE INDEX idx_premium_codes_influencer_code ON public.premium_codes(influencer_code);

-- Add influencer_code and trial expiration columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN influencer_code text,
ADD COLUMN premium_trial_expires_at timestamp with time zone;

-- Index for analytics
CREATE INDEX idx_profiles_influencer_code ON public.profiles(influencer_code) WHERE influencer_code IS NOT NULL;