import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Stripe webhook received');

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get the signature from headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('❌ No stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'No signature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get the raw request body
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
      );
      console.log('✅ Webhook signature verified:', event.type);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Extract event data
    const eventType = event.type;
    const eventId = event.id;
    let customerEmail: string | null = null;
    let promotionCode: string | null = null;
    let subscriptionId: string | null = null;
    let subscriptionStatus: string | null = null;
    let currentPeriodEnd: Date | null = null;

    console.log('📦 Processing event:', eventType);

    // Handle different event types
    switch (eventType) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        customerEmail = session.customer_email || session.customer_details?.email || null;
        subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

        // Get promotion code if applied
        if (session.total_details?.amount_discount && session.total_details.amount_discount > 0) {
          // Fetch the session with expanded discount data
          try {
            const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
              expand: ['total_details.breakdown.discounts.discount']
            });
            
            const discounts = expandedSession.total_details?.breakdown?.discounts || [];
            if (discounts.length > 0) {
              const discount = discounts[0];
              if (discount.discount && typeof discount.discount === 'object' && 'promotion_code' in discount.discount) {
                const promoCodeId = discount.discount.promotion_code;
                if (typeof promoCodeId === 'string') {
                  const promoCodeObj = await stripe.promotionCodes.retrieve(promoCodeId);
                  promotionCode = promoCodeObj.code;
                  console.log('🎟️ Promotion code applied:', promotionCode);
                }
              }
            }
          } catch (err) {
            console.error('⚠️ Error fetching promotion code:', err.message);
          }
        }

        // If we have a subscription ID, fetch subscription details
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            subscriptionStatus = subscription.status;
            currentPeriodEnd = new Date(subscription.current_period_end * 1000);
            console.log('📅 Subscription expires:', currentPeriodEnd.toISOString());
          } catch (err) {
            console.error('⚠️ Error fetching subscription:', err.message);
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        subscriptionId = subscription.id;
        subscriptionStatus = subscription.status;
        currentPeriodEnd = new Date(subscription.current_period_end * 1000);

        // Get customer email
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        const customer = await stripe.customers.retrieve(customerId);
        if ('email' in customer) {
          customerEmail = customer.email;
        }

        // Check for promotion code in subscription metadata or discounts
        if (subscription.discount?.promotion_code) {
          const promoCodeId = typeof subscription.discount.promotion_code === 'string' 
            ? subscription.discount.promotion_code 
            : subscription.discount.promotion_code.id;
          const promoCodeObj = await stripe.promotionCodes.retrieve(promoCodeId);
          promotionCode = promoCodeObj.code;
          console.log('🎟️ Subscription promotion code:', promotionCode);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        subscriptionId = subscription.id;
        subscriptionStatus = 'canceled';

        // Get customer email
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        const customer = await stripe.customers.retrieve(customerId);
        if ('email' in customer) {
          customerEmail = customer.email;
        }
        break;
      }

      default:
        console.log('ℹ️ Unhandled event type:', eventType);
        return new Response(
          JSON.stringify({ received: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }

    if (!customerEmail) {
      console.error('❌ No customer email found');
      // Log to webhook logs table
      await supabaseClient.from('stripe_webhook_logs').insert({
        event_id: eventId,
        event_type: eventType,
        error: 'No customer email found',
        raw_event: event,
      });

      return new Response(
        JSON.stringify({ error: 'No customer email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('👤 Customer email:', customerEmail);

    // Find user by email in profiles table
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_id, influencer_code')
      .eq('email', customerEmail)
      .single();

    if (profileError || !profile) {
      console.error('❌ Profile not found for email:', customerEmail, profileError);
      // Log to webhook logs table
      await supabaseClient.from('stripe_webhook_logs').insert({
        event_id: eventId,
        event_type: eventType,
        customer_email: customerEmail,
        promotion_code: promotionCode,
        subscription_id: subscriptionId,
        error: 'Profile not found',
        raw_event: event,
      });

      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('✅ Found user profile:', profile.user_id);

    // If promotion code was applied, look up influencer code
    let influencerCode = profile.influencer_code; // Keep existing if no new code
    if (promotionCode) {
      console.log('🔍 Looking up influencer code for promotion:', promotionCode);
      const { data: premiumCode, error: premiumCodeError } = await supabaseClient
        .from('premium_codes')
        .select('influencer_code')
        .eq('influencer_code', promotionCode)
        .eq('is_active', true)
        .single();

      if (!premiumCodeError && premiumCode) {
        influencerCode = premiumCode.influencer_code;
        console.log('✅ Matched influencer code:', influencerCode);
      } else {
        console.log('⚠️ No matching influencer code found for:', promotionCode);
      }
    }

    // Determine premium status
    const isPremiumActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

    // Update user profile
    const updateData: any = {
      premium_active: isPremiumActive,
      premium_source: 'stripe',
    };

    if (currentPeriodEnd) {
      updateData.premium_expires_at = currentPeriodEnd.toISOString();
    }

    if (influencerCode) {
      updateData.influencer_code = influencerCode;
    }

    console.log('📝 Updating profile with:', updateData);

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update(updateData)
      .eq('user_id', profile.user_id);

    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
      // Log to webhook logs table
      await supabaseClient.from('stripe_webhook_logs').insert({
        event_id: eventId,
        event_type: eventType,
        customer_email: customerEmail,
        promotion_code: promotionCode,
        subscription_id: subscriptionId,
        influencer_code: influencerCode,
        error: updateError.message,
        raw_event: event,
      });

      return new Response(
        JSON.stringify({ error: 'Update failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('✅ Profile updated successfully');

    // Log successful processing to webhook logs table
    await supabaseClient.from('stripe_webhook_logs').insert({
      event_id: eventId,
      event_type: eventType,
      customer_email: customerEmail,
      promotion_code: promotionCode,
      subscription_id: subscriptionId,
      influencer_code: influencerCode,
      raw_event: event,
    });

    return new Response(
      JSON.stringify({ success: true, influencer_code: influencerCode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
