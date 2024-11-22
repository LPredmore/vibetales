import { useState } from "react";
import { StoryForm, StoryFormData } from "@/components/StoryForm";
import { StoryDisplay } from "@/components/StoryDisplay";
import { motion } from "framer-motion";

const Index = () => {
  const [story, setStory] = useState<{ title: string; content: string } | null>(
    null
  );

  const handleSubmit = async (data: StoryFormData) => {
    // In a real app, this would call an API
    // For now, we'll just set a mock story
    setStory({
      title: "The Magical Adventure",
      content: `Once upon a time, in a land far away, there lived a ${
        data.keywords[0] || "brave hero"
      }. Every day, they would dream of amazing adventures.\n\nOne day, something extraordinary happened that would change everything...`,
    });
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