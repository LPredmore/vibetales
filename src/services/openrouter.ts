
import { getReadingLevelGuidelines } from "@/utils/readingLevelGuidelines";
import { StoryFormData } from "@/components/StoryForm";

const getInterestLevelGuidelines = (interestLevel: string) => {
  const guidelines = {
    elementary: {
      maturity: "Simple themes like friendship, family, basic emotions, school experiences",
      content: "Age-appropriate situations, positive outcomes, minimal conflict",
      characters: "Relatable child characters, friendly animals, family members",
      topics: "Everyday adventures, learning new things, helping others"
    },
    "middle-grade": {
      maturity: "More complex emotions, friendship challenges, mild adventure",
      content: "Problem-solving scenarios, overcoming obstacles, character growth",
      characters: "Pre-teen protagonists, diverse friend groups, mentors",
      topics: "School challenges, family dynamics, discovering talents, mild mysteries"
    },
    "young-adult": {
      maturity: "Complex themes, identity exploration, deeper relationships",
      content: "Coming-of-age elements, meaningful choices, consequences",
      characters: "Teen protagonists, complex relationships, diverse perspectives",
      topics: "Self-discovery, responsibility, future planning, social issues"
    }
  };

  return guidelines[interestLevel as keyof typeof guidelines];
};

export const generateStory = async (
  storyData: StoryFormData & { keywords: string[] }
) => {
  // Validate required fields
  const requiredFields = ['readingLevel', 'interestLevel', 'theme', 'length'];
  for (const field of requiredFields) {
    if (!storyData[field as keyof StoryFormData]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  console.log("=== Story Generation Started ===");
  
  // Use the Supabase edge function
  console.log("=== Using Supabase Edge Function with OpenAI ===");
  const { supabase } = await import("@/integrations/supabase/client");
  
  // Check auth status before making the request
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.error("No valid session found:", sessionError);
    throw new Error('Authentication required. Please log in again.');
  }
  
  const { data, error } = await supabase.functions.invoke('generate-story', {
    body: {
      readingLevel: storyData.readingLevel,
      interestLevel: storyData.interestLevel,
      theme: storyData.theme,
      themeLesson: storyData.themeLesson,
      hasThemeLesson: storyData.hasThemeLesson,
      length: storyData.length,
      isDrSeussStyle: storyData.isDrSeussStyle,
      useSightWords: storyData.useSightWords,
      keywords: storyData.keywords
    }
  });

  console.log("Edge function response:", { data, error });
  
  // Log rate-limit headers if present in error context
  if (error?.context?.headers) {
    console.log("Rate-limit headers from Supabase:", {
      limit: error.context.headers['x-ratelimit-limit-requests'],
      remaining: error.context.headers['x-ratelimit-remaining-requests'],
      reset: error.context.headers['x-ratelimit-reset-requests'],
      retryAfter: error.context.headers['retry-after']
    });
  }

  if (error) {
    console.error("Edge function error details:", error);
    
    // Handle authentication errors specifically
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error('Session expired. Please log in again.');
    }
    
    // Handle specific limit errors
    if (error.message?.includes('Daily story limit reached') || 
        error.context?.error?.includes('limitReached')) {
      throw new Error('LIMIT_REACHED');
    }
    
    throw new Error(`Edge function failed: ${error.message || JSON.stringify(error)}`);
  }

  if (!data || !data.title || !data.content) {
    console.error("Invalid response from edge function:", data);
    throw new Error(`Invalid response from story generation service: ${JSON.stringify(data)}`);
  }

  console.log("=== Story Successfully Generated via Edge Function ===");
  return data;
};
