import { useState, useCallback } from 'react';
import { generateStory } from '@/services/openrouter';
import { StoryFormData } from '@/components/StoryForm';
import { SightWord } from '@/types/sightWords';
import { toast } from 'sonner';

interface Story {
  title: string;
  content: string;
  readingLevel?: string;
  theme?: string;
}

export function useStoryGeneration() {
  const [story, setStory] = useState<Story | null>(null);
  const [showLimitPrompt, setShowLimitPrompt] = useState(false);

  const handleStoryGeneration = useCallback(async (
    data: StoryFormData,
    words: SightWord[],
    wordsLoading: boolean,
    refreshLimits?: (() => Promise<void>) | null
  ) => {
    // Check if words are still loading
    if (wordsLoading) {
      toast.error("Please wait for sight words to load");
      return;
    }
    
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
      
      // Auto-scroll to story section when generated (subtle, non-blocking)
      setTimeout(() => {
        const storySection = document.getElementById('story-section');
        if (storySection) {
          storySection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 200);
      
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
        toast.error("Daily limit reached. Upgrade to unlimited or wait until tomorrow (midnight CST).");
      } else if (error instanceof Error && error.message.includes('429')) {
        // Specific handling for rate limit errors from edge function
        setShowLimitPrompt(true);
        toast.error("You've reached your daily story limit. Upgrade for unlimited stories!");
      } else {
        // Only show error if not a domain-related issue
        const isDomainError = error instanceof Error && 
          (error.message?.includes('unexpected URL') || error.message?.includes('allowedOrigins'));
        
        if (!isDomainError) {
          toast.error("Failed to generate story. Please try again.");
        }
      }
    }
  }, []);

  return {
    story,
    showLimitPrompt,
    setShowLimitPrompt,
    handleStoryGeneration,
  };
}