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
  onThemeChange: (value: string) => void;
}

export const ThemeSelector = ({
  theme,
  onThemeChange,
}: ThemeSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Genre</label>
      <Select value={theme} onValueChange={onThemeChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a genre" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fantasy">Fantasy Adventure</SelectItem>
          <SelectItem value="mystery">Mystery</SelectItem>
          <SelectItem value="fairytale">Fairy Tale</SelectItem>
          <SelectItem value="science">Science Fiction</SelectItem>
          <SelectItem value="nature">Nature & Animals</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};