import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface LimitReachedPromptProps {
  onClose: () => void;
}

export const LimitReachedPrompt = ({ onClose }: LimitReachedPromptProps) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please log in to upgrade");
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('Checkout error:', error);
        toast.error("Failed to create checkout session");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("No checkout URL received");
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error("Failed to start upgrade process");
    } finally {
      setIsProcessing(false);
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
      <CardContent>
        <div className="flex gap-3">
          <Button
            onClick={handleUpgrade}
            disabled={isProcessing}
            className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold"
          >
            {isProcessing ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Premium
              </>
            )}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="clay-button"
          >
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};