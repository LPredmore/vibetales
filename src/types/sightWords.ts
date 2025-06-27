
export interface SightWord {
  word: string;
  active: boolean;
}

export interface SightWordManagerProps {
  words: SightWord[];
  setWords: (words: SightWord[]) => void;
}
