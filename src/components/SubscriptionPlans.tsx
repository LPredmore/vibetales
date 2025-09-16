import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Crown } from "lucide-react";
import { SubscriptionPricing } from "./SubscriptionPricing";
import { LegalFooter } from "./LegalFooter";
import { purchasePremium } from "@/services/paymentService";
import { toast } from "sonner";

interface SubscriptionPlansProps {
  onUpgrade?: () => void;
  showRestore?: boolean;
  onRestore?: () => void;
}

export const SubscriptionPlans = ({ 
  onUpgrade, 
  showRestore = false, 
  onRestore 
}: SubscriptionPlansProps) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      const success = await purchasePremium(selectedPlan);
      if (success) {
        toast.success("Successfully upgraded to Premium!");
        onUpgrade?.();
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      toast.error("Purchase failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const features = [
    "Unlimited story generation",
    "Advanced reading levels",
    "Custom sight words",
    "Export stories as PDF",
    "Priority support"
  ];

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Plan Selection */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setSelectedPlan('monthly')}
          className={`p-3 rounded-lg text-sm font-medium transition-all ${
            selectedPlan === 'monthly'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setSelectedPlan('annual')}
          className={`p-3 rounded-lg text-sm font-medium transition-all relative ${
            selectedPlan === 'annual'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Annual
          <Crown className="absolute -top-1 -right-1 h-4 w-4 text-primary" />
        </button>
      </div>

      {/* Selected Plan Card */}
      <Card className="clay-card p-6 text-center space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">
            Premium {selectedPlan === 'annual' ? 'Annual' : 'Monthly'}
          </h3>
          <SubscriptionPricing planType={selectedPlan} />
        </div>

        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3 text-sm">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-muted-foreground">{feature}</span>
            </div>
          ))}
        </div>

        <Button
          onClick={handleUpgrade}
          disabled={isProcessing}
          className="w-full clay-button"
          size="lg"
        >
          {isProcessing ? "Processing..." : `Upgrade to ${selectedPlan === 'annual' ? 'Annual' : 'Monthly'}`}
        </Button>

        {showRestore && (
          <Button
            onClick={onRestore}
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
          >
            Restore Purchases
          </Button>
        )}
      </Card>

      <LegalFooter />
    </div>
  );
};