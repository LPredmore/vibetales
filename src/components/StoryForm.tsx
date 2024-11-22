import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface StoryFormProps {
  onSubmit: (data: StoryFormData) => void;
}

export interface StoryFormData {
  keywords: string[];
  readingLevel: string;
  theme: string;
}

export const StoryForm = ({ onSubmit }: StoryFormProps) => {
  const [keywords, setKeywords] = useState("");
  const [readingLevel, setReadingLevel] = useState("");
  const [theme, setTheme] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords || !readingLevel || !theme) {
      toast.error("Please fill in all fields");
      return;
    }
    onSubmit({
      keywords: keywords.split(",").map((k) => k.trim()),
      readingLevel,
      theme,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 w-full max-w-md mx-auto animate-fade-in"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Enter Keywords (separated by commas)
        </label>
        <Input
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="dragon, princess, castle..."
          className="w-full px-4 py-2 transition-all duration-200 ease-in-out border-gray-200 rounded-lg focus:border-story-coral focus:ring-story-coral"
        />
      </div>

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
            <SelectItem value="drseuss">Dr. Seuss Style</SelectItem>
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