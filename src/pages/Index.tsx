import { useState } from "react";
import { StoryForm, StoryFormData } from "@/components/StoryForm";
import { StoryDisplay } from "@/components/StoryDisplay";
import { motion } from "framer-motion";
import { initializeOpenAI, generateStory } from "@/services/openai";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Index = () => {
  const [story, setStory] = useState<{ title: string; content: string } | null>(
    null
  );
  const [apiKey, setApiKey] = useState("");
  const [isApiKeySet, setIsApiKeySet] = useState(false);

  const handleApiKeySubmit = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    try {
      initializeOpenAI(apiKey);
      setIsApiKeySet(true);
      toast.success("API key set successfully");
    } catch (error) {
      toast.error("Invalid API key");
    }
  };

  const handleSubmit = async (data: StoryFormData) => {
    if (!isApiKeySet) {
      toast.error("Please set your OpenAI API key first");
      return;
    }

    try {
      toast.loading("Generating your story...");
      const generatedStory = await generateStory(
        data.keywords,
        data.readingLevel,
        data.theme
      );
      setStory(generatedStory);
      toast.success("Story generated successfully!");
    } catch (error) {
      toast.error("Failed to generate story. Please try again.");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-story-sage to-story-warm">
      <div className="container px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            LexiLeap
          </h1>
          <p className="text-lg text-gray-600">
            Create magical stories with your own keywords
          </p>
        </motion.div>

        {!isApiKeySet && (
          <div className="max-w-md mx-auto mb-8 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Set Your OpenAI API Key</h2>
            <div className="space-y-4">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your OpenAI API key"
                className="w-full"
              />
              <Button 
                onClick={handleApiKeySubmit}
                className="w-full bg-story-coral hover:bg-story-yellow transition-colors duration-300"
              >
                Set API Key
              </Button>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          <StoryForm onSubmit={handleSubmit} />
          {story && <StoryDisplay title={story.title} content={story.content} />}
        </div>
      </div>
    </div>
  );
};

export default Index;