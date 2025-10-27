import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting promo code validation');

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user from the auth header
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // Parse request body
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      console.error('Invalid code provided');
      return new Response(
        JSON.stringify({ error: 'Invalid code format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Validating code:', code);

    // Look up the code in premium_codes table
    const { data: promoCode, error: lookupError } = await supabaseClient
      .from('premium_codes')
      .select('*')
      .eq('influencer_code', code.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (lookupError || !promoCode) {
      console.error('Code lookup error:', lookupError);
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive promo code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Valid code found:', promoCode.influencer_code);

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    console.log('Setting trial expiration to:', expiresAt.toISOString());

    // Update user's profile with influencer code and trial expiration
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        influencer_code: promoCode.influencer_code,
        premium_trial_expires_at: expiresAt.toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to apply promo code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Successfully applied promo code for user:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Promo code applied successfully!',
        expiresAt: expiresAt.toISOString(),
        influencerName: promoCode.influencer_name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
