import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReadingLevelSelectorProps {
  readingLevel: string;
  onReadingLevelChange: (value: string) => void;
}

export const ReadingLevelSelector = ({
  readingLevel,
  onReadingLevelChange,
}: ReadingLevelSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Reading Level</label>
      <Select value={readingLevel} onValueChange={onReadingLevelChange}>
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
          <SelectItem value="teen">Teen</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};