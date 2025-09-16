-- Add IAP tracking fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iap_platform TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iap_original_transaction_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iap_entitlements JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_active BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_source TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

-- Add index for faster premium status queries
CREATE INDEX IF NOT EXISTS idx_profiles_premium_active ON public.profiles (premium_active);
CREATE INDEX IF NOT EXISTS idx_profiles_premium_source ON public.profiles (premium_source);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.iap_platform IS 'Platform for in-app purchases: ios, android, or web';
COMMENT ON COLUMN public.profiles.iap_original_transaction_id IS 'Original transaction ID from App Store/Play Store for support';
COMMENT ON COLUMN public.profiles.iap_entitlements IS 'Latest entitlement snapshot from RevenueCat';
COMMENT ON COLUMN public.profiles.premium_active IS 'Whether user has active premium subscription';
COMMENT ON COLUMN public.profiles.premium_source IS 'Source of premium subscription: stripe, apple, google';
COMMENT ON COLUMN public.profiles.premium_expires_at IS 'When premium subscription expires';