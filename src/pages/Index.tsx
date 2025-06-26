
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
      <div className="container px-4 py-4 sm:py-8 max-w-6xl mx-auto">
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6 sm:mb-8"
        >
          <div className="mb-4">
            <img 
              src="/lovable-uploads/79708384-34ad-45b6-af27-6fb7e037e385.png" 
              alt="StoryBridge Logo" 
              className="w-48 sm:w-64 h-auto mx-auto"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent px-4">
            Create Magical Stories for Young Readers
          </h1>
        </motion.div>

        {/* User Info and Logout */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-4 order-2 sm:order-1">
            <span className="text-sm text-gray-700 font-medium">
              Welcome, {user?.user_metadata?.name || "User"}
            </span>
          </div>
          <Button 
            variant="outline" 
            onClick={logout} 
            className="clay-button order-1 sm:order-2 min-h-[44px]"
          >
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="clay-card p-4 sm:p-8">
            <Tabs defaultValue="words" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 bg-transparent p-2 gap-2 h-auto">
                <TabsTrigger value="words" className="clay-tab text-gray-700 font-semibold min-h-[44px] text-sm sm:text-base">
                  🎯 Sight Words
                </TabsTrigger>
                <TabsTrigger value="story" className="clay-tab text-gray-700 font-semibold min-h-[44px] text-sm sm:text-base">
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
