import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  onUpgrade: () => void;
  isProcessing: boolean;
}

export const UpgradePrompt = ({ onUpgrade, isProcessing }: UpgradePromptProps) => {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
      <p className="text-yellow-700 flex items-center gap-2 flex-wrap">
        You've reached the limit of 3 words for free accounts.
        <Button
          onClick={onUpgrade}
          disabled={isProcessing}
          className="bg-story-coral hover:bg-story-yellow transition-colors duration-300"
        >
          {isProcessing ? "Processing..." : "Upgrade to Unlimited"}
        </Button>
      </p>
    </div>
  );
};