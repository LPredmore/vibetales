import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

try {
  serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      console.log('=== Edge Function Started ===');
      
      // Get API key inside the handler to avoid module initialization issues
      const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
      console.log('OpenRouter API Key exists:', !!openRouterApiKey);
      console.log('OpenRouter API Key length:', openRouterApiKey?.length);
      console.log('OpenRouter API Key starts correctly:', openRouterApiKey?.startsWith('sk-or-v1-'));
      
      if (!openRouterApiKey) {
        console.error('OPENROUTER_API_KEY environment variable not found');
        throw new Error('OpenRouter API key not configured');
      }

      if (!openRouterApiKey.startsWith('sk-or-v1-')) {
        console.error('Invalid OpenRouter API key format');
        throw new Error('Invalid OpenRouter API key format');
      }

      const { keywords, readingLevel, interestLevel, theme, isDrSeussStyle } = await req.json();
      console.log('Request data:', { keywords, readingLevel, interestLevel, theme, isDrSeussStyle });

      const getReadingLevelGuidelines = (level: string) => {
        const guidelines = {
          'k': { wordCount: '50-100 words', sentenceLength: '3-5 words', vocabulary: 'simple, high-frequency words', concepts: 'single concept per sentence', structure: 'simple sentences' },
          '1': { wordCount: '100-200 words', sentenceLength: '5-8 words', vocabulary: 'basic sight words and simple vocabulary', concepts: 'simple story with beginning, middle, end', structure: 'mostly simple sentences' },
          '2': { wordCount: '200-300 words', sentenceLength: '6-10 words', vocabulary: 'expanding vocabulary with context clues', concepts: 'simple plot with basic problem and solution', structure: 'mix of simple and compound sentences' },
          '3': { wordCount: '300-400 words', sentenceLength: '8-12 words', vocabulary: 'more complex vocabulary with context clues', concepts: 'multiple events, basic character development', structure: 'varied sentence structures' }
        };
        return guidelines[level as keyof typeof guidelines] || guidelines['1'];
      };

      const getInterestLevelGuidelines = (level: string) => {
        const guidelines = {
          elementary: { maturity: "Simple themes like friendship, family, basic emotions, school experiences" },
          "middle-grade": { maturity: "More complex emotions, friendship challenges, mild adventure" },
          "young-adult": { maturity: "Complex themes, identity exploration, deeper relationships" }
        };
        return guidelines[level as keyof typeof guidelines] || guidelines.elementary;
      };

      const gradeLevel = readingLevel === 'k' ? 'kindergarten' : `${readingLevel}st grade`;
      const readingGuidelines = getReadingLevelGuidelines(readingLevel);
      const interestGuidelines = getInterestLevelGuidelines(interestLevel);

      const styleInstructions = isDrSeussStyle 
        ? `Write in a Dr. Seuss style with playful rhyming patterns, made-up words, and whimsical language.`
        : `Write in a clear, engaging narrative style appropriate for children.`;

      const prompt = `Write a children's story that balances reading level and interest level appropriately:

READING LEVEL (${gradeLevel}):
- Word count: ${readingGuidelines.wordCount}
- Sentence length: ${readingGuidelines.sentenceLength}
- Vocabulary level: ${readingGuidelines.vocabulary}
- Concept complexity: ${readingGuidelines.concepts}
- Story structure: ${readingGuidelines.structure}

INTEREST/MATURITY LEVEL (${interestLevel}):
- Theme maturity: ${interestGuidelines.maturity}

${styleInstructions}

The story should have a ${theme} theme.
${keywords.length > 0 ? `MUST frequently use these sight words: ${keywords.join(', ')}. Each sight word should appear at least 3 times in different contexts.` : ''}

Format the response as a JSON object with exactly these fields:
{
  "title": "Story Title",
  "content": "Story content with paragraphs separated by \\n"
}`;

      console.log('Making OpenRouter API call with model:', 'qwen/qwen3-30b-a3b:free');
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://storybridgeapp.lovable.app',
          'X-Title': 'StoryBridge'
        },
        body: JSON.stringify({
          model: 'qwen/qwen3-30b-a3b:free',
          messages: [
            {
              role: "system",
              content: "You are a skilled children's educational writer who specializes in creating grade-appropriate content that balances reading level with age-appropriate interest levels. Always respond with valid JSON containing a title and content field."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
          stream: false
        })
      });

      console.log('OpenRouter response status:', response.status);
      console.log('OpenRouter response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('OpenRouter API error response:', errorBody);
        throw new Error(`OpenRouter Error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      console.log('OpenRouter response data structure:', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        hasMessage: !!data.choices?.[0]?.message,
        hasContent: !!data.choices?.[0]?.message?.content
      });
      
      const storyText = data.choices?.[0]?.message?.content;
      
      if (!storyText) {
        console.error('No story content in response:', data);
        throw new Error("No story content received from OpenRouter");
      }

      console.log('Raw story text from AI:', storyText.substring(0, 200) + '...');

      let parsedStory;
      try {
        parsedStory = JSON.parse(storyText.trim());
        console.log('Successfully parsed JSON story');
      } catch (parseError) {
        console.warn('Failed to parse JSON, using fallback. Parse error:', parseError);
        console.warn('Raw story text that failed to parse:', storyText);
        
        // Fallback: return the raw text as content
        parsedStory = {
          title: 'Your Story',
          content: storyText.replace(/\n/g, '\\n')
        };
      }

      if (!parsedStory.title || !parsedStory.content) {
        console.error('Invalid story format:', parsedStory);
        throw new Error("Invalid story format - missing title or content");
      }

      return new Response(JSON.stringify(parsedStory), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error in generate-story function:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  });
} catch (moduleError) {
  console.error('Module initialization error in generate-story function:', moduleError);
  // Fallback serve function that returns error
  serve(() => {
    return new Response(JSON.stringify({ error: 'Function initialization failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}