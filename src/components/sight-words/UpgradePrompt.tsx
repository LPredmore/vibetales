
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Sparkles } from "lucide-react";

interface UpgradePromptProps {
  onUpgrade: () => void;
  isProcessing: boolean;
}

export const UpgradePrompt = ({ onUpgrade, isProcessing }: UpgradePromptProps) => {
  const handleDirectUpgrade = () => {
    // Open direct Stripe payment link in a new tab
    window.open('https://buy.stripe.com/7sYaEZ7aF0sO4hp4P4fMA01', '_blank');
    // Call the original onUpgrade for any additional handling
    onUpgrade();
  };

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Crown className="h-5 w-5" />
          Upgrade to Premium
        </CardTitle>
        <CardDescription className="text-amber-700">
          You've reached the free limit of 3 sight words. Upgrade to add unlimited words!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleDirectUpgrade}
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold"
        >
          {isProcessing ? (
            <>
              <Sparkles className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Crown className="mr-2 h-4 w-4" />
              <span className="text-center">
                Upgrade to Premium for<br />
                Unlimited Stories
              </span>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
