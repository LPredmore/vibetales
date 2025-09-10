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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let userEmail = '';
    let userId = '';

    // Handle GET requests first (from SightWordManager)
    if (req.method === 'GET') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      
      if (userError || !user?.email) {
        console.log('Auth error or no user:', userError?.message || 'No user');
        return new Response(
          JSON.stringify({ subscribed: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userEmail = user.email;
      userId = user.id;
      console.log('GET request - checking subscription for user:', userEmail);
    } else if (req.method === 'POST') {
      // Handle POST requests - check if there's a body or use auth header
      const contentLength = req.headers.get('content-length');
      
      if (contentLength && contentLength !== '0') {
        // POST request with body (from generate-story function)
        const body = await req.json();
        userId = body.userId;
        
        if (!userId) {
          throw new Error('No userId provided in POST request');
        }

        // Get user email from Supabase auth using service role
        const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
        
        if (userError || !userData?.user?.email) {
          console.log('Error getting user by ID:', userError?.message || 'No user found');
          return new Response(
            JSON.stringify({ subscribed: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        userEmail = userData.user.email;
        userId = userData.user.id;
        console.log('POST request - checking subscription for user ID:', userId, 'email:', userEmail);
      } else {
        // POST request without body (from Profile page) - use auth header like GET
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
        
        if (userError || !user?.email) {
          console.log('Auth error or no user:', userError?.message || 'No user');
          return new Response(
            JSON.stringify({ subscribed: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        userEmail = user.email;
        userId = user.id;
        console.log('POST request (no body) - checking subscription for user:', userEmail);
      }
    } else {
      throw new Error(`Unsupported method: ${req.method}`);
    }

    // Get the Stripe secret key from environment variables
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('Stripe secret key not found in environment');
      throw new Error('Stripe secret key not configured');
    }

    console.log('Checking subscription for user:', userEmail);

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    // Get customer by email
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (customers.data.length === 0) {
      console.log('No customer found for email:', userEmail);
      return new Response(
        JSON.stringify({ subscribed: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customer = customers.data[0];
    console.log('Found customer:', customer.id, 'for email:', userEmail);

    // Check for all subscriptions (both active and trialing)
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 10,
    });

    console.log('Found total subscriptions:', subscriptions.data.length);
    
    // Log all subscription statuses for debugging
    subscriptions.data.forEach((sub, index) => {
      console.log(`Subscription ${index + 1}:`, {
        id: sub.id,
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      });
    });

    // Check for active or trialing subscriptions (both count as premium)
    const validSubscriptions = subscriptions.data.filter(sub => 
      sub.status === 'active' || sub.status === 'trialing'
    );

    console.log('Found valid subscriptions (active or trialing):', validSubscriptions.length);
    
    // If we have valid subscriptions, user is subscribed
    if (validSubscriptions.length > 0) {
      const subscription = validSubscriptions[0];
      console.log('User has valid subscription with status:', subscription.status);
      return new Response(
        JSON.stringify({ 
          subscribed: true, 
          type: 'subscription',
          status: subscription.status,
          period_end: new Date(subscription.current_period_end * 1000).toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for successful one-time payments (charges)
    const charges = await stripe.charges.list({
      customer: customer.id,
      limit: 20, // Check recent charges
    });

    console.log('Found charges for customer:', charges.data.length);

    // Look for successful premium charges
    const successfulPremiumCharges = charges.data.filter(charge => 
      charge.status === 'succeeded' && 
      charge.paid === true &&
      charge.amount >= 799 // Minimum premium amount (adjust as needed)
    );

    console.log('Found successful premium charges:', successfulPremiumCharges.length);

    if (successfulPremiumCharges.length > 0) {
      const latestCharge = successfulPremiumCharges[0];
      console.log('Latest premium payment:', latestCharge.id, 'amount:', latestCharge.amount, 'date:', new Date(latestCharge.created * 1000));
      
      return new Response(
        JSON.stringify({ 
          subscribed: true, 
          type: 'one_time_payment',
          payment_date: new Date(latestCharge.created * 1000).toISOString(),
          amount: latestCharge.amount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('No active subscription or successful premium payment found');
    return new Response(
      JSON.stringify({ subscribed: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});