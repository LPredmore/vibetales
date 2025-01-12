import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface WordListProps {
  words: string[];
  onDeleteWord: (index: number) => void;
}

export const WordList = ({ words, onDeleteWord }: WordListProps) => {
  return (
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
            onClick={() => onDeleteWord(index)}
            className="text-gray-500 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};