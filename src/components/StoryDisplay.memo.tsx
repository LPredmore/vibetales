import { useState, memo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Flag, Crown } from "lucide-react";
import { toast } from "sonner";
import { ReportDialog, PremiumUpgradeModal } from "./LazyModals";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoriteStories } from "@/hooks/useFavoriteStories";

interface StoryDisplayProps {
  title: string;
  content: string;
  readingLevel?: string;
  theme?: string;
}

const StoryDisplayComponent = ({ title, content, readingLevel, theme }: StoryDisplayProps) => {
  const [isSaved, setIsSaved] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isSubscribed, isCheckingSubscription } = useAuth();
  const { saveFavorite, isSaving } = useFavoriteStories();

  const handleSaveToFavorites = async () => {
    if (!readingLevel || !theme) {
      toast.error("Story information is incomplete");
      return;
    }

    saveFavorite({ title, content, readingLevel, theme });
    setIsSaved(true);
    
    // Reset the saved state after 3 seconds
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleUpgradeClick = () => {
    setShowUpgradeModal(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="clay-card p-6 sm:p-8"
    >
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">{title}</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            {isCheckingSubscription ? (
              <Button
                variant="outline"
                className="clay-button w-full sm:w-auto"
                disabled
              >
                <Bookmark className="w-4 h-4 mr-2" />
                Checking...
              </Button>
            ) : isSubscribed ? (
              <Button
                onClick={handleSaveToFavorites}
                disabled={isSaving || isSaved}
                variant="outline"
                className={`clay-button w-full sm:w-auto ${
                  isSaved ? "bg-green-50 border-green-300 text-green-700" : ""
                }`}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 mr-2" />
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
                onClick={handleUpgradeClick}
                variant="outline"
                className="clay-button w-full sm:w-auto border-amber-300 hover:bg-amber-50 text-amber-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Save Stories
              </Button>
            )}
            <PremiumUpgradeModal 
              open={showUpgradeModal}
              onOpenChange={setShowUpgradeModal}
              onSuccess={() => {}}
            />
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

      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        storyTitle={title}
        storyContent={content}
      />
    </motion.div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const StoryDisplay = memo(StoryDisplayComponent, (prevProps, nextProps) => {
  // Only re-render if title or content changes
  return prevProps.title === nextProps.title && 
         prevProps.content === nextProps.content &&
         prevProps.readingLevel === nextProps.readingLevel &&
         prevProps.theme === nextProps.theme;
});

StoryDisplay.displayName = 'StoryDisplay';
