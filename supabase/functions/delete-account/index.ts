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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication error:', authError);
      throw new Error('Unauthorized');
    }

    const userId = user.id;
    console.log(`🗑️ Starting account deletion for user: ${userId}`);

    // Delete all user data in order (manual cleanup for tables without CASCADE)
    
    // 1. Delete content reports
    const { error: reportsError } = await supabase
      .from('content_reports')
      .delete()
      .eq('user_id', userId);
    
    if (reportsError) {
      console.error('Error deleting content reports:', reportsError);
      throw new Error('Failed to delete content reports');
    }
    console.log('✅ Deleted content reports');

    // 2. Delete favorite stories
    const { error: favoritesError } = await supabase
      .from('favorite_stories')
      .delete()
      .eq('user_id', userId);
    
    if (favoritesError) {
      console.error('Error deleting favorite stories:', favoritesError);
      throw new Error('Failed to delete favorite stories');
    }
    console.log('✅ Deleted favorite stories');

    // 3. Delete sight words
    const { error: sightWordsError } = await supabase
      .from('sight_words')
      .delete()
      .eq('user_id', userId);
    
    if (sightWordsError) {
      console.error('Error deleting sight words:', sightWordsError);
      throw new Error('Failed to delete sight words');
    }
    console.log('✅ Deleted sight words');

    // 4. Delete generated stories
    const { error: storiesError } = await supabase
      .from('stories')
      .delete()
      .eq('user_id', userId);
    
    if (storiesError) {
      console.error('Error deleting stories:', storiesError);
      throw new Error('Failed to delete stories');
    }
    console.log('✅ Deleted stories');

    // 5. Delete user limits
    const { error: limitsError } = await supabase
      .from('user_limits')
      .delete()
      .eq('user_id', userId);
    
    if (limitsError) {
      console.error('Error deleting user limits:', limitsError);
      throw new Error('Failed to delete user limits');
    }
    console.log('✅ Deleted user limits');

    // 6. Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    
    if (profileError) {
      console.error('Error deleting profile:', profileError);
      throw new Error('Failed to delete profile');
    }
    console.log('✅ Deleted profile');

    // 7. Delete the auth user (this is the final step)
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      throw new Error('Failed to delete auth account');
    }
    console.log('✅ Deleted auth account');

    console.log(`🎉 Account deletion completed successfully for user: ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account deleted successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Account deletion error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
