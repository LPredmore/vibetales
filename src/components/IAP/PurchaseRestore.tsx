import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { handleRestorePurchases, getPaymentPlatform } from "@/services/paymentService";

interface PurchaseRestoreProps {
  onRestoreSuccess?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const PurchaseRestore = ({ 
  onRestoreSuccess, 
  variant = "ghost", 
  size = "sm" 
}: PurchaseRestoreProps) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const platform = getPaymentPlatform();

  // Don't show restore button if IAP is not supported
  if (!platform.supportsIAP) {
    return null;
  }

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const success = await handleRestorePurchases();
      if (success) {
        toast.success("Purchases restored successfully!");
        onRestoreSuccess?.();
      } else {
        toast.error("No previous purchases found to restore.");
      }
    } catch (error) {
      console.error('Restore purchases failed:', error);
      toast.error("Failed to restore purchases. Please try again.");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Button
      onClick={handleRestore}
      disabled={isRestoring}
      variant={variant}
      size={size}
      className="text-muted-foreground"
    >
      {isRestoring ? (
        <>
          <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
          Restoring...
        </>
      ) : (
        <>
          <RotateCcw className="mr-2 h-4 w-4" />
          Restore Purchases
        </>
      )}
    </Button>
  );
};