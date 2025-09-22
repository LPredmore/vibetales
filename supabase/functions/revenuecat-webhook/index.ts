import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    const payload = await req.json();
    console.log('RevenueCat webhook received:', payload);

    const { event } = payload;
    
    if (!event || !event.app_user_id || !event.event_timestamp_ms) {
      console.warn('Invalid webhook payload structure');
      return new Response('Invalid payload', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const appUserId = event.app_user_id;
    const eventType = event.type;
    
    console.log(`Processing RevenueCat event: ${eventType} for user: ${appUserId}`);

    // Fetch the latest customer info from RevenueCat
    // This ensures we have the most up-to-date entitlement information
    await syncCustomerEntitlements(appUserId);

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing RevenueCat webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function syncCustomerEntitlements(appUserId: string) {
  try {
    // Get RevenueCat REST API key for backend API calls
    const revenueCatApiKey = Deno.env.get('REVENUECAT_REST_API_KEY');
    
    if (!revenueCatApiKey) {
      console.error('RevenueCat API key not found');
      return;
    }

    // Fetch subscriber info from RevenueCat
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${appUserId}`, {
      headers: {
        'Authorization': `Bearer ${revenueCatApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch subscriber info from RevenueCat:', response.status);
      return;
    }

    const subscriberData = await response.json();
    const { subscriber } = subscriberData;
    
    // Extract entitlements - check for premium, premium_annual, and premium_monthly
    const entitlements = subscriber.entitlements || {};
    const premiumEntitlement = entitlements.premium || 
                              entitlements.premium_annual || 
                              entitlements.premium_monthly;
    
    // Check if premium is active - null expires_date means lifetime, otherwise check if not expired
    let premiumActive = false;
    if (premiumEntitlement) {
      if (premiumEntitlement.expires_date === null) {
        // Lifetime access
        premiumActive = true;
      } else {
        // Check if not expired
        const expiresDate = new Date(premiumEntitlement.expires_date);
        premiumActive = expiresDate > new Date();
      }
    }
    
    const expiresAt = premiumEntitlement?.expires_date 
      ? new Date(premiumEntitlement.expires_date).toISOString() 
      : null;
    
    // Determine platform from subscriber info
    const originalTransactionId = subscriber.original_transaction_id;
    const platform = subscriber.original_app_user_id?.includes('ios') ? 'ios' : 'android';

    console.log(`Updating user ${appUserId}: premium=${premiumActive}, platform=${platform}`);

    // Update user profile with latest entitlement information
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        premium_active: premiumActive,
        premium_source: premiumActive ? (platform === 'ios' ? 'apple' : 'google') : null,
        premium_expires_at: expiresAt,
        iap_platform: platform,
        iap_original_transaction_id: originalTransactionId,
        iap_entitlements: entitlements,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', appUserId);

    if (updateError) {
      console.error('Failed to update user profile:', updateError);
    } else {
      console.log(`Successfully updated entitlements for user ${appUserId}`);
    }
  } catch (error) {
    console.error('Error syncing customer entitlements:', error);
  }
}