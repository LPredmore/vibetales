import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    const userId = user.id;
    console.log(`Starting account deletion for user: ${userId}`);

    // Step 0: Get user email before we delete the profile
    const { data: profileData, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .single();
    
    const userEmail = profileData?.email || user.email;
    console.log(`User email for Stripe cancellation: ${userEmail}`);

    // Step 0.5: Cancel any Stripe subscriptions
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (stripeKey && userEmail) {
      try {
        console.log('Initializing Stripe to cancel subscriptions...');
        const stripe = new Stripe(stripeKey, {
          apiVersion: '2023-10-16',
        });

        // Find Stripe customer by email
        const customers = await stripe.customers.list({
          email: userEmail,
          limit: 1,
        });

        if (customers.data.length > 0) {
          const customerId = customers.data[0].id;
          console.log(`Found Stripe customer: ${customerId}`);

          // Get all subscriptions for this customer
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 100,
          });

          // Cancel each active or trialing subscription immediately
          let cancelledCount = 0;
          for (const subscription of subscriptions.data) {
            if (subscription.status === 'active' || subscription.status === 'trialing') {
              await stripe.subscriptions.cancel(subscription.id);
              console.log(`Cancelled subscription: ${subscription.id}`);
              cancelledCount++;
            }
          }

          if (cancelledCount > 0) {
            console.log(`Successfully cancelled ${cancelledCount} subscription(s)`);
          } else {
            console.log('No active subscriptions found to cancel');
          }
        } else {
          console.log('No Stripe customer found for email:', userEmail);
        }
      } catch (stripeError) {
        // Log the error but don't fail the account deletion
        console.error('Error cancelling Stripe subscriptions:', stripeError);
        console.log('Continuing with account deletion despite Stripe error...');
      }
    } else {
      console.log('Stripe not configured or no email found, skipping subscription cancellation');
    }

    // Delete all user data in correct order to avoid foreign key violations
    
    // 1. Delete content reports
    const { error: reportsError } = await supabaseAdmin
      .from('content_reports')
      .delete()
      .eq('user_id', userId);
    
    if (reportsError) {
      console.error('Error deleting content reports:', reportsError);
    } else {
      console.log('Deleted content reports');
    }

    // 2. Delete favorite stories
    const { error: favoritesError } = await supabaseAdmin
      .from('favorite_stories')
      .delete()
      .eq('user_id', userId);
    
    if (favoritesError) {
      console.error('Error deleting favorite stories:', favoritesError);
    } else {
      console.log('Deleted favorite stories');
    }

    // 3. Delete sight words
    const { error: sightWordsError } = await supabaseAdmin
      .from('sight_words')
      .delete()
      .eq('user_id', userId);
    
    if (sightWordsError) {
      console.error('Error deleting sight words:', sightWordsError);
    } else {
      console.log('Deleted sight words');
    }

    // 4. Delete stories
    const { error: storiesError } = await supabaseAdmin
      .from('stories')
      .delete()
      .eq('user_id', userId);
    
    if (storiesError) {
      console.error('Error deleting stories:', storiesError);
    } else {
      console.log('Deleted stories');
    }

    // 5. Delete user limits
    const { error: limitsError } = await supabaseAdmin
      .from('user_limits')
      .delete()
      .eq('user_id', userId);
    
    if (limitsError) {
      console.error('Error deleting user limits:', limitsError);
    } else {
      console.log('Deleted user limits');
    }

    // 6. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    
    if (profileError) {
      console.error('Error deleting profile:', profileError);
    } else {
      console.log('Deleted profile');
    }

    // 7. Delete the auth user (this will cascade to any remaining data)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      throw new Error('Failed to delete user account');
    }

    console.log(`Successfully deleted account for user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while deleting the account' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
