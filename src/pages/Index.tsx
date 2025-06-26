
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
  const [story, setStory] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const {
    user,
    logout
  } = useAuth();

  const handleSubmit = async (data: StoryFormData) => {
    if (data.useSightWords && words.length === 0) {
      toast.error("Please add some sight words before generating a story");
      return;
    }
    try {
      const toastId = toast.loading("Generating your story...");
      const generatedStory = await generateStory(data.useSightWords ? words : [], data.readingLevel, data.theme, data.isDrSeussStyle);
      toast.dismiss(toastId);
      setStory(generatedStory);
      toast.success("Story generated successfully!");
    } catch (error) {
      toast.error("Failed to generate story. Please try again.");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
      <div className="container px-4 py-8">
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="clay-card inline-block p-6 mb-4">
            <img 
              src="/lovable-uploads/386b1300-0e6f-4768-99e7-ec65550f9771.png" 
              alt="StoryBridge Logo" 
              className="w-64 h-auto mx-auto drop-shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
            Create Magical Stories for Young Readers
          </h1>
        </motion.div>

        {/* User Info and Logout */}
        <div className="flex justify-end items-center mb-8">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 font-medium">
              Welcome, {user?.user_metadata?.name || "User"}
            </span>
            <Button variant="outline" onClick={logout} className="clay-button">
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="clay-card p-8">
            <Tabs defaultValue="words" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-transparent p-2 gap-2">
                <TabsTrigger value="words" className="clay-tab text-gray-700 font-semibold">
                  🎯 Sight Words
                </TabsTrigger>
                <TabsTrigger value="story" className="clay-tab text-gray-700 font-semibold">
                  📚 Generate Story
                </TabsTrigger>
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
    </div>
  );
};

export default Index;
