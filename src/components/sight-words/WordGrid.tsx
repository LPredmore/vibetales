
import { SightWord } from "@/types/sightWords";
import { WordChip } from "./WordChip";

interface WordGridProps {
  words: SightWord[];
  onToggleWord: (index: number) => void;
  onDeleteWord: (index: number) => void;
}

export const WordGrid = ({ words, onToggleWord, onDeleteWord }: WordGridProps) => {
  // Sort words: active first, then inactive
  const sortedWords = words
    .map((word, index) => ({ ...word, originalIndex: index }))
    .sort((a, b) => {
      if (a.active && !b.active) return -1;
      if (!a.active && b.active) return 1;
      return 0;
    });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
      {sortedWords.map(({ word, active, originalIndex }) => (
        <WordChip
          key={`${word}-${originalIndex}`}
          word={word}
          active={active}
          onToggle={() => onToggleWord(originalIndex)}
          onDelete={() => onDeleteWord(originalIndex)}
        />
      ))}
    </div>
  );
};
