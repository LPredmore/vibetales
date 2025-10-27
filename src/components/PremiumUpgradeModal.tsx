import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Crown, Sparkles, BookOpen, Save } from "lucide-react";
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
  const { user } = useAuth();

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

            {/* Stripe Pricing Table Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Subscribe to Premium</h3>
              
              <p className="text-sm text-muted-foreground">
                Choose your plan below.
              </p>

              <div className="rounded-lg border p-1 bg-background">
                <stripe-pricing-table 
                  pricing-table-id="prctbl_1SMqbWRFHDig2LCdB0mdlAW5"
                  publishable-key="pk_live_51Q7RAjRFHDig2LCd0VqJDTzZl0PZKDUtJY9CJshGKffP8dg0ompEBRjKAhqrrKw4rtdxw3dQFvqXRgpLfSyJ12mi00Rf52vVsl"
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
