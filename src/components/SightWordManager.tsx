import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface SightWordManagerProps {
  words: string[];
  setWords: (words: string[]) => void;
}

export const SightWordManager = ({ words, setWords }: SightWordManagerProps) => {
  const [newWord, setNewWord] = useState("");
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
        
        if (error) {
          console.error('Error loading sight words:', error);
          toast.error("Failed to load sight words");
          return;
        }
        
        if (data) {
          setWords(data.words || []);
        } else {
          const { error: insertError } = await supabase
            .from('sight_words')
            .insert({ user_id: user.id, words: [] });
            
          if (insertError) {
            console.error('Error initializing sight words:', insertError);
            toast.error("Failed to initialize sight words");
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        toast.error("An unexpected error occurred");
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
      
      if (data.url) {
        window.location.href = data.url;
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

      if (error) {
        console.error('Error saving sight words:', error);
        toast.error("Failed to save words");
        return;
      }
    } catch (err) {
      console.error('Unexpected error saving words:', err);
      toast.error("Failed to save words");
    }
  };

  const handleAddWord = async () => {
    if (!newWord.trim()) {
      toast.error("Please enter a word");
      return;
    }
    
    if (words.includes(newWord.trim())) {
      toast.error("This word is already in your list");
      return;
    }

    if (!isSubscribed && words.length >= 3) {
      toast.error("Free accounts are limited to 3 words. Please upgrade to add more words.");
      return;
    }
    
    const updatedWords = [...words, newWord.trim()];
    setWords(updatedWords);
    await saveWords(updatedWords);
    setNewWord("");
    toast.success("Word added successfully!");
  };

  const handleDeleteWord = async (indexToDelete: number) => {
    const updatedWords = words.filter((_, index) => index !== indexToDelete);
    setWords(updatedWords);
    await saveWords(updatedWords);
    toast.success("Word removed successfully!");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddWord();
    }
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
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <p className="text-yellow-700">
              You've reached the limit of 3 words for free accounts.
              <Button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="ml-2 bg-story-coral hover:bg-story-yellow transition-colors duration-300"
              >
                {isCheckingOut ? "Processing..." : "Upgrade to Unlimited"}
              </Button>
            </p>
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter a new word..."
            className="flex-1"
          />
          <Button 
            onClick={handleAddWord}
            className="bg-story-coral hover:bg-story-yellow transition-colors duration-300"
          >
            Add Word
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {words.map((word, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <span className="text-gray-700">{word}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteWord(index)}
              className="text-gray-500 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};