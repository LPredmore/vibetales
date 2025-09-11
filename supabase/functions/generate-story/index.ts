// === STARTUP LOGGING ===
console.log('=== EDGE FUNCTION STARTING ===');
console.log('Function initialization beginning...');

try {
  console.log('Loading imports...');
  import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
  import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
  console.log('Imports loaded successfully');
} catch (importError) {
  console.error('=== IMPORT ERROR ===');
  console.error('Failed to import dependencies:', importError);
  throw importError;
}

console.log('Checking environment variables...');
const nexusApiKey = Deno.env.get('NEXUSAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

console.log('Environment check:');
console.log('- NEXUSAI_API_KEY present:', !!nexusApiKey);
console.log('- NEXUSAI_API_KEY format check:', nexusApiKey ? `${nexusApiKey.substring(0, 10)}...` : 'MISSING');
console.log('- SUPABASE_URL present:', !!supabaseUrl);
console.log('- SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

console.log('CORS headers configured');

interface StoryRequest {
  readingLevel: "k" | "1" | "2" | "3" | "4" | "5" | "teen";
  interestLevel: "elementary" | "middle-grade" | "young-adult";
  theme: "fantasy" | "mystery" | "fairytale" | "science" | "nature" | string;
  language: string;
  themeLesson?: string;
  hasThemeLesson: boolean;
  length: "short" | "medium" | "long";
  isDrSeussStyle: boolean;
  useSightWords: boolean;
  keywords: string[];
}

interface StoryResponse {
  title: string;
  content: string;
}

// Reading level guidelines
const READING_LEVELS = {
  "k": { words: "50-100", sentenceLength: "3-5" },
  "1": { words: "100-200", sentenceLength: "5-7" },
  "2": { words: "200-300", sentenceLength: "7-10" },
  "3": { words: "300-400", sentenceLength: "8-12" },
  "4": { words: "400-500", sentenceLength: "10-14" },
  "5": { words: "500-600", sentenceLength: "12-15" },
  "teen": { words: "800-1000", sentenceLength: "15-20" }
};

function buildSystemPrompt(params: StoryRequest): string {
  const level = READING_LEVELS[params.readingLevel];
  const sightWordsText = params.useSightWords && params.keywords.length > 0 
    ? `You must naturally incorporate these sight words: ${params.keywords.join(', ')}. ` 
    : '';
  
  const drSeussStyle = params.isDrSeussStyle 
    ? "Write in Dr. Seuss style with rhyming, repetitive patterns, and playful language. " 
    : '';

  // Get target word count for the story length
  const wordCountTarget = getWordCountTarget(params.length, level.words);

  // Language instruction
  const languageInstruction = params.language !== 'english' 
    ? `Write the story in ${params.language}. ` 
    : '';

  return `You are a children's story writer. Create an engaging, age-appropriate story with the following requirements:

READING LEVEL: ${params.readingLevel.toUpperCase()} Grade
- Target word count: ${wordCountTarget} words (this is important - aim for this exact range)
- Sentence length: ${level.sentenceLength} words per sentence
- Use vocabulary appropriate for ${params.readingLevel} grade level

STORY REQUIREMENTS:
- ${languageInstruction}Genre: ${params.theme}
${params.hasThemeLesson && params.themeLesson ? `- Theme/Lesson focus: ${params.themeLesson}` : ''}
- Interest level: ${params.interestLevel}
- Length: ${params.length}
- ${drSeussStyle}${sightWordsText}

CONTENT GUIDELINES:
- Ensure content is completely safe and appropriate for children
- Include positive messages and educational value
- Create engaging characters and scenarios
- Use descriptive but simple language
- Include a clear beginning, middle, and end
- Add dialogue to make the story interactive
- Stop writing when you reach the target word count
- Do NOT include word count, metadata, or any additional text at the end

IMPORTANT: Write ONLY the story content. Do not include any JSON formatting, markdown, word counts, or extra text. Just write the story directly.`;
}

function getWordCountTarget(length: string, baseWords: string): string {
  const lengthMultipliers = {
    "short": 0.7,
    "medium": 1.0,
    "long": 1.3
  };
  
  const multiplier = lengthMultipliers[length as keyof typeof lengthMultipliers] || 1.0;
  const [min, max] = baseWords.split('-').map(n => parseInt(n));
  const targetMin = Math.round(min * multiplier);
  const targetMax = Math.round(max * multiplier);
  
  return `${targetMin}-${targetMax}`;
}

function getTokenLimit(length: string): number {
  const tokenLimits = {
    "short": 300,
    "medium": 500,
    "long": 800
  };
  
  return tokenLimits[length as keyof typeof tokenLimits] || 500;
}

// Get current date in CST timezone
function getCSTDate(): string {
  const now = new Date();
  const cstOffset = -6; // CST is UTC-6
  const cstTime = new Date(now.getTime() + (cstOffset * 60 * 60 * 1000));
  return cstTime.toISOString().split('T')[0];
}

// Check if user has premium subscription
async function checkSubscription(userId: string): Promise<boolean> {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    console.log('No Stripe key found, assuming non-premium');
    return false;
  }

  try {
    const response = await fetch('https://hyiyuhjabjnksjbqfwmn.supabase.co/functions/v1/check-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      console.log('Subscription check failed, assuming non-premium');
      return false;
    }

    const data = await response.json();
    console.log('Subscription check response:', data);
    return data.subscribed || false;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

// Check and update user limits
async function checkUserLimits(supabase: any, userId: string, storyParams: StoryRequest): Promise<{ canGenerate: boolean; error?: string }> {
  const currentDate = getCSTDate();
  
  // Get or create user limits
  const { data: userLimits, error: limitsError } = await supabase
    .rpc('get_or_create_user_limits', { p_user_id: userId });

  if (limitsError) {
    console.error('Error getting user limits:', limitsError);
    throw new Error('Failed to check user limits');
  }

  const limits = userLimits;


  // Check if user has premium subscription
  const hasPremium = await checkSubscription(userId);
  
  if (hasPremium) {
    console.log('User has premium subscription - unlimited regular stories');
    return { canGenerate: true };
  }

  // Reset daily counter if it's a new day
  if (limits.last_reset_date !== currentDate) {
    await supabase
      .from('user_limits')
      .update({ 
        daily_stories_used: 0, 
        last_reset_date: currentDate 
      })
      .eq('user_id', userId);
    
    limits.daily_stories_used = 0;
  }

  // Check daily limit for free users (1 story per day)
  if (limits.daily_stories_used >= 1) {
    return { 
      canGenerate: false, 
      error: 'Daily story limit reached. Upgrade to premium for unlimited stories or wait until tomorrow.'
    };
  }

  // User can generate, increment counter
  await supabase
    .from('user_limits')
    .update({ daily_stories_used: limits.daily_stories_used + 1 })
    .eq('user_id', userId);

  return { canGenerate: true };
}

async function generateStory(params: StoryRequest): Promise<StoryResponse> {
  const apiKey = Deno.env.get('NEXUSAI_API_KEY');
  if (!apiKey) {
    throw new Error('NEXUSAI_API_KEY environment variable not set');
  }

  console.log('=== GENERATING STORY WITH NEXUSAI API ===');
  console.log('Parameters:', {
    readingLevel: params.readingLevel,
    interestLevel: params.interestLevel,
    theme: params.theme,
    length: params.length,
    isDrSeussStyle: params.isDrSeussStyle,
    useSightWords: params.useSightWords,
    keywordCount: params.keywords.length
  });

  // Build comprehensive query for NexusAI
  const level = READING_LEVELS[params.readingLevel];
  const wordCountTarget = getWordCountTarget(params.length, level.words);
  
  const sightWordsText = params.useSightWords && params.keywords.length > 0 
    ? ` Please naturally incorporate these sight words: ${params.keywords.join(', ')}.` 
    : '';
  
  const drSeussStyle = params.isDrSeussStyle 
    ? " Write in Dr. Seuss style with rhyming, repetitive patterns, and playful language." 
    : '';

  const languageInstruction = params.language !== 'english' 
    ? ` Write the story in ${params.language}.` 
    : '';

  const themeLesson = params.hasThemeLesson && params.themeLesson 
    ? ` Focus on the theme/lesson: ${params.themeLesson}.` 
    : '';

  const query = `Create an engaging, age-appropriate children's story with these specifications: 
- Reading Level: ${params.readingLevel.toUpperCase()} Grade
- Target word count: ${wordCountTarget} words (aim for this exact range)
- Sentence length: ${level.sentenceLength} words per sentence
- Genre: ${params.theme}
- Interest level: ${params.interestLevel}
- Length: ${params.length}${languageInstruction}${themeLesson}${drSeussStyle}${sightWordsText}

The story should include positive messages, engaging characters, descriptive but simple language, clear beginning-middle-end structure, and dialogue. Ensure content is completely safe and appropriate for children with educational value. Provide the response as a JSON object with "title" and "content" fields.`;

  // Define JSON schema for structured response
  const responseSchema = {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "An engaging title for the children's story"
      },
      content: {
        type: "string", 
        description: "The complete story content"
      }
    },
    required: ["title", "content"]
  };

  const requestBody = {
    query: query,
    search_type: "structured_data",
    response_schema: responseSchema,
    include_web_context: false
  };

  console.log('=== CALLING NEXUSAI API ===');
  
  // Log API key validation (first 10 chars only for security)
  console.log(`API Key format check: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING'}`);
  console.log(`API Key starts with 'ai_': ${apiKey?.startsWith('ai_')}`);
  console.log(`API Key length: ${apiKey?.length || 0}`);
  
  // Log complete request details (without exposing API key)
  console.log('=== REQUEST DETAILS ===');
  console.log('URL:', 'https://nexus-ai-f957769a.base44.app/ApiSearch');
  console.log('Method:', 'POST');
  console.log('Headers (without auth):', {
    'Content-Type': 'application/json'
  });
  console.log('Request body structure:', {
    query_length: requestBody.query.length,
    search_type: requestBody.search_type,
    include_web_context: requestBody.include_web_context,
    has_response_schema: !!requestBody.response_schema,
    schema_keys: requestBody.response_schema ? Object.keys(requestBody.response_schema) : null
  });
  console.log('Query preview:', requestBody.query.substring(0, 200) + '...');
  console.log('Full response schema:', JSON.stringify(requestBody.response_schema, null, 2));
  
  let response;
  try {
    console.log('=== MAKING FETCH REQUEST ===');
    const startTime = Date.now();
    
    response = await fetch('https://nexus-ai-f957769a.base44.app/ApiSearch', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const endTime = Date.now();
    console.log(`=== FETCH COMPLETED in ${endTime - startTime}ms ===`);
    
  } catch (fetchError) {
    console.error('=== FETCH FAILED ===');
    console.error('Fetch error type:', fetchError.constructor.name);
    console.error('Fetch error message:', fetchError.message);
    console.error('Fetch error stack:', fetchError.stack);
    console.error('Fetch error details:', JSON.stringify(fetchError, Object.getOwnPropertyNames(fetchError)));
    throw new Error(`Network error calling NexusAI API: ${fetchError.message}`);
  }

  console.log('=== RESPONSE RECEIVED ===');
  console.log('Response status:', response.status);
  console.log('Response status text:', response.statusText);
  console.log('Response ok:', response.ok);
  console.log('Response type:', response.type);
  console.log('Response url:', response.url);
  
  // Log NexusAI rate-limit headers
  const rateLimitHeaders = {
    limit: response.headers.get('X-RateLimit-Limit'),
    remaining: response.headers.get('X-RateLimit-Remaining'),
    reset: response.headers.get('X-RateLimit-Reset'),
    retryAfter: response.headers.get('retry-after')
  };
  console.log('NexusAI rate-limit headers:', rateLimitHeaders);

  // Log all response headers for debugging
  console.log('=== ALL RESPONSE HEADERS ===');
  for (const [key, value] of response.headers.entries()) {
    console.log(`${key}: ${value}`);
  }

  if (!response.ok) {
    console.error('=== RESPONSE NOT OK ===');
    console.error('Status:', response.status);
    console.error('Status text:', response.statusText);
    
    let errorText;
    try {
      errorText = await response.text();
      console.error('Raw error response body:', errorText);
    } catch (textError) {
      console.error('Failed to read error response text:', textError);
      errorText = 'Failed to read response';
    }
    
    // Parse error response if available
    let errorData;
    try {
      errorData = JSON.parse(errorText);
      console.error('Parsed error data:', JSON.stringify(errorData, null, 2));
    } catch (parseError) {
      console.error('Failed to parse error response as JSON:', parseError);
      errorData = { detail: errorText };
    }
    
    console.error('=== DETAILED ERROR ANALYSIS ===');
    console.error('Error data keys:', errorData ? Object.keys(errorData) : 'none');
    console.error('Error detail field:', errorData?.detail);
    console.error('Error message field:', errorData?.message);
    console.error('Full error object:', errorData);
    
    // Enhanced error message with rate-limit info for 429 errors
    if (response.status === 429) {
      const rateLimitInfo = `Rate limit info: ${JSON.stringify(rateLimitHeaders)}`;
      console.error('=== RATE LIMIT ERROR ===');
      console.error(rateLimitInfo);
      throw new Error(`NexusAI API rate limit exceeded (${response.status}): ${errorData.detail || errorText}. ${rateLimitInfo}`);
    }
    
    // Handle authentication errors
    if (response.status === 401) {
      console.error('=== AUTHENTICATION ERROR ===');
      console.error('This indicates the API key is invalid or malformed');
      throw new Error(`Invalid NexusAI API key - Status: ${response.status}, Response: ${errorText}`);
    }
    
    if (response.status === 403) {
      console.error('=== PERMISSION ERROR ===');
      console.error('This indicates the API key lacks permission for structured_data search');
      throw new Error(`NexusAI API key lacks permission for structured_data search - Status: ${response.status}, Response: ${errorText}`);
    }
    
    if (response.status === 405) {
      console.error('=== METHOD NOT ALLOWED ERROR ===');
      console.error('This indicates wrong HTTP method or incorrect endpoint');
      throw new Error(`NexusAI API endpoint error - Method Not Allowed - Status: ${response.status}, Response: ${errorText}`);
    }
    
    if (response.status === 400) {
      console.error('=== BAD REQUEST ERROR ===');
      console.error('This indicates malformed request body or missing parameters');
      throw new Error(`NexusAI API bad request - Status: ${response.status}, Response: ${errorText}`);
    }
    
    if (response.status >= 500) {
      console.error('=== SERVER ERROR ===');
      console.error('This indicates an internal server error on NexusAI side');
      throw new Error(`NexusAI API server error - Status: ${response.status}, Response: ${errorText}`);
    }
    
    console.error('=== UNKNOWN ERROR STATUS ===');
    throw new Error(`NexusAI API error - Status: ${response.status}, Response: ${errorText}, Parsed: ${JSON.stringify(errorData)}`);
  }

  console.log('=== PARSING SUCCESSFUL RESPONSE ===');
  
  let data;
  try {
    const responseText = await response.text();
    console.log('Raw response text length:', responseText.length);
    console.log('Raw response text preview:', responseText.substring(0, 500) + '...');
    
    data = JSON.parse(responseText);
    console.log('Successfully parsed JSON response');
  } catch (parseError) {
    console.error('=== JSON PARSE ERROR ===');
    console.error('Failed to parse response as JSON:', parseError);
    console.error('Parse error message:', parseError.message);
    throw new Error(`Failed to parse NexusAI response as JSON: ${parseError.message}`);
  }
  
  console.log('=== RESPONSE DATA ANALYSIS ===');
  console.log('Response data type:', typeof data);
  console.log('Response data keys:', data ? Object.keys(data) : 'null/undefined');
  console.log('Full response structure:', JSON.stringify(data, null, 2));
  
  console.log('=== RESPONSE FIELD VALIDATION ===');
  console.log('Has status field:', 'status' in data);
  console.log('Status value:', data.status);
  console.log('Has data field:', 'data' in data);
  console.log('Data field type:', typeof data.data);
  console.log('Has processing_time_ms:', 'processing_time_ms' in data);
  console.log('Processing time:', data.processing_time_ms);
  console.log('Has request_id:', 'request_id' in data);
  console.log('Request ID:', data.request_id);
  
  if (data.status !== 'success') {
    console.error('=== UNSUCCESSFUL RESPONSE STATUS ===');
    console.error('Expected: success, Got:', data.status);
    console.error('Full response for debugging:', JSON.stringify(data, null, 2));
    throw new Error(`NexusAI API returned error status: ${data.status}. Full response: ${JSON.stringify(data)}`);
  }
  
  if (!data.data) {
    throw new Error('No response data from NexusAI');
  }

  console.log('=== PARSING NEXUSAI STORY RESPONSE ===');
  
  let storyData;
  try {
    // Parse the structured data response
    if (typeof data.data === 'string') {
      storyData = JSON.parse(data.data);
    } else {
      storyData = data.data;
    }
    
    if (!storyData.title || !storyData.content) {
      throw new Error('Invalid story structure - missing title or content');
    }
    
    console.log('Successfully parsed NexusAI structured response');
    return {
      title: storyData.title,
      content: storyData.content
    };
    
  } catch (parseError) {
    console.error('Error parsing NexusAI response:', parseError);
    
    // Fallback: treat data as plain text and generate title
    const plainContent = typeof data.data === 'string' ? data.data : JSON.stringify(data.data);
    const titlePrefix = params.isDrSeussStyle ? "A Whimsical" : "A";
    const themeCapitalized = params.theme.charAt(0).toUpperCase() + params.theme.slice(1);
    const generatedTitle = `${titlePrefix} ${themeCapitalized} Tale`;
    
    return {
      title: generatedTitle,
      content: plainContent
    };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('=== STORY GENERATION REQUEST ===');
    
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Extract user ID from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const storyParams: StoryRequest = await req.json();
    
    // Validate required parameters
    const requiredFields = ['readingLevel', 'interestLevel', 'theme', 'language', 'length'];
    for (const field of requiredFields) {
      if (!storyParams[field]) {
        return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Check user limits before generating story
    const limitCheck = await checkUserLimits(supabase, user.id, storyParams);
    if (!limitCheck.canGenerate) {
      return new Response(JSON.stringify({ 
        error: limitCheck.error,
        limitReached: true
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const story = await generateStory(storyParams);
    
    console.log('=== STORY GENERATED SUCCESSFULLY ===');
    
    return new Response(JSON.stringify(story), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('=== STORY GENERATION ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate story'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}).catch((serverError) => {
  console.error('=== SERVE FUNCTION FATAL ERROR ===');
  console.error('Server startup failed:', serverError);
  console.error('Error type:', serverError?.constructor?.name);
  console.error('Error message:', serverError?.message);
  console.error('Error stack:', serverError?.stack);
  throw serverError;
});

console.log('=== EDGE FUNCTION SETUP COMPLETE ===');