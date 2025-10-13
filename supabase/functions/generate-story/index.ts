import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
// TEMPORARY: Bypassing subscription check for testing - all users treated as premium
async function checkSubscription(userId: string): Promise<boolean> {
  console.log('TEMP: Treating all users as premium for testing');
  return true; // Always return premium status
  
  /* ORIGINAL CODE - RESTORE WHEN DONE TESTING
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
  */
}

// Check and update user limits
// TEMPORARY: Bypassing all limits for testing - unlimited generation for all users
async function checkUserLimits(supabase: any, userId: string, storyParams: StoryRequest): Promise<{ canGenerate: boolean; error?: string }> {
  console.log('TEMP: Bypassing all limits for testing - allowing unlimited stories');
  return { canGenerate: true }; // Always allow generation
  
  /* ORIGINAL CODE - RESTORE WHEN DONE TESTING
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
  */
}

async function generateStory(params: StoryRequest): Promise<StoryResponse> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable not set');
  }

  console.log('=== GENERATING STORY WITH OPENROUTER GPT-4O-MINI ===');
  console.log('Parameters:', {
    readingLevel: params.readingLevel,
    interestLevel: params.interestLevel,
    theme: params.theme,
    length: params.length,
    isDrSeussStyle: params.isDrSeussStyle,
    useSightWords: params.useSightWords,
    keywordCount: params.keywords.length
  });

  const systemPrompt = buildSystemPrompt(params);
  const dynamicTokenLimit = getTokenLimit(params.length);
  
  // Optimized parameters for creative story generation
  const requestBody = {
    model: "openai/gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user", 
        content: `Create a ${params.length} ${params.theme} story for ${params.readingLevel} grade level${params.hasThemeLesson && params.themeLesson ? ` that focuses on the theme/lesson: ${params.themeLesson}` : ''}.`
      }
    ],
    temperature: 0.8,
    max_tokens: dynamicTokenLimit,
    top_p: 0.9,
    frequency_penalty: 0.3,
    presence_penalty: 0.1,
    stream: false
  };

  console.log(`=== CALLING OPENROUTER API (max_tokens: ${dynamicTokenLimit}) ===`);
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://hyiyuhjabjnksjbqfwmn.supabase.co',
      'X-Title': 'Story Generator'
    },
    body: JSON.stringify(requestBody)
  });

  console.log('OpenRouter response status:', response.status);
  
  // Log OpenRouter rate-limit headers
  const rateLimitHeaders = {
    limit: response.headers.get('x-ratelimit-limit-requests'),
    remaining: response.headers.get('x-ratelimit-remaining-requests'),
    reset: response.headers.get('x-ratelimit-reset-requests'),
    retryAfter: response.headers.get('retry-after')
  };
  console.log('OpenRouter rate-limit headers:', rateLimitHeaders);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('OpenRouter API error:', errorText);
    
    // Enhanced error message with rate-limit info for 429 errors
    if (response.status === 429) {
      const rateLimitInfo = `Rate limit info: ${JSON.stringify(rateLimitHeaders)}`;
      throw new Error(`OpenRouter API rate limit exceeded (${response.status}): ${errorText}. ${rateLimitInfo}`);
    }
    
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('OpenRouter response received:', !!data.choices);
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response generated from OpenRouter');
  }

  const content = data.choices[0].message?.content;
  if (!content) {
    throw new Error('Empty response from OpenRouter');
  }

  console.log('=== PARSING STORY RESPONSE ===');
  
  // Clean up the content - remove any potential JSON markdown formatting
  let cleanContent = content.trim();
  
  // Remove common markdown formatting that might appear
  cleanContent = cleanContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
  
  try {
    // Try to parse as JSON first (in case model still returns JSON despite instructions)
    const parsed = JSON.parse(cleanContent);
    if (parsed.title && parsed.content) {
      console.log('Successfully parsed JSON response');
      return parsed;
    }
  } catch {
    // Expected path: plain text story content
    console.log('Processing plain text story response');
    
    // Generate a meaningful title based on the story parameters
    const titlePrefix = params.isDrSeussStyle ? "A Whimsical" : "A";
    const themeCapitalized = params.theme.charAt(0).toUpperCase() + params.theme.slice(1);
    const generatedTitle = `${titlePrefix} ${themeCapitalized} Tale`;
    
    return {
      title: generatedTitle,
      content: cleanContent
    };
  }

  throw new Error('Invalid response format from OpenRouter');
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
    console.error('Error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate story'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});