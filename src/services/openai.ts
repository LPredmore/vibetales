
import OpenAI from "openai";
import { getReadingLevelGuidelines } from "@/utils/readingLevelGuidelines";

// Validate API key is present
if (!import.meta.env.VITE_OPENROUTER_API_KEY) {
  throw new Error('VITE_OPENROUTER_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    "HTTP-Referer": window.location.origin,
    "X-Title": "StoryBridge"
  }
});

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

  try {
    console.log("Generating story with parameters:", { keywords, readingLevel, interestLevel, theme, isDrSeussStyle });
    console.log('Using OpenRouter API with key:', import.meta.env.VITE_OPENROUTER_API_KEY ? 'KEY_PRESENT' : 'KEY_MISSING');
    console.log('Base URL:', "https://openrouter.ai/api/v1");
    
    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
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
      temperature: 0.7
    });

    const storyText = response.choices[0].message.content;
    if (!storyText) {
      console.error("No story content received from OpenAI");
      throw new Error("No story content received");
    }

    try {
      const parsedStory = JSON.parse(storyText.trim());
      if (!parsedStory.title || !parsedStory.content) {
        console.error("Invalid story format received:", storyText);
        throw new Error("Invalid story format");
      }
      return parsedStory;
    } catch (parseError) {
      console.error("Failed to parse story JSON:", storyText);
      throw new Error("Failed to generate a valid story format");
    }
  } catch (error) {
    console.error("Error generating story:", error);
    throw new Error("Failed to generate story. Please try again.");
  }
};
