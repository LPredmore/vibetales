import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

console.log('=== NEXUS API TEST FUNCTION STARTING ===');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== NEXUS API TEST REQUEST ===');
  
  const nexusApiKey = Deno.env.get('NEXUSAI_API_KEY');
  if (!nexusApiKey) {
    console.error('NEXUSAI_API_KEY not found');
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('API Key format check:', nexusApiKey.substring(0, 10) + '...');
  console.log('API Key length:', nexusApiKey.length);
  console.log('API Key starts with ai_:', nexusApiKey.startsWith('ai_'));

  // Use the exact format from the NexusAI chatbot example
  const testRequestBody = {
    "query": "Create a simple children's story about a cat",
    "search_type": "structured_data",
    "response_schema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "content": { "type": "string" }
      },
      "required": ["title", "content"]
    },
    "include_web_context": false
  };

  const requestId = `test-${Date.now()}`;
  console.log('Request ID:', requestId);
  console.log('Request body:', JSON.stringify(testRequestBody, null, 2));

  try {
    console.log('=== MAKING TEST REQUEST ===');
    console.log('URL: https://nexus-ai-f957769a.base44.app/ApiSearch');
    console.log('Method: POST');
    console.log('Headers: Content-Type: application/json, Authorization: Bearer [API_KEY]');

    const startTime = Date.now();
    
    const response = await fetch('https://nexus-ai-f957769a.base44.app/ApiSearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nexusApiKey}`,
        'X-Request-ID': requestId,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify(testRequestBody),
    });

    const endTime = Date.now();
    console.log(`Request completed in ${endTime - startTime}ms`);

    console.log('=== RESPONSE DETAILS ===');
    console.log('Status:', response.status);
    console.log('Status text:', response.statusText);
    console.log('Response URL:', response.url);
    console.log('Response type:', response.type);

    // Log all response headers
    console.log('=== ALL RESPONSE HEADERS ===');
    for (const [key, value] of response.headers.entries()) {
      console.log(`${key}: ${value}`);
    }

    const responseText = await response.text();
    console.log('Raw response body:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('Parsed response data:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      responseData = { raw_response: responseText };
    }

    if (!response.ok) {
      console.error('=== REQUEST FAILED ===');
      console.error('Status:', response.status);
      console.error('Response:', responseData);
      
      return new Response(JSON.stringify({
        error: 'API request failed',
        status: response.status,
        statusText: response.statusText,
        response: responseData,
        requestId
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== SUCCESS ===');
    return new Response(JSON.stringify({
      success: true,
      data: responseData,
      requestId,
      responseTime: endTime - startTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== NETWORK ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    return new Response(JSON.stringify({
      error: 'Network error',
      message: error.message,
      type: error.constructor.name,
      requestId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});