
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown } from "lucide-react";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { getPaymentPlatform } from "@/services/paymentService";

interface UpgradePromptProps {
  onUpgrade: () => void;
  isProcessing: boolean;
}

export const UpgradePrompt = ({ onUpgrade, isProcessing }: UpgradePromptProps) => {
  const platform = getPaymentPlatform();

  return (
    <Card className="clay-card">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">Upgrade to Premium</CardTitle>
        </div>
        <CardDescription>
          You've reached the free limit. Upgrade for unlimited sight words!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SubscriptionPlans 
          onUpgrade={onUpgrade}
          showRestore={platform.supportsIAP}
        />
      </CardContent>
    </Card>
  );
};
