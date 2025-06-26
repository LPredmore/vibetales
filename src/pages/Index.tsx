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
  return <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
      <div className="container px-4 py-16 bg-blue-200">
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

        <motion.div initial={{
        opacity: 0,
        y: -20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.6
      }} className="text-center mb-12">
          
        </motion.div>

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
    </div>;
};
export default Index;