import { Switch } from "@/components/ui/switch";
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
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Add Theme/Lesson
        </label>
        <div className="flex items-center">
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
            aria-label="Toggle theme/lesson"
          />
        </div>
      </div>
      
      {enabled && (
        <div className="space-y-2">
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