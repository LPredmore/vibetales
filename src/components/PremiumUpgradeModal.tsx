import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Crown, Sparkles, BookOpen, Save, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface PremiumUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Extend the JSX IntrinsicElements to include stripe-pricing-table
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

export const PremiumUpgradeModal = ({ open, onOpenChange, onSuccess }: PremiumUpgradeModalProps) => {
  const [promoCode, setPromoCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<"idle" | "success" | "error">("idle");
  const { toast } = useToast();
  const { user } = useAuth();

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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("You must be logged in to redeem a promo code");
      }

      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { code: promoCode.trim().toUpperCase() },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setValidationStatus("success");
        toast({
          title: "Success!",
          description: "You now have 7 days of free premium access!",
        });
        
        if (onSuccess) {
          onSuccess();
        }
        
        setTimeout(() => {
          setPromoCode("");
          setValidationStatus("idle");
        }, 3000);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-amber-500" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>
            Unlock unlimited access to all features
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6 pb-4">
            {/* Premium Benefits Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Premium Benefits</h3>
              
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

            <Separator />

            {/* Promo Code Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Have an Influencer Code?</h3>
              
              <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                <p className="text-sm text-green-800 mb-3">
                  Enter a promo code to get <strong>7 days of free premium access</strong>! After your trial, subscribe below to continue seamlessly.
                </p>

                <div className="space-y-2">
                  <Input
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    disabled={isValidating}
                    className="text-center text-lg font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isValidating) {
                        handleApplyCode();
                      }
                    }}
                  />
                  
                  {validationStatus === "success" && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Code applied! You have 7 days free. Subscribe below to continue after your trial.</span>
                    </div>
                  )}
                  
                  {validationStatus === "error" && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <XCircle className="h-4 w-4" />
                      <span>Invalid or expired code</span>
                    </div>
                  )}

                  <Button
                    onClick={handleApplyCode}
                    disabled={isValidating || !promoCode.trim()}
                    className="w-full"
                    size="lg"
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
                </div>
              </div>
            </div>

            <Separator />

            {/* Stripe Pricing Table Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Subscribe to Premium</h3>
              
              <p className="text-sm text-muted-foreground">
                Choose your plan below. You can enter promotion codes during checkout for additional discounts.
              </p>

              <div className="rounded-lg border p-1 bg-background">
                <stripe-pricing-table 
                  pricing-table-id="prctbl_1QkItTAqA7CJoJ3mLvLc25FS"
                  publishable-key="pk_live_51QSs1DAqA7CJoJ3mMnqWY9KJ4fQB5k5lYZ6TaCHxjVU6xhvWH5v4Z6bzhOLuRa0Hk5fSE9qGj4v9TBfZYMWZ8Cp00xZjdGhh5"
                  customer-email={user?.email || undefined}
                />
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
