import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Crown, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PremiumUpgradeModal } from "./PremiumUpgradeModal";

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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserLimits();
      checkPremiumStatus();
    } else {
      setLimitsLoading(false);
      setPremiumLoading(false);
    }
  }, [user]);

  // Expose refresh function to parent component
  useEffect(() => {
    if (onRefreshLimits) {
      onRefreshLimits(fetchUserLimits);
    }
  }, [onRefreshLimits]);

  const fetchUserLimits = async () => {
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
  };

  const checkPremiumStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        body: { userId: user?.id }
      });

      if (data && !error) {
        setHasPremium(data.subscribed || false);
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
    } finally {
      setPremiumLoading(false);
    }
  };

  const handleUpgradeSuccess = () => {
    checkPremiumStatus();
    if (onRefreshLimits) {
      onRefreshLimits(fetchUserLimits);
    }
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

  if (hasPremium) {
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