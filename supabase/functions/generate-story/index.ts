import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('=== EDGE FUNCTION MODULE LOADING ===');

serve(async (req) => {
  try {
    console.log('=== EDGE FUNCTION REQUEST RECEIVED ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log('Handling CORS preflight request');
      return new Response(null, { headers: corsHeaders });
    }

    // Test environment variable access
    console.log('=== TESTING ENVIRONMENT VARIABLES ===');
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    console.log('OPENROUTER_API_KEY exists:', !!openRouterApiKey);
    console.log('OPENROUTER_API_KEY length:', openRouterApiKey?.length || 0);
    
    if (!openRouterApiKey) {
      console.error('OPENROUTER_API_KEY not found');
      return new Response(JSON.stringify({ 
        error: 'OPENROUTER_API_KEY not configured',
        debug: 'Environment variable not found'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test JSON parsing
    console.log('=== TESTING REQUEST BODY PARSING ===');
    let requestData;
    try {
      requestData = await req.json();
      console.log('Request data parsed successfully:', Object.keys(requestData));
    } catch (parseError) {
      console.error('Failed to parse request JSON:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        debug: parseError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For now, return a simple success response
    console.log('=== RETURNING SUCCESS RESPONSE ===');
    return new Response(JSON.stringify({ 
      title: "Test Story",
      content: "This is a test story to verify the edge function is working properly. The cat sat on the mat. The end.",
      debug: {
        hasApiKey: !!openRouterApiKey,
        requestDataKeys: Object.keys(requestData),
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== EDGE FUNCTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Edge function failed',
      debug: {
        errorType: error.constructor.name,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});