
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
  
  // First, try using the Supabase edge function
  try {
    console.log("=== Trying Supabase Edge Function ===");
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
      console.log("Edge function error:", error);
      throw new Error(error.message);
    }

    if (data && data.title && data.content) {
      console.log("=== Story Successfully Generated via Edge Function ===");
      return data;
    }
  } catch (edgeError) {
    console.log("Edge function failed, falling back to direct API call:", edgeError);
  }

  // Fallback to direct API call
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  
  console.log("=== OpenRouter API Debug Info ===");
  console.log("API Key exists:", !!apiKey);
  console.log("API Key type:", typeof apiKey);
  console.log("API Key starts correctly:", apiKey?.startsWith("sk-or-v1-"));
  console.log("API Key length:", apiKey?.length);
  console.log("API Key first 10 chars:", apiKey?.substring(0, 10));
  console.log("Raw env var:", import.meta.env.VITE_OPENROUTER_API_KEY?.substring(0, 15));
  
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error('OpenRouter API key not found. Please update your API key.');
  }

  if (!apiKey.startsWith("sk-or-v1-")) {
    throw new Error("OpenRouter API key has invalid format - must start with 'sk-or-v1-'");
  }

  const gradeLevel = readingLevel === 'k' ? 'kindergarten' : 
                     readingLevel === 'teen' ? 'teen' :
                     `${readingLevel}st grade`;
  const guidelines = getReadingLevelGuidelines(readingLevel);
  const interestGuidelines = getInterestLevelGuidelines(interestLevel);
  
  const themeDescriptions: { [key: string]: string } = {
    fantasy: "a fantasy adventure theme",
    mystery: "a mysterious and intriguing theme",
    fairytale: "a classic fairy tale theme",
    science: "a science fiction theme",
    nature: "a nature and animals theme"
  };

  const styleInstructions = isDrSeussStyle 
    ? `Write in a Dr. Seuss style with playful rhyming patterns, made-up words, and whimsical language. 
       Use simple, catchy rhymes and repetitive patterns typical of Dr. Seuss books.
       Include fun, nonsensical elements while maintaining readability for the grade level.`
    : `Write in a clear, engaging narrative style appropriate for children.`;

  const prompt = `Write a children's story that balances reading level and interest level appropriately:

  READING LEVEL (${gradeLevel}):
  - Word count: ${guidelines.wordCount} words
  - Sentence length: ${guidelines.sentenceLength}
  - Vocabulary level: ${guidelines.vocabulary}
  - Concept complexity: ${guidelines.concepts}
  - Story structure: ${guidelines.structure}

  INTEREST/MATURITY LEVEL (${interestLevel}):
  - Theme maturity: ${interestGuidelines.maturity}
  - Content appropriateness: ${interestGuidelines.content}
  - Character types: ${interestGuidelines.characters}
  - Topic focus: ${interestGuidelines.topics}

  ${styleInstructions}

  The story should have ${themeDescriptions[theme] || theme} theme.
  ${keywords.length > 0 ? `MUST frequently use these sight words: ${keywords.join(', ')}. 
  Each sight word should appear at least 3 times in different contexts.` : ''}
  
  IMPORTANT: Keep the vocabulary and sentence complexity at the ${gradeLevel} reading level, but make the story themes and character situations appropriate for the ${interestLevel} interest level. This allows for age-appropriate content complexity while maintaining reading accessibility.
  
  Format the response as a JSON object with exactly these fields:
  {
    "title": "Story Title",
    "content": "Story content with paragraphs separated by \\n"
  }`;

  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const payload = {
    model: 'openai/gpt-4o-mini',
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
  };

  try {
    console.log("=== Making OpenRouter Request ===");
    console.log("URL:", url);
    console.log("Payload model:", payload.model);
    console.log("Headers will include Authorization with Bearer token");
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'StoryBridge'
      },
      body: JSON.stringify(payload)
    });

    console.log("=== Response Status ===");
    console.log("Status:", response.status);
    console.log("Status Text:", response.statusText);
    console.log("OK:", response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("=== OpenRouter API Error ===");
      console.error("Status:", response.status);
      console.error("Error Data:", errorData);
      throw new Error(`OpenRouter Error: ${response.status} ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log("=== Successful Response ===");
    console.log("Response data structure:", Object.keys(data));
    
    const storyText = data.choices?.[0]?.message?.content;
    
    if (!storyText) {
      console.error("No story content received from OpenRouter");
      console.error("Full response:", data);
      throw new Error("No story content received");
    }

    try {
      const parsedStory = JSON.parse(storyText.trim());
      if (!parsedStory.title || !parsedStory.content) {
        console.error("Invalid story format received:", storyText);
        throw new Error("Invalid story format");
      }
      console.log("=== Story Successfully Generated ===");
      console.log("Title:", parsedStory.title);
      return parsedStory;
    } catch (parseError) {
      console.error("Failed to parse story JSON:", storyText);
      console.error("Parse error:", parseError);
      throw new Error("Failed to generate a valid story format");
    }
  } catch (error) {
    console.error("=== Error generating story ===");
    console.error("Error details:", error);
    throw new Error("Failed to generate story. Please try again.");
  }
};
