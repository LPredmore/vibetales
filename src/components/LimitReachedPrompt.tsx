import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Clock, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getPaymentPlatform, purchasePremium, handleRestorePurchases } from "@/services/paymentService";

interface LimitReachedPromptProps {
  onClose: () => void;
}

export const LimitReachedPrompt = ({ onClose }: LimitReachedPromptProps) => {
  const { user } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const platform = getPaymentPlatform();

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please log in to upgrade");
      return;
    }

    setIsUpgrading(true);
    try {
      if (platform.supportsIAP) {
        const success = await purchasePremium();
        if (success) {
          toast.success("Successfully upgraded to Premium!");
          onClose();
        }
      } else {
        window.open('https://buy.stripe.com/7sYaEZ7aF0sO4hp4P4fMA01', '_blank');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      toast.error("Purchase failed. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleRestore = async () => {
    if (!platform.supportsIAP) return;
    
    setIsRestoring(true);
    try {
      const success = await handleRestorePurchases();
      if (success) {
        toast.success("Purchases restored successfully!");
        onClose();
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
    <Card className="clay-card border-red-200 bg-gradient-to-r from-red-50 to-pink-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-800">
          <Clock className="h-5 w-5" />
          Daily Limit Reached
        </CardTitle>
        <CardDescription className="text-red-700">
          You've used your daily story for today. Upgrade to premium for unlimited stories or wait until tomorrow (midnight CST) for your limit to reset.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-3">
          <Button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold"
          >
            <Crown className="mr-2 h-4 w-4" />
            <span className="text-center">
              {platform.supportsIAP ? "Upgrade via App Store" : "Upgrade to Premium for"}<br />
              {platform.supportsIAP ? "Premium Access" : "Unlimited Stories"}
            </span>
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="clay-button"
          >
            Maybe Later
          </Button>
        </div>

        {platform.supportsIAP && (
          <div className="flex justify-center">
            <Button
              onClick={handleRestore}
              disabled={isRestoring}
              variant="ghost"
              size="sm"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore Purchases
            </Button>
          </div>
        )}

        {platform.supportsIAP && (
          <p className="text-xs text-muted-foreground text-center">
            Subscription automatically renews unless cancelled. Cancel anytime in App Store settings.
          </p>
        )}
      </CardContent>
    </Card>
  );
};