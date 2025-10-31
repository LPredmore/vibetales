import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePaymentHandler() {
  const { user } = useAuth();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    const handlePaymentResult = async () => {
      if (success === 'true') {
        toast.success("Payment successful! Your unlimited subscription is now active.");
        
        // Refresh subscription status
        if (user) {
          try {
            const { data, error } = await supabase.functions.invoke('check-subscription', {
              body: { userId: user.id }
            });
            
            if (!error && data) {
              toast.success("Unlimited features are now available!");
            }
          } catch {
            toast.info("Your payment was successful. Unlimited features may take a moment to activate.");
          }
        }
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (canceled === 'true') {
        toast.error("Payment was canceled. You can try again anytime.");
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    if (success || canceled) {
      handlePaymentResult();
    }
  }, [user]);
}