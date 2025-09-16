import { useState, useEffect } from "react";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { Capacitor } from "@capacitor/core";
import { Skeleton } from "@/components/ui/skeleton";

interface PricingInfo {
  monthly?: {
    price: string;
    currency: string;
    trialPeriod?: string;
    savings?: string;
  };
  annual?: {
    price: string;
    currency: string;
    trialPeriod?: string;
    savings?: string;
  };
}

interface SubscriptionPricingProps {
  showBoth?: boolean;
  planType?: 'monthly' | 'annual';
  className?: string;
}

export const SubscriptionPricing = ({ 
  showBoth = false, 
  planType = 'monthly',
  className = ""
}: SubscriptionPricingProps) => {
  const [pricing, setPricing] = useState<PricingInfo>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPricing = async () => {
      if (!Capacitor.isNativePlatform()) {
        // Web fallback pricing
        setPricing({
          monthly: { price: "$4.99", currency: "USD" },
          annual: { price: "$49.99", currency: "USD", savings: "Save 17%" }
        });
        setIsLoading(false);
        return;
      }

      try {
        const offerings = await Purchases.getOfferings();
        const currentOffering = offerings.current;
        
        if (!currentOffering?.availablePackages?.length) {
          setIsLoading(false);
          return;
        }

        const monthlyPackage = currentOffering.availablePackages.find(
          pkg => pkg.identifier === 'com.VibeTales.Monthly'
        );
        
        const annualPackage = currentOffering.availablePackages.find(
          pkg => pkg.identifier === 'com.VibeTales.Annual'
        );

        const newPricing: PricingInfo = {};

        if (monthlyPackage) {
          const product = (monthlyPackage as any).storeProduct || monthlyPackage.product;
          newPricing.monthly = {
            price: product?.priceString || product?.price_string || "$4.99",
            currency: product?.currencyCode || product?.currency_code || "USD",
          };
        }

        if (annualPackage) {
          const product = (annualPackage as any).storeProduct || annualPackage.product;
          newPricing.annual = {
            price: product?.priceString || product?.price_string || "$49.99",
            currency: product?.currencyCode || product?.currency_code || "USD",
          };
          
          // Calculate savings if both prices available
          if (monthlyPackage && annualPackage) {
            const monthlyPrice = parseFloat(newPricing.monthly?.price?.replace(/[^0-9.]/g, '') || '4.99');
            const annualPrice = parseFloat(newPricing.annual?.price?.replace(/[^0-9.]/g, '') || '49.99');
            const yearlyMonthlyPrice = monthlyPrice * 12;
            const savings = Math.round(((yearlyMonthlyPrice - annualPrice) / yearlyMonthlyPrice) * 100);
            if (savings > 0) {
              newPricing.annual.savings = `Save ${savings}%`;
            }
          }
        }

        setPricing(newPricing);
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPricing();
  }, []);

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  if (showBoth) {
    return (
      <div className={`space-y-4 ${className}`}>
        {pricing.monthly && (
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {pricing.monthly.price}/month
            </div>
            <div className="text-xs text-muted-foreground">Monthly billing</div>
          </div>
        )}
        {pricing.annual && (
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {pricing.annual.price}/year
            </div>
            <div className="text-xs text-muted-foreground">
              Annual billing • {(pricing.annual as any)?.savings || 'Best value'}
            </div>
          </div>
        )}
      </div>
    );
  }

  const selectedPricing = planType === 'annual' ? pricing.annual : pricing.monthly;
  
  if (!selectedPricing) {
    return null;
  }

  return (
    <div className={`text-center ${className}`}>
      <div className="text-lg font-semibold text-foreground">
        {selectedPricing.price}/{planType === 'annual' ? 'year' : 'month'}
      </div>
      <div className="text-xs text-muted-foreground">
        {planType === 'annual' ? 'Annual billing' : 'Monthly billing'}
        {(selectedPricing as any)?.savings && ` • ${(selectedPricing as any).savings}`}
      </div>
      {selectedPricing.trialPeriod && (
        <div className="text-xs text-muted-foreground mt-1">
          {selectedPricing.trialPeriod} free trial
        </div>
      )}
      <div className="text-xs text-muted-foreground mt-2">
        Auto-renewable subscription. Cancel anytime.
      </div>
    </div>
  );
};