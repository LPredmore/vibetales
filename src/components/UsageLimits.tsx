import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Crown, Infinity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { refreshEntitlements } from "@/services/revenuecat";
import { handleRestorePurchases } from "@/services/paymentService";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { ManageSubscription } from "@/components/ManageSubscription";
import { getPaymentPlatform } from "@/services/paymentService";

interface UsageLimitsProps {
  onRefreshLimits?: (refreshFunction: () => Promise<void>) => void;
}

interface UserLimits {
  daily_stories_used: number;
  trial_started_at: string;
  trial_used: boolean;
}

export const UsageLimits = ({ onRefreshLimits }: UsageLimitsProps) => {
  const { user } = useAuth();
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [hasPremium, setHasPremium] = useState(false);
  const [limitsLoading, setLimitsLoading] = useState(true);
  const [premiumLoading, setPremiumLoading] = useState(true);


  const fetchUserLimits = useCallback(async () => {
    if (!user?.id) {
      setLimitsLoading(false);
      return;
    }

    try {
      // Use the database function instead of direct query to avoid auth issues
      const { data, error } = await supabase
        .rpc('get_or_create_user_limits', { p_user_id: user.id });

      if (error) {
        console.error('Error fetching user limits:', error);
        // If it's an auth error, don't set the limits but don't fail completely
        if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          console.warn('Authentication issue detected, user may need to re-login');
        }
        return;
      }

      setLimits(data);
    } catch (error) {
      console.error('Error fetching user limits:', error);
    } finally {
      setLimitsLoading(false);
    }
  }, [user?.id]);

  const checkPremiumStatus = useCallback(async () => {
    try {
      const entitlements = await refreshEntitlements();
      setHasPremium(entitlements.active);
    } catch (error) {
      console.error('Error checking premium status:', error);
      setHasPremium(false);
    } finally {
      setPremiumLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserLimits();
      checkPremiumStatus();
    } else {
      setLimitsLoading(false);
      setPremiumLoading(false);
    }
  }, [user, fetchUserLimits, checkPremiumStatus]);

  // Expose refresh function to parent component
  useEffect(() => {
    if (onRefreshLimits) {
      onRefreshLimits(fetchUserLimits);
    }
  }, [onRefreshLimits, fetchUserLimits]);

  const handleUpgrade = async () => {
    await checkPremiumStatus();
    await fetchUserLimits();
  };

  // Show loading until both limits and premium status are loaded
  if (limitsLoading || premiumLoading) {
    return (
      <Card className="clay-card">
        <CardHeader>
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        </CardHeader>
      </Card>
    );
  }

  const dailyUsed = limits?.daily_stories_used || 0;
  const dailyLimit = 1;
  const platform = getPaymentPlatform();

  // Show premium status for premium users
  if (hasPremium) {
    return (
      <Card className="clay-card border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <span>Premium Active</span>
          </CardTitle>
          <CardDescription>
            You have unlimited story generation and premium features.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Stories used today</span>
              <div className="flex items-center gap-1">
                <span>{dailyUsed}</span>
                <Infinity className="h-4 w-4 text-primary" />
              </div>
            </div>
            <Progress value={0} className="h-2 bg-primary/20" />
            <ManageSubscription className="w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

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
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Stories used today</span>
            <span>{dailyUsed} / {dailyLimit}</span>
          </div>
          <Progress 
            value={(dailyUsed / dailyLimit) * 100} 
            className="h-2"
          />
          <SubscriptionPlans 
            onUpgrade={handleUpgrade}
            showRestore={platform.supportsIAP}
            onRestore={async () => {
              try {
                const success = await handleRestorePurchases();
                if (success) {
                  await handleUpgrade();
                }
              } catch (error) {
                console.error('Restore failed:', error);
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};