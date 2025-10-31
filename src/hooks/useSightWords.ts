import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SightWord } from '@/types/sightWords';
import { toast } from 'sonner';

export function useSightWords() {
  const [words, setWords] = useState<SightWord[]>([]);
  const [wordsLoading, setWordsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadWords = async () => {
      if (!user) {
        setWordsLoading(false);
        return;
      }

      try {
        setWordsLoading(true);
        const { data, error } = await supabase
          .from('sight_words')
          .select('words_objects')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data && data.words_objects) {
          // Convert JSONB objects to SightWord objects
          const sightWords: SightWord[] = data.words_objects.map((obj: any) => ({
            word: obj.word,
            active: obj.active
          }));
          setWords(sightWords);
        } else {
          // Create new record if none exists
          const { error: insertError } = await supabase
            .from('sight_words')
            .insert({ user_id: user.id, words_objects: [] });
            
          if (insertError) throw insertError;
          setWords([]);
        }
      } catch (err) {
        console.error('Error loading sight words:', err);
        toast.error("Failed to load sight words");
      } finally {
        setWordsLoading(false);
      }
    };

    loadWords();
  }, [user]);

  return {
    words,
    setWords,
    wordsLoading,
  };
}