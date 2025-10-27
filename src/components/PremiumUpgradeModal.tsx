import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Crown, Sparkles, BookOpen, Save, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'pricing-table-id': string;
        'publishable-key': string;
        'customer-email'?: string;
      };
    }
  }
}

interface PremiumUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const PremiumUpgradeModal = ({ open, onOpenChange, onSuccess }: PremiumUpgradeModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<"idle" | "success" | "error">("idle");
  const [showCodePricingTable, setShowCodePricingTable] = useState(false);
  const [existingPromoCode, setExistingPromoCode] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Fetch user profile on modal open to check for existing promo code
  useEffect(() => {
    if (open && user) {
      const fetchUserProfile = async () => {
        setIsLoadingProfile(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('influencer_code')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (error) throw error;
          
          if (data?.influencer_code) {
            setExistingPromoCode(data.influencer_code);
            setPromoCode(data.influencer_code);
            setShowCodePricingTable(true);
            setValidationStatus("success");
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        } finally {
          setIsLoadingProfile(false);
        }
      };
      
      fetchUserProfile();
    }
  }, [open, user]);


  const handleApplyCode = async () => {
    if (!promoCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a promo code",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    setValidationStatus("idle");

    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { code: promoCode.trim().toUpperCase() },
      });

      if (error) throw error;

      if (data?.success) {
        setValidationStatus("success");
        setShowCodePricingTable(true);
        
        // Call success callback to refresh subscription status
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(data?.error || "Failed to apply code");
      }
    } catch (error: any) {
      console.error('Promo code validation error:', error);
      setValidationStatus("error");
      toast({
        title: "Invalid Code",
        description: error.message || "This promo code is invalid or has expired",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-amber-500" />
            Upgrade to Unlimited
          </DialogTitle>
          <DialogDescription>
            Unlock unlimited access to all features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[calc(85vh-120px)] overflow-y-auto pr-4">
          {/* Section 1: Premium Benefits */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
              <Sparkles className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-900">Unlimited Story Generation</h4>
                <p className="text-sm text-amber-700">Create as many stories as you want, anytime</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
              <BookOpen className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900">Unlimited Sight Words</h4>
                <p className="text-sm text-blue-700">Add as many sight words as you need</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
              <Save className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-purple-900">Save Favorite Stories</h4>
                <p className="text-sm text-purple-700">Keep your best stories and access them anytime</p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Section 2: Promo Code Input */}
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-lg">Have a Promo Code?</h3>
            
            <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
              {existingPromoCode ? (
                <p className="text-sm text-green-800">
                  You've already applied the promo code <strong>{existingPromoCode}</strong>. Your special pricing is available below!
                </p>
              ) : (
                <p className="text-sm text-green-800">
                  Enter your promo code to unlock <strong>special pricing</strong> on unlimited access!
                </p>
              )}
            </div>

            {isLoadingProfile ? (
              <div className="space-y-2">
                <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={isValidating || validationStatus === "success" || !!existingPromoCode}
                  readOnly={!!existingPromoCode}
                  className="text-center text-lg font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isValidating && validationStatus !== "success" && !existingPromoCode) {
                      handleApplyCode();
                    }
                  }}
                />
              
                {validationStatus === "success" && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {existingPromoCode 
                        ? "Your promo code is active. Enjoy your special pricing below!"
                        : "Code applied! You will receive a free week before being charged."
                      }
                    </span>
                  </div>
                )}
              
              {validationStatus === "error" && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>Invalid or expired code</span>
                </div>
              )}

              {validationStatus !== "success" && !existingPromoCode && (
                <Button
                  onClick={handleApplyCode}
                  disabled={isValidating || !promoCode.trim()}
                  className="w-full"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Apply Code
                    </>
                  )}
                </Button>
              )}
            </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Section 3: Dynamic Pricing Table */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">
              {showCodePricingTable ? "Special Offer" : "Subscribe to Unlimited"}
            </h3>
            
            {showCodePricingTable ? (
              <>
                <p className="text-sm text-muted-foreground">
                  You get a free week!
                </p>
                <div style={{ minHeight: '400px', pointerEvents: 'auto' }}>
                  <stripe-pricing-table 
                    pricing-table-id="prctbl_1SMrbERFHDig2LCd3awZhYCk"
                    publishable-key="pk_live_51Q7RAjRFHDig2LCd0VqJDTzZl0PZKDUtJY9CJshGKffP8dg0ompEBRjKAhqrrKw4rtdxw3dQFvqXRgpLfSyJ12mi00Rf52vVsl"
                    customer-email={user?.email}
                  >
                  </stripe-pricing-table>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Choose your plan below. Have a promo code? Enter it above for special pricing!
                </p>
                <div style={{ minHeight: '400px', pointerEvents: 'auto' }}>
                  <stripe-pricing-table 
                    pricing-table-id="prctbl_1SMqbWRFHDig2LCdB0mdlAW5"
                    publishable-key="pk_live_51Q7RAjRFHDig2LCd0VqJDTzZl0PZKDUtJY9CJshGKffP8dg0ompEBRjKAhqrrKw4rtdxw3dQFvqXRgpLfSyJ12mi00Rf52vVsl"
                    customer-email={user?.email}
                  >
                  </stripe-pricing-table>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
