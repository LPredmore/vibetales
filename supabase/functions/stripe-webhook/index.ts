import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing signature', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Import Stripe and verify webhook
    const stripe = await import('https://esm.sh/stripe@14.21.0').then(m => m.default(stripeSecretKey));
    
    let event;
    try {
      // Note: You'll need to set up webhook endpoint secret in Stripe
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Invalid signature', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('Stripe webhook received:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const planType = session.metadata?.plan_type;

        if (userId) {
          console.log(`Processing checkout completion for user: ${userId}, plan: ${planType}`);
          
          // Update user profile with premium status
          const { error } = await supabase
            .from('profiles')
            .upsert({
              user_id: userId,
              premium_active: true,
              premium_source: 'stripe',
              premium_expires_at: null, // Stripe subscriptions don't have fixed expiry
              updated_at: new Date().toISOString(),
            });

          if (error) {
            console.error('Failed to update user profile:', error);
          } else {
            console.log(`Successfully activated premium for user ${userId}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        // Note: You may need to store Stripe customer ID in profiles table
        console.log(`Subscription ${event.type} for customer: ${customerId}`);
        
        const isActive = subscription.status === 'active';
        
        // Update user premium status based on subscription
        // This is a simplified approach - you may want more sophisticated handling
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});