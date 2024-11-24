import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export const generateStory = async (keywords: string[], readingLevel: string, theme: string) => {
  const gradeLevel = readingLevel === 'k' ? 'kindergarten' : `${readingLevel}st grade`;
  
  const themeDescriptions: { [key: string]: string } = {
    fantasy: "a fantasy adventure theme",
    mystery: "a mysterious and intriguing theme",
    fairytale: "a classic fairy tale theme",
    science: "a science fiction theme",
    nature: "a nature and animals theme",
    drseuss: "a whimsical Dr. Seuss-style rhyming story with playful language"
  };

  const prompt = `Write a children's story at a ${gradeLevel} reading level with ${themeDescriptions[theme]}. 
  The story MUST frequently use these keywords: ${keywords.join(', ')}. 
  Make sure each keyword appears at least 3 times in different contexts to help with learning.
  The story should be engaging and educational.
  Format the response as a JSON object with exactly these fields:
  {
    "title": "Story Title",
    "content": "Story content with paragraphs separated by \\n"
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a skilled children's story writer. Always respond with valid JSON containing a title and content field."
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