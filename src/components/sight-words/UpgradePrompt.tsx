
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Sparkles, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getPaymentPlatform, purchasePremium, handleRestorePurchases } from "@/services/paymentService";

interface UpgradePromptProps {
  onUpgrade: () => void;
  isProcessing: boolean;
}

export const UpgradePrompt = ({ onUpgrade, isProcessing }: UpgradePromptProps) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const platform = getPaymentPlatform();

  const handleUpgradeClick = async () => {
    try {
      if (platform.supportsIAP) {
        // Use In-App Purchase for native platforms
        const success = await purchasePremium();
        if (success) {
          toast.success("Successfully upgraded to Premium!");
          onUpgrade();
        }
      } else {
        // Use Stripe for web platform
        window.open('https://buy.stripe.com/7sYaEZ7aF0sO4hp4P4fMA01', '_blank');
        onUpgrade();
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      toast.error("Purchase failed. Please try again.");
    }
  };

  const handleRestore = async () => {
    if (!platform.supportsIAP) return;
    
    setIsRestoring(true);
    try {
      const success = await handleRestorePurchases();
      if (success) {
        toast.success("Purchases restored successfully!");
        onUpgrade();
      } else {
        toast.error("No previous purchases found.");
      }
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error("Failed to restore purchases.");
    } finally {
      setIsRestoring(false);
    }
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
      <CardContent className="space-y-3">
        <Button
          onClick={handleUpgradeClick}
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
                {platform.supportsIAP ? "Upgrade via App Store" : "Upgrade to Premium for"}<br />
                {platform.supportsIAP ? "Premium Access" : "Unlimited Stories"}
              </span>
            </>
          )}
        </Button>
        
        {platform.supportsIAP && (
          <Button
            onClick={handleRestore}
            disabled={isRestoring}
            variant="outline"
            className="w-full"
          >
            {isRestoring ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore Purchases
              </>
            )}
          </Button>
        )}

        {platform.supportsIAP && (
          <p className="text-xs text-muted-foreground text-center">
            Subscription automatically renews unless cancelled. Cancel anytime in App Store settings. 
            Terms apply.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
