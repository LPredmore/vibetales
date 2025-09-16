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

    // Check subscription status from multiple sources
    let isSubscribed = false;
    
    // First check Stripe subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      price: 'price_1QgUGtRFHDig2LCdGMsgjexk', // Make sure this matches your Stripe price ID
      limit: 10, // Get more results to check status
    });

    // Filter for active or trialing subscriptions
    const validSubscriptions = subscriptions.data.filter(sub => 
      sub.status === 'active' || sub.status === 'trialing'
    );

    if (validSubscriptions.length > 0) {
      isSubscribed = true;
      console.log('Found valid Stripe subscription:', validSubscriptions[0].status);
    }

    // If no Stripe subscription, check RevenueCat/IAP subscriptions
    if (!isSubscribed) {
      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('premium_active, premium_source, premium_expires_at')
        .eq('user_id', userId)
        .single();

      if (!profileError && profileData?.premium_active) {
        // Check if subscription is still valid (not expired)
        if (profileData.premium_expires_at) {
          const expiresAt = new Date(profileData.premium_expires_at);
          const now = new Date();
          isSubscribed = expiresAt > now;
          
          console.log('Found IAP subscription:', {
            source: profileData.premium_source,
            expires: profileData.premium_expires_at,
            isValid: isSubscribed
          });
        } else {
          isSubscribed = true; // No expiry date means active
        }
      }
    }

    return new Response(
      JSON.stringify({ subscribed: isSubscribed }),
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