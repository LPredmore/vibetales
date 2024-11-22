import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "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", 
  dangerouslyAllowBrowser: true
});

export const generateStory = async (keywords: string[], readingLevel: string, theme: string) => {
  const gradeLevel = readingLevel === 'k' ? 'kindergarten' : `${readingLevel}st grade`;
  
  const prompt = `Write a children's story at a ${gradeLevel} reading level with a ${theme} theme. 
  The story MUST frequently use these keywords: ${keywords.join(', ')}. 
  Make sure each keyword appears at least 3 times in different contexts to help with learning.
  The story should be engaging and educational.
  Respond with a JSON object with 'title' and 'content' fields. Format the response EXACTLY like this:
  {"title": "Story Title", "content": "Story content as a single string with paragraphs separated by newlines"}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a skilled children's story writer who creates engaging, educational content."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 1000
  });

  // Extract the content and parse it manually
  const storyText = response.choices[0].message.content || "{}";
  try {
    return JSON.parse(storyText);
  } catch (error) {
    console.error("Failed to parse story JSON:", storyText);
    throw new Error("Failed to generate story");
  }
};