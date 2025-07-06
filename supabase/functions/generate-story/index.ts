import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface StoryRequest {
  readingLevel: "k" | "1" | "2" | "3" | "4" | "5" | "teen";
  interestLevel: "elementary" | "middle-grade" | "young-adult";
  theme: "fantasy" | "mystery" | "fairytale" | "science" | "nature" | string;
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

  return `You are a children's story writer. Create an engaging, age-appropriate story with the following requirements:

READING LEVEL: ${params.readingLevel.toUpperCase()} Grade
- Target word count: ${wordCountTarget} words (this is important - aim for this exact range)
- Sentence length: ${level.sentenceLength} words per sentence
- Use vocabulary appropriate for ${params.readingLevel} grade level

STORY REQUIREMENTS:
- Theme: ${params.theme}
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

IMPORTANT: Write ONLY the story content. Do not include any JSON formatting, markdown, or extra text. Just write the story directly.`;
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
    "short": 500,
    "medium": 800,
    "long": 1200
  };
  
  return tokenLimits[length as keyof typeof tokenLimits] || 800;
}

async function generateStory(params: StoryRequest): Promise<StoryResponse> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable not set');
  }

  console.log('=== GENERATING STORY WITH DEEPSEEK ===');
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
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user", 
        content: `Create a ${params.length} ${params.theme} story for ${params.readingLevel} grade level.`
      }
    ],
    temperature: 0.8,         // Higher creativity for stories
    max_tokens: dynamicTokenLimit,  // Dynamic based on story length
    stream: false             // Get complete response
  };

  console.log(`=== CALLING DEEPSEEK API (max_tokens: ${dynamicTokenLimit}) ===`);
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  console.log('DeepSeek response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('DeepSeek API error:', errorText);
    throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('DeepSeek response received:', !!data.choices);
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response generated from DeepSeek');
  }

  const content = data.choices[0].message?.content;
  if (!content) {
    throw new Error('Empty response from DeepSeek');
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

  throw new Error('Invalid response format from DeepSeek');
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
    const storyParams: StoryRequest = await req.json();
    
    // Validate required parameters
    const requiredFields = ['readingLevel', 'interestLevel', 'theme', 'length'];
    for (const field of requiredFields) {
      if (!storyParams[field]) {
        return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
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