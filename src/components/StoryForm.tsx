import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

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
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Reading Level</label>
        <Select value={readingLevel} onValueChange={setReadingLevel}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select grade level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="k">Kindergarten</SelectItem>
            <SelectItem value="1">1st Grade</SelectItem>
            <SelectItem value="2">2nd Grade</SelectItem>
            <SelectItem value="3">3rd Grade</SelectItem>
            <SelectItem value="4">4th Grade</SelectItem>
            <SelectItem value="5">5th Grade</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Story Theme</label>
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fantasy">Fantasy Adventure</SelectItem>
            <SelectItem value="mystery">Mystery</SelectItem>
            <SelectItem value="fairytale">Fairy Tale</SelectItem>
            <SelectItem value="science">Science Fiction</SelectItem>
            <SelectItem value="nature">Nature & Animals</SelectItem>
            <SelectItem value="custom">Custom Theme/Topic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {theme === "custom" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Custom Theme or Topic
          </label>
          <Input
            type="text"
            placeholder="Enter a theme, topic, or lesson (e.g., 'dealing with a new sibling')"
            value={customTheme}
            onChange={(e) => setCustomTheme(e.target.value)}
            className="w-full"
          />
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Dr. Seuss Writing Style
          </label>
          <div className="flex items-center">
            <Switch
              checked={isDrSeussStyle}
              onCheckedChange={setIsDrSeussStyle}
              aria-label="Toggle Dr. Seuss writing style"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Use Sight Words
          </label>
          <div className="flex items-center">
            <Switch
              checked={useSightWords}
              onCheckedChange={setUseSightWords}
              aria-label="Toggle use of sight words"
            />
          </div>
        </div>
      </div>

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