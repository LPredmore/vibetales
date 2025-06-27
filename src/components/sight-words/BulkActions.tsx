
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BulkActionsProps {
  activeCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const BulkActions = ({ 
  activeCount, 
  totalCount, 
  onSelectAll, 
  onDeselectAll 
}: BulkActionsProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-medium">
          {activeCount} of {totalCount} active
        </Badge>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectAll}
          disabled={activeCount === totalCount}
          className="text-xs"
        >
          Select All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDeselectAll}
          disabled={activeCount === 0}
          className="text-xs"
        >
          Deselect All
        </Button>
      </div>
    </div>
  );
};
