import { useState } from "react";
import { StoryForm, StoryFormData } from "@/components/StoryForm";
import { StoryDisplay } from "@/components/StoryDisplay";
import { motion } from "framer-motion";
import { generateStory } from "@/services/openai";
import { toast } from "sonner";

const Index = () => {
  const [story, setStory] = useState<{ title: string; content: string } | null>(
    null
  );

  const handleSubmit = async (data: StoryFormData) => {
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

        <div className="max-w-4xl mx-auto">
          <StoryForm onSubmit={handleSubmit} />
          {story && <StoryDisplay title={story.title} content={story.content} />}
        </div>
      </div>
    </div>
  );
};

export default Index;