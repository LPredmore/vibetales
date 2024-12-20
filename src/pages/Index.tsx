import { useState } from "react";
import { StoryForm, StoryFormData } from "@/components/StoryForm";
import { StoryDisplay } from "@/components/StoryDisplay";
import { SightWordManager } from "@/components/SightWordManager";
import { motion } from "framer-motion";
import { generateStory } from "@/services/openai";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [story, setStory] = useState<{ title: string; content: string } | null>(
    null
  );
  const [words, setWords] = useState<string[]>([]);
  const { user, logout } = useAuth();

  const handleSubmit = async (data: StoryFormData) => {
    if (words.length === 0) {
      toast.error("Please add some sight words before generating a story");
      return;
    }

    try {
      const toastId = toast.loading("Generating your story...");
      const generatedStory = await generateStory(
        words,
        data.readingLevel,
        data.theme
      );
      toast.dismiss(toastId);
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
        <div className="flex justify-between items-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center flex-1"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              LexiLeap
            </h1>
            <p className="text-lg text-gray-600">
              Create magical stories with your sight words
            </p>
          </motion.div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Welcome, {user?.user_metadata?.name || "User"}
            </span>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="words" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="words">Sight Words</TabsTrigger>
              <TabsTrigger value="story">Generate Story</TabsTrigger>
            </TabsList>
            
            <TabsContent value="words">
              <SightWordManager words={words} setWords={setWords} />
            </TabsContent>
            
            <TabsContent value="story">
              <StoryForm onSubmit={handleSubmit} />
              {story && <StoryDisplay title={story.title} content={story.content} />}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;