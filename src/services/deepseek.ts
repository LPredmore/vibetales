import { getReadingLevelGuidelines } from "@/utils/readingLevelGuidelines";

interface StoryResponse {
  title: string;
  content: string;
}

export const generateStory = async (
  keywords: string[], 
  readingLevel: string, 
  theme: string,
  isDrSeussStyle: boolean = false
): Promise<StoryResponse> => {
  const gradeLevel = readingLevel === 'k' ? 'kindergarten' : 
                     readingLevel === 'teen' ? 'teen' :
                     `${readingLevel}st grade`;
  
  const guidelines = getReadingLevelGuidelines(readingLevel);
  
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

  const prompt = `Write a children's story strictly following these ${gradeLevel} reading level guidelines:
  - Word count: ${guidelines.wordCount} words
  - Sentence length: ${guidelines.sentenceLength}
  - Vocabulary level: ${guidelines.vocabulary}
  - Concept complexity: ${guidelines.concepts}
  - Story structure: ${guidelines.structure}

  ${styleInstructions}

  The story should have ${themeDescriptions[theme] || theme} theme.
  ${keywords.length > 0 ? `MUST frequently use these sight words: ${keywords.join(', ')}. 
  Each sight word should appear at least 3 times in different contexts.` : ''}
  
  Keep sentences simple and age-appropriate. Avoid any words that would be too advanced for this grade level.
  Use repetition to reinforce learning.
  
  Format the response as a JSON object with exactly these fields:
  {
    "title": "Story Title",
    "content": "Story content with paragraphs separated by \\n"
  }`;

  try {
    console.log("Generating story with parameters:", { keywords, readingLevel, theme, isDrSeussStyle });
    
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a skilled children's educational writer who specializes in creating grade-appropriate content. Always respond with valid JSON containing a title and content field."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Deepseek API error: ${response.status}`);
    }

    const data = await response.json();
    const storyText = data.choices[0].message.content;

    if (!storyText) {
      throw new Error("No story content received");
    }

    try {
      const parsedStory = JSON.parse(storyText.trim());
      if (!parsedStory.title || !parsedStory.content) {
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