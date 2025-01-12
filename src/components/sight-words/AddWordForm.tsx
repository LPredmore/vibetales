import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddWordFormProps {
  onAddWord: (word: string) => void;
  disabled?: boolean;
}

export const AddWordForm = ({ onAddWord, disabled }: AddWordFormProps) => {
  const [newWord, setNewWord] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWord.trim()) {
      onAddWord(newWord.trim());
      setNewWord("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={newWord}
        onChange={(e) => setNewWord(e.target.value)}
        placeholder="Enter a new word..."
        className="flex-1"
        disabled={disabled}
      />
      <Button 
        type="submit"
        className="bg-story-coral hover:bg-story-yellow transition-colors duration-300"
        disabled={disabled}
      >
        Add Word
      </Button>
    </form>
  );
};