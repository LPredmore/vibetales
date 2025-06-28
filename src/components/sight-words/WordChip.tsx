
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WordChipProps {
  word: string;
  active: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export const WordChip = ({ word, active, onToggle, onDelete }: WordChipProps) => {
  return (
    <div className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-all ${
      active 
        ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      <Badge 
        variant={active ? "default" : "secondary"}
        className={`font-medium ${
          active 
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
            : 'bg-gray-300 text-gray-600'
        }`}
      >
        {word}
      </Badge>
      
      <div className="flex items-center gap-2">
        <Switch
          checked={active}
          onCheckedChange={onToggle}
          aria-label={`Toggle ${word}`}
        />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
