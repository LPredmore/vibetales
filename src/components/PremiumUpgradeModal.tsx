import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Sparkles, BookOpen, Save, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PremiumUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const PremiumUpgradeModal = ({ open, onOpenChange, onSuccess }: PremiumUpgradeModalProps) => {
  const [promoCode, setPromoCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<"idle" | "success" | "error">("idle");
  const { toast } = useToast();

  const handleUpgradeNow = () => {
    window.open('https://buy.stripe.com/7sYaEZ7aF0sO4hp4P4fMA01', '_blank');
  };

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
        toast({
          title: "Success!",
          description: "You now have 1 week of premium access!",
        });
        
        // Call success callback to refresh subscription status
        if (onSuccess) {
          onSuccess();
        }
        
        // Close modal after short delay
        setTimeout(() => {
          onOpenChange(false);
          setPromoCode("");
          setValidationStatus("idle");
        }, 2000);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-amber-500" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>
            Unlock unlimited access to all features
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="benefits" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="benefits">Premium Benefits</TabsTrigger>
            <TabsTrigger value="promo">Promo Code</TabsTrigger>
          </TabsList>

          <TabsContent value="benefits" className="space-y-4 pt-4">
            <div className="space-y-3">
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

            <Button 
              onClick={handleUpgradeNow}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold"
              size="lg"
            >
              <Crown className="mr-2 h-5 w-5" />
              Upgrade Now
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Have a promo code? Switch to the Promo Code tab
            </p>
          </TabsContent>

          <TabsContent value="promo" className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                <p className="text-sm text-green-800">
                  Enter a promo code to get <strong>1 week of free premium access</strong> with all features unlocked!
                </p>
              </div>

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
                    <span>Code applied successfully!</span>
                  </div>
                )}
                
                {validationStatus === "error" && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <XCircle className="h-4 w-4" />
                    <span>Invalid or expired code</span>
                  </div>
                )}
              </div>

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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
