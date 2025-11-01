import { useState, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Flag, Crown } from "lucide-react";
import { useToastNotifications } from "@/hooks/useToastNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useUpgradeModal } from "@/contexts/UpgradeModalContext";
import { useFavoriteStories } from "@/hooks/useFavoriteStories";

// Lazy load Report Dialog
const ReportDialog = lazy(() => 
  import('./ReportDialog').then(module => ({ 
    default: module.ReportDialog 
  }))
);

interface StoryDisplayProps {
  title: string;
  content: string;
  readingLevel?: string;
  theme?: string;
}

export const StoryDisplay = ({ title, content, readingLevel, theme }: StoryDisplayProps) => {
  const [isSaved, setIsSaved] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const { isSubscribed, isCheckingSubscription, refreshSubscription } = useAuth();
  const { saveStory, isSaving } = useFavoriteStories();
  const { showUpgradeModal } = useUpgradeModal();
  const notifications = useToastNotifications();

  const handleSaveToFavorites = async () => {
    if (!readingLevel || !theme) {
      notifications.storyInfoIncomplete();
      return;
    }

    try {
      saveStory({
        title,
        content,
        reading_level: readingLevel,
        theme,
      });
      setIsSaved(true);
      notifications.storySaved();
      
      // Reset the saved state after 3 seconds
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error: any) {
      console.error("Error saving story:", error);
      if (error.message?.includes("duplicate key")) {
        notifications.storyAlreadySaved();
      } else {
        notifications.storySaveFailed();
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto mt-8 p-8 clay-card"
    >
      <div className="text-center mb-8">
        <div className="mb-4">
          <div className="text-center mb-4">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
              {title}
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto"></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {isCheckingSubscription ? (
              <div className="h-10 w-40 bg-gray-200 animate-pulse rounded-md" />
            ) : isSubscribed ? (
              <Button
                onClick={handleSaveToFavorites}
                disabled={isSaving || isSaved}
                variant="outline"
                className="clay-button w-full sm:w-auto"
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 mr-2 text-green-600" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save to Favorites"}
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => showUpgradeModal(refreshSubscription)}
                variant="outline"
                className="clay-button w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Unlimited
              </Button>
            )}
            
            <Button
              onClick={() => setShowReportDialog(true)}
              variant="outline"
              className="clay-button w-full sm:w-auto border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600"
            >
              <Flag className="w-4 h-4 mr-2" />
              Report Content
            </Button>
          </div>
        </div>
      </div>
      <div className="prose prose-lg max-w-none">
        {content.split("\n").map((paragraph, index) => (
          <p key={index} className="mb-4 text-gray-700 leading-relaxed text-lg font-medium">
            {paragraph}
          </p>
        ))}
      </div>

      {showReportDialog && (
        <Suspense fallback={null}>
          <ReportDialog
            open={showReportDialog}
            onOpenChange={setShowReportDialog}
            storyTitle={title}
            storyContent={content}
          />
        </Suspense>
      )}
    </motion.div>
  );
};
