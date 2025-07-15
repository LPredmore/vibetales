import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const AIContentDisclaimer = () => {
  return (
    <Alert className="mb-6 border-blue-200 bg-blue-50 text-blue-800">
      <Info className="h-4 w-4" />
      <AlertDescription>
        <strong>AI-Generated Content Notice:</strong> Stories are created using artificial intelligence and may contain inaccuracies, 
        inappropriate content, or biased information. Please review all content before sharing with children. 
        You can report any problematic content using the "Report Content" button on each story.
      </AlertDescription>
    </Alert>
  );
};