import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Crown, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PremiumUpgradeModal } from "./LazyModals";
import { useUserLimits } from "@/hooks/useUserLimits";

interface UsageLimitsProps {}

interface UserLimits {
  daily_stories_used: number;
  trial_started_at: string;
  trial_used: boolean;
}

export const UsageLimits = ({}: UsageLimitsProps) => {
  const { user, isSubscribed, isCheckingSubscription, refreshSubscription } = useAuth();
  const { limits, isLoading: limitsLoading, refreshLimits } = useUserLimits();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleUpgradeSuccess = () => {
    refreshSubscription();
    refreshLimits();
  };

  // Show loading until both operations complete
  if (limitsLoading || isCheckingSubscription) {
    return (
      <Card className="clay-card">
        <CardHeader>
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        </CardHeader>
      </Card>
    );
  }

  if (isSubscribed) {
    return null; // Don't show anything for premium users
  }

  const dailyUsed = limits?.daily_stories_used || 0;
  const dailyLimit = 1;

  return (
    <Card className="clay-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-600" />
          <span>Daily Limit</span>
        </CardTitle>
        <CardDescription>
          You can generate {dailyLimit} story per day. Limit resets at midnight CST.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Stories used today</span>
            <span>{dailyUsed} / {dailyLimit}</span>
          </div>
          <Progress 
            value={(dailyUsed / dailyLimit) * 100} 
            className="h-2"
          />
          <Button 
            onClick={() => setShowUpgradeModal(true)}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold"
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Unlimited
          </Button>
          
          <PremiumUpgradeModal 
            open={showUpgradeModal}
            onOpenChange={setShowUpgradeModal}
            onSuccess={handleUpgradeSuccess}
          />
        </div>
      </CardContent>
    </Card>
  );
};