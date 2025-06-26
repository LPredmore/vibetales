
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
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Input
        value={newWord}
        onChange={(e) => setNewWord(e.target.value)}
        placeholder="Enter a new word..."
        className="flex-1 clay-input text-gray-700 placeholder:text-gray-500 font-medium"
        disabled={disabled}
      />
      <Button 
        type="submit"
        className="clay-button bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600"
        disabled={disabled}
      >
        ✨ Add Word
      </Button>
    </form>
  );
};
