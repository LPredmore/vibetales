import { Switch } from "@/components/ui/switch";

interface StorySettingsProps {
  isDrSeussStyle: boolean;
  useSightWords: boolean;
  language: string;
  onDrSeussStyleChange: (checked: boolean) => void;
  onUseSightWordsChange: (checked: boolean) => void;
}

export const StorySettings = ({
  isDrSeussStyle,
  useSightWords,
  language,
  onDrSeussStyleChange,
  onUseSightWordsChange,
}: StorySettingsProps) => {
  const isDrSeussAvailable = language === 'english';
  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-8">
        {isDrSeussAvailable && (
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
        )}

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
      
      {!isDrSeussAvailable && (
        <p className="text-xs text-gray-500 text-center">
          Dr. Seuss writing style is only available for English stories
        </p>
      )}
    </div>
  );
};