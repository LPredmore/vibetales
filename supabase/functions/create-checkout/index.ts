import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user?.email) {
      throw new Error('Error getting user');
    }

    // Get the Stripe secret key from environment variables
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    console.log('Stripe key exists:', !!stripeKey); // Log if key exists without exposing it
    
    if (!stripeKey) {
      console.error('Stripe secret key not found in environment');
      throw new Error('Stripe configuration error');
    }

    console.log('Creating checkout session for user:', user.email);

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId = undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      // Check if customer already has an active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        price: 'price_1QgUGtRFHDig2LCdGMsgjexk',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        throw new Error('Customer already has an active subscription');
      }
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: 'price_1QgUGtRFHDig2LCdGMsgjexk',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/`,
      cancel_url: `${req.headers.get('origin')}/`,
    });

    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-checkout:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});