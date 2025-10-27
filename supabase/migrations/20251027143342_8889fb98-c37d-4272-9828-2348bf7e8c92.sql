-- Create stripe_webhook_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.stripe_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  customer_email text,
  promotion_code text,
  subscription_id text,
  influencer_code text,
  processed_at timestamp with time zone DEFAULT now(),
  error text,
  raw_event jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.stripe_webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_customer_email ON public.stripe_webhook_logs(customer_email);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON public.stripe_webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON public.stripe_webhook_logs(processed_at DESC);

-- No RLS needed - only accessed by edge functions with service role key
COMMENT ON TABLE public.stripe_webhook_logs IS 'Audit trail for all Stripe webhook events. Used for debugging and tracking influencer code attribution.';