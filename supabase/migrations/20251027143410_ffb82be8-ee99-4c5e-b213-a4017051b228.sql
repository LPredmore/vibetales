-- Enable RLS on stripe_webhook_logs table
-- This table is only accessed by edge functions with service role key
-- But we enable RLS to satisfy security requirements
ALTER TABLE public.stripe_webhook_logs ENABLE ROW LEVEL SECURITY;

-- No policies needed since only service role can access
-- Service role bypasses RLS automatically
COMMENT ON TABLE public.stripe_webhook_logs IS 'Audit trail for Stripe webhook events. RLS enabled but no policies needed - only accessed by edge functions with service role key.';