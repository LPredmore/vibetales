import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { getPaymentPlatform } from "@/services/paymentService";

interface LimitReachedPromptProps {
  onClose: () => void;
}

export const LimitReachedPrompt = ({ onClose }: LimitReachedPromptProps) => {
  const platform = getPaymentPlatform();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="clay-card w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <CardTitle className="text-xl">Daily Limit Reached</CardTitle>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            You've reached your daily limit. Upgrade to Premium for unlimited access!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionPlans 
            onUpgrade={onClose}
            showRestore={platform.supportsIAP}
            onRestore={onClose}
          />
          <div className="mt-4 pt-4 border-t">
            <Button onClick={onClose} variant="ghost" className="w-full">Maybe Later</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};