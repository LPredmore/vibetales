import { useState, useEffect } from "react";
import { StoryForm, StoryFormData } from "@/components/StoryForm";
import { StoryDisplay } from "@/components/StoryDisplay";
import { SightWordManager } from "@/components/SightWordManager";
import { FavoriteStories } from "@/components/FavoriteStories";
import { UsageLimits } from "@/components/UsageLimits";
import { LimitReachedPrompt } from "@/components/LimitReachedPrompt";


import { SightWord } from "@/types/sightWords";
import { motion } from "framer-motion";
import { generateStory } from "@/services/openrouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { UserMenu } from "@/components/UserMenu";

const Index = () => {
  const [story, setStory] = useState<{
    title: string;
    content: string;
    readingLevel?: string;
    theme?: string;
  } | null>(null);
  const [words, setWords] = useState<SightWord[]>([]);
  const [showLimitPrompt, setShowLimitPrompt] = useState(false);
  const [refreshLimits, setRefreshLimits] = useState<(() => Promise<void>) | null>(null);
  const { user } = useAuth();

  // Handle Stripe payment completion
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    if (success === 'true') {
      toast.success("Payment successful! Your premium subscription is now active.");
      
      // Refresh subscription status
      if (user) {
        supabase.functions.invoke('check-subscription', {
          body: { userId: user.id }
        }).then(({ data, error }) => {
          if (!error && data) {
            toast.success("Premium features are now available!");
          }
        }).catch(() => {
          toast.info("Your payment was successful. Premium features may take a moment to activate.");
        });
      }
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (canceled === 'true') {
      toast.error("Payment was canceled. You can try again anytime.");
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  const handleSubmit = async (data: StoryFormData) => {
    const activeWords = words.filter(word => word.active);
    
    if (data.useSightWords && activeWords.length === 0) {
      toast.error("Please add and activate some sight words before generating a story");
      return;
    }
    
    let toastId: string | number | undefined;
    
    try {
      console.log("=== Starting Story Generation ===");
      console.log("Form data:", data);
      console.log("Active sight words:", activeWords.map(w => w.word));
      
      toastId = toast.loading("Generating your story...");
      const activeWordStrings = activeWords.map(word => word.word);
      
      const generatedStory = await generateStory({
        ...data,
        keywords: data.useSightWords ? activeWordStrings : []
      });
      
      toast.dismiss(toastId);
      
      setStory({
        ...generatedStory,
        readingLevel: data.readingLevel,
        theme: data.theme
      });
      setShowLimitPrompt(false); // Hide limit prompt if it was showing
      
      // Refresh usage limits after successful story generation
      if (refreshLimits && typeof refreshLimits === 'function') {
        try {
          await refreshLimits();
        } catch (refreshError) {
          console.warn("Failed to refresh usage limits:", refreshError);
          // Don't affect the main success flow
        }
      }
      
      toast.success("Story generated successfully!");
      console.log("=== Story Generation Complete ===");
    } catch (error) {
      console.error("=== Story Generation Failed ===");
      console.error("Error:", error);
      
      // Always dismiss the loading toast first
      if (toastId) {
        toast.dismiss(toastId);
      }
      
      if (error instanceof Error && error.message === 'LIMIT_REACHED') {
        setShowLimitPrompt(true);
        toast.info("You have reached your limit today. Wait until tomorrow or upgrade to premium for unlimited stories.");
      } else {
        // Only show error if not a domain-related issue
        const isDomainError = error instanceof Error && 
          (error.message?.includes('unexpected URL') || error.message?.includes('allowedOrigins'));
        
        if (!isDomainError) {
          toast.error("Failed to generate story. Please try again.");
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
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
                src="/lovable-uploads/79708384-34ad-45b6-af27-6fb7e037e385.png" 
                alt="StoryBridge Logo" 
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
                  
                  {story && (
                    <StoryDisplay 
                      title={story.title} 
                      content={story.content}
                      readingLevel={story.readingLevel}
                      theme={story.theme}
                    />
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="words">
                <SightWordManager words={words} setWords={setWords} />
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
