import { useState, useEffect } from "react";
import { StoryForm, StoryFormData } from "@/components/StoryForm";
import { StoryDisplay } from "@/components/StoryDisplay";
import { SightWordManager } from "@/components/SightWordManager";
import { FavoriteStories } from "@/components/FavoriteStories";
import { UsageLimits } from "@/components/UsageLimits";
import { LimitReachedPrompt } from "@/components/LimitReachedPrompt";
import { UserReports } from "@/components/UserReports";
import { AIContentDisclaimer } from "@/components/AIContentDisclaimer";
import { SightWord } from "@/types/sightWords";
import { motion } from "framer-motion";
import { generateStory } from "@/services/openrouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [story, setStory] = useState<{
    title: string;
    content: string;
    readingLevel?: string;
    theme?: string;
  } | null>(null);
  const [words, setWords] = useState<SightWord[]>([]);
  const [showLimitPrompt, setShowLimitPrompt] = useState(false);
  const {
    user,
    logout
  } = useAuth();

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
    
    try {
      console.log("=== Starting Story Generation ===");
      console.log("Form data:", data);
      console.log("Active sight words:", activeWords.map(w => w.word));
      
      const toastId = toast.loading("Generating your story...");
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
      toast.success("Story generated successfully!");
      console.log("=== Story Generation Complete ===");
    } catch (error) {
      console.error("=== Story Generation Failed ===");
      console.error("Error:", error);
      
      if (error instanceof Error && error.message === 'LIMIT_REACHED') {
        setShowLimitPrompt(true);
        toast.error("Daily story limit reached");
      } else {
        toast.error("Failed to generate story. Please try again.");
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

          <Button 
            variant="outline" 
            onClick={logout} 
            className="clay-button min-h-[44px] ml-4"
          >
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="clay-card p-4 sm:p-8">
            <Tabs defaultValue="story" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6 sm:mb-8 bg-transparent p-2 gap-2 h-auto">
                <TabsTrigger value="story" className="clay-tab text-gray-700 font-semibold min-h-[44px] text-sm sm:text-base">
                  📚 Generate Story
                </TabsTrigger>
                <TabsTrigger value="words" className="clay-tab text-gray-700 font-semibold min-h-[44px] text-sm sm:text-base">
                  🎯 Sight Words
                </TabsTrigger>
                <TabsTrigger value="favorites" className="clay-tab text-gray-700 font-semibold min-h-[44px] text-sm sm:text-base">
                  ❤️ Favorites
                </TabsTrigger>
                <TabsTrigger value="reports" className="clay-tab text-gray-700 font-semibold min-h-[44px] text-sm sm:text-base">
                  🚩 Reports
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="story">
                <div className="space-y-6">
                  <AIContentDisclaimer />
                  <UsageLimits />
                  
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

              <TabsContent value="reports">
                <UserReports />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
