import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    logStep("Authorization header found");

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user?.email) {
      logStep("Authentication failed", { error: userError?.message });
      throw new Error('Error getting user');
    }

    logStep('Creating checkout session for user', { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    // Get customer by email with timeout handling
    logStep("Looking up customer by email");
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId = undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
      
      // Check if already subscribed
      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: 'active',
        price: 'price_1QgUGtRFHDig2LCdGMsgjexk',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        logStep("Customer already has active subscription");
        throw new Error('Customer already has an active subscription');
      }
    } else {
      logStep("No existing customer found, will create new one");
    }

    const origin = req.headers.get('origin') || 'http://localhost:5173';
    logStep('Creating checkout session', { origin });

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
      success_url: `${origin}/?success=true`,
      cancel_url: `${origin}/?canceled=true`,
      billing_address_collection: 'auto',
      payment_method_types: ['card'],
      // Add explicit locale to prevent missing module errors
      locale: 'en',
      // Optimize session creation
      allow_promotion_codes: true,
      automatic_tax: { enabled: false },
    });

    logStep('Checkout session created successfully', { 
      sessionId: session.id, 
      url: session.url,
      executionTime: Date.now() 
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in create-checkout', { message: errorMessage, stack: error?.stack });
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});