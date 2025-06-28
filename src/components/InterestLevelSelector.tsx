
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InterestLevelSelectorProps {
  interestLevel: string;
  onInterestLevelChange: (value: string) => void;
}

export const InterestLevelSelector = ({
  interestLevel,
  onInterestLevelChange,
}: InterestLevelSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Interest Level</label>
      <Select value={interestLevel} onValueChange={onInterestLevelChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select interest level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="elementary">Elementary (ages 5-8)</SelectItem>
          <SelectItem value="middle-grade">Middle Grade (ages 9-12)</SelectItem>
          <SelectItem value="young-adult">Young Adult (ages 13+)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
