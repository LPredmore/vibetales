
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Flag } from "lucide-react";
import { toast } from "sonner";
import { saveFavoriteStory } from "@/services/favoriteStories";
import { ReportDialog } from "@/components/ReportDialog";

interface StoryDisplayProps {
  title: string;
  content: string;
  readingLevel?: string;
  theme?: string;
}

export const StoryDisplay = ({ title, content, readingLevel, theme }: StoryDisplayProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const handleSaveToFavorites = async () => {
    if (!readingLevel || !theme) {
      toast.error("Story information is incomplete");
      return;
    }

    setIsSaving(true);
    try {
      await saveFavoriteStory(title, content, readingLevel, theme);
      setIsSaved(true);
      toast.success("Story saved to favorites!");
      
      // Reset the saved state after 3 seconds
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error: any) {
      console.error("Error saving story:", error);
      if (error.message?.includes("duplicate key")) {
        toast.error("This story is already in your favorites");
      } else {
        toast.error("Failed to save story to favorites");
      }
    } finally {
      setIsSaving(false);
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
