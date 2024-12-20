import { useState } from "react";
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
import { ThemeSelector } from "./ThemeSelector";
import { StorySettings } from "./StorySettings";

interface StoryFormProps {
  onSubmit: (data: StoryFormData) => void;
}

export interface StoryFormData {
  readingLevel: string;
  theme: string;
  length: string;
  customTheme?: string;
  isDrSeussStyle: boolean;
  useSightWords: boolean;
}

export const StoryForm = ({ onSubmit }: StoryFormProps) => {
  const [readingLevel, setReadingLevel] = useState("");
  const [theme, setTheme] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [length, setLength] = useState("");
  const [isDrSeussStyle, setIsDrSeussStyle] = useState(false);
  const [useSightWords, setUseSightWords] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readingLevel || !length) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (theme === "custom" && !customTheme.trim()) {
      toast.error("Please enter a custom theme or select a predefined one");
      return;
    }
    onSubmit({
      readingLevel,
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
      <ReadingLevelSelector
        readingLevel={readingLevel}
        onReadingLevelChange={setReadingLevel}
      />

      <ThemeSelector
        theme={theme}
        customTheme={customTheme}
        onThemeChange={setTheme}
        onCustomThemeChange={setCustomTheme}
      />

      <StorySettings
        isDrSeussStyle={isDrSeussStyle}
        useSightWords={useSightWords}
        onDrSeussStyleChange={setIsDrSeussStyle}
        onUseSightWordsChange={setUseSightWords}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Story Length</label>
        <Select value={length} onValueChange={setLength}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select story length" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="short">Short (~100 words)</SelectItem>
            <SelectItem value="medium">Medium (~500 words)</SelectItem>
            <SelectItem value="long">Long (~1000 words)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className="w-full bg-story-coral hover:bg-story-yellow transition-colors duration-300"
      >
        Generate Story
      </Button>
    </form>
  );
};