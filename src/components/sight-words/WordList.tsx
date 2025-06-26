
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface WordListProps {
  words: string[];
  onDeleteWord: (index: number) => void;
}

export const WordList = ({ words, onDeleteWord }: WordListProps) => {
  const gradients = [
    "from-purple-400/80 to-pink-400/80",
    "from-blue-400/80 to-cyan-400/80",
    "from-green-400/80 to-teal-400/80",
    "from-yellow-400/80 to-orange-400/80",
    "from-rose-400/80 to-pink-400/80",
    "from-indigo-400/80 to-purple-400/80",
  ];

  return (
    <div className="space-y-3">
      {words.map((word, index) => (
        <div
          key={index}
          className={`flex items-center justify-between p-4 clay-card bg-gradient-to-r ${gradients[index % gradients.length]} backdrop-blur-sm`}
        >
          <span className="text-gray-800 font-semibold text-lg">{word}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteWord(index)}
            className="text-gray-600 hover:text-red-500 hover:bg-white/20 rounded-full h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};
