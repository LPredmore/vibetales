
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  onUpgrade: () => void;
  isProcessing: boolean;
}

export const UpgradePrompt = ({ onUpgrade, isProcessing }: UpgradePromptProps) => {
  return (
    <div className="clay-card bg-gradient-to-r from-yellow-200/80 to-orange-200/80 backdrop-blur-sm p-6 rounded-3xl border-l-4 border-yellow-400">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-2xl">🔒</span>
        <p className="text-gray-700 font-medium">
          You've reached the limit of 3 words for free accounts.
        </p>
        <Button
          onClick={onUpgrade}
          disabled={isProcessing}
          className="clay-button bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold hover:from-yellow-600 hover:to-orange-600"
        >
          {isProcessing ? "✨ Processing..." : "🚀 Upgrade to Unlimited"}
        </Button>
      </div>
    </div>
  );
};
