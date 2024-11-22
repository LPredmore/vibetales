import OpenAI from "openai";

let openai: OpenAI;

export const initializeOpenAI = (apiKey: string) => {
  openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
};

export const generateStory = async (keywords: string[], readingLevel: string, theme: string) => {
  if (!openai) {
    throw new Error("OpenAI not initialized. Please provide an API key.");
  }

  const gradeLevel = readingLevel === 'k' ? 'kindergarten' : `${readingLevel}st grade`;
  
  const prompt = `Write a children's story at a ${gradeLevel} reading level with a ${theme} theme. 
  The story MUST frequently use these keywords: ${keywords.join(', ')}. 
  Make sure each keyword appears at least 3 times in different contexts to help with learning.
  The story should be engaging and educational.
  Format the response as a JSON object with 'title' and 'content' fields.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
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
    response_format: { type: "json_object" }
  });

  const story = JSON.parse(response.choices[0].message.content || "{}");
  return story;
};