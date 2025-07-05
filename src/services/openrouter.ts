
import { getReadingLevelGuidelines } from "@/utils/readingLevelGuidelines";

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
  keywords: string[], 
  readingLevel: string,
  interestLevel: string,
  theme: string,
  isDrSeussStyle: boolean = false
) => {
  console.log("=== Story Generation Started ===");
  console.log("Environment check:", {
    hasViteEnv: !!import.meta.env,
    envKeys: Object.keys(import.meta.env).filter(k => k.includes('OPENROUTER')),
  });
  
  // Use the Supabase edge function
  console.log("=== Using Supabase Edge Function ===");
  const { supabase } = await import("@/integrations/supabase/client");
  
  const { data, error } = await supabase.functions.invoke('generate-story', {
    body: {
      keywords,
      readingLevel,
      interestLevel,
      theme,
      isDrSeussStyle
    }
  });

  if (error) {
    console.error("Edge function error:", error);
    throw new Error(`Edge function failed: ${error.message}`);
  }

  if (!data || !data.title || !data.content) {
    console.error("Invalid response from edge function:", data);
    throw new Error("Invalid response from story generation service");
  }

  console.log("=== Story Successfully Generated via Edge Function ===");
  return data;
};
