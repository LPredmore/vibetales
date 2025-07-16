import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Crown, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UsageLimitsProps {}

interface UserLimits {
  daily_stories_used: number;
  trial_started_at: string;
  trial_used: boolean;
}

export const UsageLimits = ({}: UsageLimitsProps) => {
  const { user } = useAuth();
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [hasPremium, setHasPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserLimits();
      checkPremiumStatus();
    }
  }, [user]);

  const fetchUserLimits = async () => {
    if (!user?.id) {
      setLoading(false);
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
      setLoading(false);
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
    }
  };

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
        // Open Stripe checkout in a new tab to prevent session disruption
        window.open(data.url, '_blank');
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

  if (loading) {
    return (
      <Card className="clay-card">
        <CardHeader>
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        </CardHeader>
      </Card>
    );
  }

  if (hasPremium) {
    return (
      <Card className="clay-card border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Crown className="h-5 w-5" />
            Premium Active
          </CardTitle>
          <CardDescription className="text-amber-700">
            You have unlimited stories! Generate as many as you'd like.
          </CardDescription>
        </CardHeader>
      </Card>
    );
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
            onClick={handleUpgrade}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold"
          >
            {isProcessing ? (
              <>
                <Crown className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                <span className="text-center">
                  Upgrade to Premium for<br />
                  Unlimited Stories
                </span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};