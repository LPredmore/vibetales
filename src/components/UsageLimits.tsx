import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Clock, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUpgradeModal } from "@/contexts/UpgradeModalContext";
import { useUserLimits } from "@/hooks/useUserLimits";

export const UsageLimits = () => {
  const { isSubscribed, isCheckingSubscription, refreshSubscription } = useAuth();
  const { limits, isLoading: limitsLoading } = useUserLimits();
  const { showUpgradeModal } = useUpgradeModal();

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
            onClick={() => showUpgradeModal(refreshSubscription)}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold"
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Unlimited
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};