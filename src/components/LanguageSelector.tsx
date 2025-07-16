import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LanguageSelectorProps {
  language: string;
  onLanguageChange: (value: string) => void;
}

export const LanguageSelector = ({
  language,
  onLanguageChange,
}: LanguageSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Language</label>
      <Select value={language} onValueChange={onLanguageChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="english">English</SelectItem>
          <SelectItem value="spanish">Spanish (Español)</SelectItem>
          <SelectItem value="french">French (Français)</SelectItem>
          <SelectItem value="german">German (Deutsch)</SelectItem>
          <SelectItem value="italian">Italian (Italiano)</SelectItem>
          <SelectItem value="portuguese">Portuguese (Português)</SelectItem>
          <SelectItem value="dutch">Dutch (Nederlands)</SelectItem>
          <SelectItem value="russian">Russian (Русский)</SelectItem>
          <SelectItem value="chinese">Chinese (中文)</SelectItem>
          <SelectItem value="japanese">Japanese (日本語)</SelectItem>
          <SelectItem value="korean">Korean (한국어)</SelectItem>
          <SelectItem value="arabic">Arabic (العربية)</SelectItem>
          <SelectItem value="hindi">Hindi (हिंदी)</SelectItem>
          <SelectItem value="polish">Polish (Polski)</SelectItem>
          <SelectItem value="swedish">Swedish (Svenska)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};