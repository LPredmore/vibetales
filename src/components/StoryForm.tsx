
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
import { LanguageSelector } from "./LanguageSelector";
import { ThemeLessonSelector } from "./ThemeLessonSelector";
import { StorySettings } from "./StorySettings";
import { useStoryForm } from "@/hooks/useStoryForm";

interface StoryFormProps {
  onSubmit: (data: StoryFormData) => void;
}

export interface StoryFormData {
  readingLevel: string;
  interestLevel: string;
  theme: string;
  language: string;
  length: string;
  themeLesson?: string;
  hasThemeLesson: boolean;
  isDrSeussStyle: boolean;
  useSightWords: boolean;
}

export const StoryForm = ({ onSubmit }: StoryFormProps) => {
  const {
    readingLevel,
    interestLevel,
    theme,
    language,
    themeLesson,
    hasThemeLesson,
    length,
    isDrSeussStyle,
    useSightWords,
    setReadingLevel,
    setInterestLevel,
    setTheme,
    handleLanguageChange,
    setThemeLesson,
    setHasThemeLesson,
    setLength,
    setIsDrSeussStyle,
    setUseSightWords,
    getFormData,
    isFormValid,
  } = useStoryForm();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = isFormValid();
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }
    
    onSubmit(getFormData());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 w-full max-w-md mx-auto animate-fade-in"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReadingLevelSelector
          readingLevel={readingLevel}
          onReadingLevelChange={setReadingLevel}
        />

        <InterestLevelSelector
          interestLevel={interestLevel}
          onInterestLevelChange={setInterestLevel}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ThemeSelector
          theme={theme}
          onThemeChange={setTheme}
        />

        <LanguageSelector
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      </div>

      <ThemeLessonSelector
        enabled={hasThemeLesson}
        themeLesson={themeLesson}
        onEnabledChange={setHasThemeLesson}
        onThemeLessonChange={setThemeLesson}
      />

      <StorySettings
        isDrSeussStyle={isDrSeussStyle}
        useSightWords={useSightWords}
        language={language}
        onDrSeussStyleChange={setIsDrSeussStyle}
        onUseSightWordsChange={setUseSightWords}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Story Length</label>
        <Select value={length} onValueChange={setLength}>
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
