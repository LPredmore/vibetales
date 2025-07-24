import { Switch } from "@/components/ui/switch";

interface StorySettingsProps {
  isDrSeussStyle: boolean;
  useSightWords: boolean;
  onDrSeussStyleChange: (checked: boolean) => void;
  onUseSightWordsChange: (checked: boolean) => void;
}

export const StorySettings = ({
  isDrSeussStyle,
  useSightWords,
  onDrSeussStyleChange,
  onUseSightWordsChange,
}: StorySettingsProps) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-8">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Dr. Seuss Writing Style
          </label>
          <div className="flex items-center">
            <Switch
              checked={isDrSeussStyle}
              onCheckedChange={onDrSeussStyleChange}
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
              onCheckedChange={onUseSightWordsChange}
              aria-label="Toggle use of sight words"
            />
          </div>
        </div>
      </div>
    </div>
  );
};