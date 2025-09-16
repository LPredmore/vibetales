import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { showCustomerCenter, canShowCustomerCenter } from "@/services/customerCenterService";
import { toast } from "sonner";

interface ManageSubscriptionProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export const ManageSubscription = ({ 
  variant = "outline", 
  size = "sm",
  className = ""
}: ManageSubscriptionProps) => {
  
  if (!canShowCustomerCenter()) {
    return null;
  }

  const handleManageSubscription = async () => {
    try {
      await showCustomerCenter();
    } catch (error) {
      console.error('Failed to show customer center:', error);
      toast.error("Unable to open subscription management.");
    }
  };

  return (
    <Button
      onClick={handleManageSubscription}
      variant={variant}
      size={size}
      className={`${className}`}
    >
      <Settings className="mr-2 h-4 w-4" />
      Manage Subscription
    </Button>
  );
};