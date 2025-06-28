
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ReadingLevelSelector } from "./ReadingLevelSelector";
import { InterestLevelSelector } from "./InterestLevelSelector";
import { ThemeSelector } from "./ThemeSelector";
import { StorySettings } from "./StorySettings";

interface StoryFormProps {
  onSubmit: (data: StoryFormData) => void;
}

export interface StoryFormData {
  readingLevel: string;
  interestLevel: string;
  theme: string;
  length: string;
  customTheme?: string;
  isDrSeussStyle: boolean;
  useSightWords: boolean;
}

export const StoryForm = ({ onSubmit }: StoryFormProps) => {
  const [readingLevel, setReadingLevel] = useState("");
  const [interestLevel, setInterestLevel] = useState("");
  const [theme, setTheme] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [length, setLength] = useState("");
  const [isDrSeussStyle, setIsDrSeussStyle] = useState(false);
  const [useSightWords, setUseSightWords] = useState(true);

  // Load saved values from localStorage on component mount
  useEffect(() => {
    const savedReadingLevel = localStorage.getItem('storyForm_readingLevel');
    const savedInterestLevel = localStorage.getItem('storyForm_interestLevel');
    const savedTheme = localStorage.getItem('storyForm_theme');
    const savedCustomTheme = localStorage.getItem('storyForm_customTheme');
    const savedLength = localStorage.getItem('storyForm_length');
    const savedIsDrSeussStyle = localStorage.getItem('storyForm_isDrSeussStyle');
    const savedUseSightWords = localStorage.getItem('storyForm_useSightWords');

    if (savedReadingLevel) setReadingLevel(savedReadingLevel);
    if (savedInterestLevel) setInterestLevel(savedInterestLevel);
    if (savedTheme) setTheme(savedTheme);
    if (savedCustomTheme) setCustomTheme(savedCustomTheme);
    if (savedLength) setLength(savedLength);
    if (savedIsDrSeussStyle) setIsDrSeussStyle(savedIsDrSeussStyle === 'true');
    if (savedUseSightWords) setUseSightWords(savedUseSightWords === 'true');
  }, []);

  // Save values to localStorage when they change
  const handleReadingLevelChange = (value: string) => {
    setReadingLevel(value);
    localStorage.setItem('storyForm_readingLevel', value);
  };

  const handleInterestLevelChange = (value: string) => {
    setInterestLevel(value);
    localStorage.setItem('storyForm_interestLevel', value);
  };

  const handleThemeChange = (value: string) => {
    setTheme(value);
    localStorage.setItem('storyForm_theme', value);
  };

  const handleCustomThemeChange = (value: string) => {
    setCustomTheme(value);
    localStorage.setItem('storyForm_customTheme', value);
  };

  const handleLengthChange = (value: string) => {
    setLength(value);
    localStorage.setItem('storyForm_length', value);
  };

  const handleDrSeussStyleChange = (value: boolean) => {
    setIsDrSeussStyle(value);
    localStorage.setItem('storyForm_isDrSeussStyle', value.toString());
  };

  const handleUseSightWordsChange = (value: boolean) => {
    setUseSightWords(value);
    localStorage.setItem('storyForm_useSightWords', value.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readingLevel || !interestLevel || !length) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (theme === "custom" && !customTheme.trim()) {
      toast.error("Please enter a custom theme or select a predefined one");
      return;
    }
    onSubmit({
      readingLevel,
      interestLevel,
      theme: theme === "custom" ? customTheme : theme,
      length,
      customTheme: theme === "custom" ? customTheme : undefined,
      isDrSeussStyle,
      useSightWords,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 w-full max-w-md mx-auto animate-fade-in"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReadingLevelSelector
          readingLevel={readingLevel}
          onReadingLevelChange={handleReadingLevelChange}
        />

        <InterestLevelSelector
          interestLevel={interestLevel}
          onInterestLevelChange={handleInterestLevelChange}
        />
      </div>

      <ThemeSelector
        theme={theme}
        customTheme={customTheme}
        onThemeChange={handleThemeChange}
        onCustomThemeChange={handleCustomThemeChange}
      />

      <StorySettings
        isDrSeussStyle={isDrSeussStyle}
        useSightWords={useSightWords}
        onDrSeussStyleChange={handleDrSeussStyleChange}
        onUseSightWordsChange={handleUseSightWordsChange}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Story Length</label>
        <Select value={length} onValueChange={handleLengthChange}>
          <SelectTrigger className="w-full clay-input">
            <SelectValue placeholder="Select story length" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="short">Short</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="long">Long</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className="w-full clay-button bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 min-h-[48px] text-base"
      >
        Generate Story
      </Button>
    </form>
  );
};
