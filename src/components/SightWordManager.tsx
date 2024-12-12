import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { toast } from "sonner";

export const SightWordManager = () => {
  const [words, setWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState("");

  const handleAddWord = () => {
    if (!newWord.trim()) {
      toast.error("Please enter a word");
      return;
    }
    
    if (words.includes(newWord.trim())) {
      toast.error("This word is already in your list");
      return;
    }
    
    setWords([...words, newWord.trim()]);
    setNewWord("");
    toast.success("Word added successfully!");
  };

  const handleDeleteWord = (indexToDelete: number) => {
    setWords(words.filter((_, index) => index !== indexToDelete));
    toast.success("Word removed successfully!");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddWord();
    }
  };

  return (
    <div className="space-y-6 w-full max-w-md mx-auto animate-fade-in">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Manage Sight Words</h2>
        <p className="text-gray-600">Add words you want to practice in your stories.</p>
        
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