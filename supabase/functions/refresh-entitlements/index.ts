import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RevenueCatEntitlement {
  expires_date: string | null;
  [key: string]: unknown;
}

interface EntitlementsResponse {
  entitlements: Record<string, RevenueCatEntitlement>;
  active: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Validate authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user from Supabase token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user?.id) {
      console.log('Auth error:', userError?.message || 'No user');
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Refreshing entitlements for user:', user.id);

    // Get RevenueCat REST API key
    const revenueCatApiKey = Deno.env.get('REVENUECAT_REST_API_KEY');
    if (!revenueCatApiKey) {
      console.error('RevenueCat API key not configured');
      return new Response(JSON.stringify({ error: 'RevenueCat not configured' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Call RevenueCat REST API to get subscriber info
    const revenueCatResponse = await fetch(`https://api.revenuecat.com/v1/subscribers/${user.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${revenueCatApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!revenueCatResponse.ok) {
      if (revenueCatResponse.status === 404) {
        // User not found in RevenueCat - not subscribed
        console.log('User not found in RevenueCat');
        return new Response(JSON.stringify({ 
          entitlements: {}, 
          active: false 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const errorText = await revenueCatResponse.text().catch(() => 'Unknown error');
      console.error('RevenueCat API error:', revenueCatResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to check entitlements' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const revenueCatData = await revenueCatResponse.json() as { 
      subscriber?: { 
        entitlements?: Record<string, RevenueCatEntitlement> 
      } 
    };
    console.log('RevenueCat response received for user:', user.id);

    // Extract entitlements and check if premium is active
    const entitlements = revenueCatData.subscriber?.entitlements || {};
    const premiumEntitlement = entitlements.premium || entitlements.premium_annual || entitlements.premium_monthly;
    const isActive = Boolean(premiumEntitlement && 
      (premiumEntitlement.expires_date === null || new Date(premiumEntitlement.expires_date) > new Date()));

    // Update profile with RevenueCat entitlement data
    if (isActive && premiumEntitlement) {
      await supabaseClient
        .from('profiles')
        .upsert({
          user_id: user.id,
          premium_active: true,
          premium_expires_at: premiumEntitlement.expires_date,
          premium_source: 'revenuecat',
          iap_entitlements: entitlements
        });
    } else {
      // Clear premium status if not active
      await supabaseClient
        .from('profiles')
        .upsert({
          user_id: user.id,
          premium_active: false,
          premium_expires_at: null,
          premium_source: null,
          iap_entitlements: entitlements
        });
    }

    console.log('Entitlements refreshed:', { active: isActive, entitlements: Object.keys(entitlements) });

    return new Response(JSON.stringify({ 
      entitlements,
      active: isActive
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error refreshing entitlements:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});