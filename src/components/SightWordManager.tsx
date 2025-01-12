import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { WordList } from "./sight-words/WordList";
import { AddWordForm } from "./sight-words/AddWordForm";
import { UpgradePrompt } from "./sight-words/UpgradePrompt";

interface SightWordManagerProps {
  words: string[];
  setWords: (words: string[]) => void;
}

export const SightWordManager = ({ words, setWords }: SightWordManagerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-subscription');
        if (error) throw error;
        setIsSubscribed(data.subscribed);
      } catch (err) {
        console.error('Error checking subscription:', err);
        toast.error("Failed to check subscription status");
      }
    };

    if (user) {
      checkSubscription();
    }
  }, [user]);

  useEffect(() => {
    const loadWords = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('sight_words')
          .select('words')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setWords(data.words || []);
        } else {
          const { error: insertError } = await supabase
            .from('sight_words')
            .insert({ user_id: user.id, words: [] });
            
          if (insertError) throw insertError;
        }
      } catch (err) {
        console.error('Error loading sight words:', err);
        toast.error("Failed to load sight words");
      } finally {
        setIsLoading(false);
      }
    };

    loadWords();
  }, [user, setWords]);

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
      toast.error("Failed to start checkout process");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const saveWords = async (updatedWords: string[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('sight_words')
        .upsert({
          user_id: user.id,
          words: updatedWords
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error saving sight words:', err);
      toast.error("Failed to save words");
    }
  };

  const handleAddWord = async (newWord: string) => {
    if (words.includes(newWord)) {
      toast.error("This word is already in your list");
      return;
    }

    if (!isSubscribed && words.length >= 3) {
      toast.error("Free accounts are limited to 3 words. Please upgrade to add more words.");
      return;
    }
    
    const updatedWords = [...words, newWord];
    setWords(updatedWords);
    await saveWords(updatedWords);
    toast.success("Word added successfully!");
  };

  const handleDeleteWord = async (indexToDelete: number) => {
    const updatedWords = words.filter((_, index) => index !== indexToDelete);
    setWords(updatedWords);
    await saveWords(updatedWords);
    toast.success("Word removed successfully!");
  };

  if (isLoading) {
    return <div className="flex justify-center items-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6 w-full max-w-md mx-auto animate-fade-in">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Manage Sight Words</h2>
        <p className="text-gray-600">Add words you want to practice in your stories.</p>
        
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

      <WordList 
        words={words}
        onDeleteWord={handleDeleteWord}
      />
    </div>
  );
};