import { useState } from "react";
import { StoryForm, StoryFormData } from "@/components/StoryForm";
import { StoryDisplay } from "@/components/StoryDisplay";
import { SightWordManager } from "@/components/SightWordManager";
import { FavoriteStories } from "@/components/FavoriteStories";
import { UsageLimits } from "@/components/UsageLimits";
import { LimitReachedPrompt } from "@/components/LimitReachedPrompt";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserMenu } from "@/components/UserMenu";
import { AIContentDisclaimer } from "@/components/AIContentDisclaimer";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useSightWords } from "@/hooks/useSightWords";
import { usePaymentHandler } from "@/hooks/usePaymentHandler";
import { useStoryGeneration } from "@/hooks/useStoryGeneration";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const [refreshLimits, setRefreshLimits] = useState<(() => Promise<void>) | null>(null);
  
  // Custom hooks for separation of concerns
  const { words, setWords, wordsLoading } = useSightWords();
  usePaymentHandler();
  const { story, showLimitPrompt, setShowLimitPrompt, handleStoryGeneration } = useStoryGeneration();

  const handleSubmit = (data: StoryFormData) => {
    handleStoryGeneration(data, words, wordsLoading, refreshLimits);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center">
        <div>Initializing...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
      <div className="container px-4 py-4 sm:py-8 max-w-6xl mx-auto">
        {/* Header with Logo and Logout Button */}
        <div className="flex justify-between items-start mb-6 sm:mb-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center flex-1"
          >
            <div className="mb-4">
              <img 
                src="/lovable-uploads/0b63dbe4-125f-4b39-aa21-b812a43df2f5.png" 
                alt="VibeTales Logo" 
                className="w-48 sm:w-64 h-auto mx-auto"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent px-4">
              Create Magical Stories for Young Readers
            </h1>
          </motion.div>

          <UserMenu />
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="clay-card p-4 sm:p-8">
            <Tabs defaultValue="story" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 sm:mb-8 bg-transparent p-1 sm:p-2 gap-1 sm:gap-2 h-auto">
                <TabsTrigger value="story" className="clay-tab-mobile text-gray-700 font-semibold min-h-[48px] px-2 sm:px-4 py-3 text-xs sm:text-base flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                  <span className="text-lg sm:text-base">📚</span>
                  <span className="text-xs sm:text-base leading-tight sm:leading-normal">Story</span>
                </TabsTrigger>
                <TabsTrigger value="words" className="clay-tab-mobile text-gray-700 font-semibold min-h-[48px] px-2 sm:px-4 py-3 text-xs sm:text-base flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                  <span className="text-lg sm:text-base">🎯</span>
                  <span className="text-xs sm:text-base leading-tight sm:leading-normal">Words</span>
                </TabsTrigger>
                <TabsTrigger value="favorites" className="clay-tab-mobile text-gray-700 font-semibold min-h-[48px] px-2 sm:px-4 py-3 text-xs sm:text-base flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                  <span className="text-lg sm:text-base">❤️</span>
                  <span className="text-xs sm:text-base leading-tight sm:leading-normal">Saved</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="story">
                <div className="space-y-6">
                  <UsageLimits onRefreshLimits={setRefreshLimits} />
                  
                  {showLimitPrompt && (
                    <LimitReachedPrompt onClose={() => setShowLimitPrompt(false)} />
                  )}
                  
                  <StoryForm onSubmit={handleSubmit} />
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full mt-2">
                        AI Content Notice
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <AIContentDisclaimer />
                    </DialogContent>
                  </Dialog>
                  
                  {story && (
                    <div id="story-section">
                      <StoryDisplay 
                        title={story.title} 
                        content={story.content}
                        readingLevel={story.readingLevel}
                        theme={story.theme}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="words">
                <SightWordManager words={words} setWords={setWords} isExternalLoading={wordsLoading} />
              </TabsContent>

              <TabsContent value="favorites">
                <FavoriteStories />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
