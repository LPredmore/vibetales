import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface ThemeSelectorProps {
  theme: string;
  customTheme: string;
  onThemeChange: (value: string) => void;
  onCustomThemeChange: (value: string) => void;
}

export const ThemeSelector = ({
  theme,
  customTheme,
  onThemeChange,
  onCustomThemeChange,
}: ThemeSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Story Theme</label>
      <Select value={theme} onValueChange={onThemeChange}>
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

      {theme === "custom" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Custom Theme or Topic
          </label>
          <Input
            type="text"
            placeholder="Enter a theme, topic, or lesson (e.g., 'dealing with a new sibling')"
            value={customTheme}
            onChange={(e) => onCustomThemeChange(e.target.value)}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};