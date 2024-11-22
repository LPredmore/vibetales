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