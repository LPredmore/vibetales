import { useState, useEffect } from "react";
import { useToastNotifications } from "@/hooks/useToastNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SightWord } from "@/types/sightWords";
import { WordGrid } from "./sight-words/WordGrid";
import { AddWordForm } from "./sight-words/AddWordForm";
import { BulkActions } from "./sight-words/BulkActions";
import { UpgradePrompt } from "./sight-words/UpgradePrompt";

interface SightWordManagerProps {
  words: SightWord[];
  setWords: (words: SightWord[]) => void;
  isExternalLoading?: boolean;
}

export const SightWordManager = ({ words, setWords, isExternalLoading = false }: SightWordManagerProps) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { user } = useAuth();
  const notifications = useToastNotifications();

  const activeCount = words.filter(word => word.active).length;
  const totalCount = words.length;

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-subscription');
        if (error) {
          console.error('Subscription check error:', error);
          // Don't show error toast for subscription checks - just default to unsubscribed
          setIsSubscribed(false);
          return;
        }
        setIsSubscribed(data?.subscribed || false);
      } catch (err) {
        console.error('Error checking subscription:', err);
        // Silently handle subscription check errors and default to unsubscribed
        setIsSubscribed(false);
      }
    };

    if (user) {
      checkSubscription();
    }
  }, [user]);

  // Words are now loaded by parent component, so we don't need to load them here

  const handleCheckout = async () => {
    try {
      setIsCheckingOut(true);
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      notifications.checkoutFailed();
    } finally {
      setIsCheckingOut(false);
    }
  };

  const saveWords = async (updatedWords: SightWord[]) => {
    if (!user) return;

    try {
      // Convert SightWord objects to JSONB format
      const wordsObjects = updatedWords.map(word => ({
        word: word.word,
        active: word.active
      }));

      const { error } = await supabase
        .from('sight_words')
        .upsert({
          user_id: user.id,
          words_objects: wordsObjects
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error saving sight words:', err);
      notifications.wordsSaveFailed();
    }
  };

  const handleAddWord = async (newWord: string) => {
    if (words.some(word => word.word.toLowerCase() === newWord.toLowerCase())) {
      notifications.wordDuplicate();
      return;
    }

    if (!isSubscribed && words.length >= 3) {
      notifications.wordLimitReached();
      return;
    }
    
    const updatedWords = [...words, { word: newWord, active: true }];
    setWords(updatedWords);
    await saveWords(updatedWords);
    notifications.wordAdded();
  };

  const handleToggleWord = async (index: number) => {
    const updatedWords = words.map((word, i) => 
      i === index ? { ...word, active: !word.active } : word
    );
    setWords(updatedWords);
    await saveWords(updatedWords);
    notifications.wordToggled(updatedWords[index].active);
  };

  const handleDeleteWord = async (indexToDelete: number) => {
    const updatedWords = words.filter((_, index) => index !== indexToDelete);
    setWords(updatedWords);
    await saveWords(updatedWords);
    notifications.wordDeleted();
  };

  const handleSelectAll = async () => {
    const updatedWords = words.map(word => ({ ...word, active: true }));
    setWords(updatedWords);
    await saveWords(updatedWords);
    notifications.allWordsActivated();
  };

  const handleDeselectAll = async () => {
    const updatedWords = words.map(word => ({ ...word, active: false }));
    setWords(updatedWords);
    await saveWords(updatedWords);
    notifications.allWordsDeactivated();
  };

  if (isExternalLoading) {
    return <div className="flex justify-center items-center p-8">Loading sight words...</div>;
  }

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto animate-fade-in">
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 text-center sm:text-left">
          Manage Sight Words
        </h2>
        <p className="text-gray-600 text-center sm:text-left mobile-text">
          Add words and toggle which ones to focus on in your stories.
        </p>
        
        {!isSubscribed && words.length >= 3 && (
          <UpgradePrompt 
            onUpgrade={handleCheckout}
            isProcessing={isCheckingOut}
          />
        )}
        
        <AddWordForm 
          onAddWord={handleAddWord}
          disabled={!isSubscribed && words.length >= 3}
        />
      </div>

      {totalCount > 0 && (
        <>
          <BulkActions
            activeCount={activeCount}
            totalCount={totalCount}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
          
          <WordGrid
            words={words}
            onToggleWord={handleToggleWord}
            onDeleteWord={handleDeleteWord}
          />
        </>
      )}
      
      {totalCount === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No sight words added yet. Add some words to get started!</p>
        </div>
      )}
    </div>
  );
};
