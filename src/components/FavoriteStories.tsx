import { useState } from "react";
import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar, BookOpen, Palette, Crown, Lock } from "lucide-react";
import { PremiumUpgradeModal } from "./LazyModals";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoriteStories } from "@/hooks/useFavoriteStories";

export const FavoriteStories = () => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isSubscribed, isCheckingSubscription } = useAuth();
  const { favorites, isLoading, deleteFavorite, isDeleting } = useFavoriteStories();

  const handleDelete = async (id: string) => {
    deleteFavorite(id);
  };

  if (isCheckingSubscription || isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12 px-6"
      >
        <div className="max-w-md mx-auto clay-card p-8">
          <Lock className="w-16 h-16 mx-auto mb-4 text-amber-500" />
          <h3 className="text-xl font-semibold text-gray-700 mb-3">Unlimited Feature</h3>
          <p className="text-gray-600 mb-6">
            Saving stories is an Unlimited feature. Upgrade to unlock unlimited story saving and access your favorite stories anytime!
          </p>
          <Button
            onClick={() => setShowUpgradeModal(true)}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold"
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Unlimited
          </Button>
          
          <PremiumUpgradeModal 
            open={showUpgradeModal}
            onOpenChange={setShowUpgradeModal}
            onSuccess={() => {}}
          />
        </div>
      </motion.div>
    );
  }

  if (favorites.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Favorite Stories Yet</h3>
        <p className="text-gray-500">
          Save stories you love by clicking the bookmark button when viewing a story!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
          Your Favorite Stories
        </h2>
        <p className="text-gray-600 mt-2">{favorites.length} saved stories</p>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        {favorites.map((story) => (
          <AccordionItem
            key={story.id}
            value={story.id}
            className="clay-card border-none"
          >
            <AccordionTrigger className="hover:no-underline p-6 pb-4">
              <div className="flex flex-col items-start text-left w-full">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {story.title}
                </h3>
                <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {story.reading_level}
                  </div>
                  <div className="flex items-center gap-1">
                    <Palette className="w-4 h-4" />
                    {story.theme}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(story.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="prose prose-lg max-w-none mb-4">
                {story.content.split("\n").map((paragraph, index) => (
                  <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(story.id)}
                  disabled={isDeleting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? 'Removing...' : 'Remove from Favorites'}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
};
