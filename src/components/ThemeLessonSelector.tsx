import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface ThemeLessonSelectorProps {
  enabled: boolean;
  themeLesson: string;
  onEnabledChange: (enabled: boolean) => void;
  onThemeLessonChange: (value: string) => void;
}

export const ThemeLessonSelector = ({
  enabled,
  themeLesson,
  onEnabledChange,
  onThemeLessonChange,
}: ThemeLessonSelectorProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="theme-lesson-enabled"
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
        <label 
          htmlFor="theme-lesson-enabled" 
          className="text-sm font-medium text-gray-700 cursor-pointer"
        >
          Add Theme/Lesson
        </label>
      </div>
      
      {enabled && (
        <div className="space-y-2 pl-6">
          <label className="text-sm font-medium text-gray-600">
            Theme or Lesson Focus
          </label>
          <Input
            type="text"
            placeholder="Enter a theme, lesson, or topic (e.g., 'sharing with friends', 'overcoming fears', 'learning about colors')"
            value={themeLesson}
            onChange={(e) => onThemeLessonChange(e.target.value)}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};