import { Capacitor } from '@capacitor/core';
import { initializeIAP, purchasePremium as iapPurchase, restorePurchases, isPlatformSupported } from './iapService';

export interface PaymentPlatform {
  isNative: boolean;
  platform: string;
  supportsIAP: boolean;
  supportsStripe: boolean;
}

export function getPaymentPlatform(): PaymentPlatform {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  
  return {
    isNative,
    platform,
    supportsIAP: isNative && isPlatformSupported(),
    supportsStripe: platform === 'web',
  };
}

export async function initializePayments(userId: string): Promise<void> {
  const { supportsIAP } = getPaymentPlatform();
  
  if (supportsIAP) {
    try {
      await initializeIAP(userId);
    } catch (error) {
      console.error('Failed to initialize IAP:', error);
    }
  }
}

export async function purchasePremium(planType: 'monthly' | 'annual' = 'monthly'): Promise<boolean> {
  const platform = getPaymentPlatform();
  const { supportsIAP, supportsStripe, isNative } = platform;
  
  console.log('🔄 Payment flow started:', { planType, platform });
  
  if (supportsIAP) {
    console.log('📱 Using IAP for native platform');
    return await iapPurchase(planType);
  } else if (supportsStripe) {
    console.log('💳 Using Stripe for web platform');
    
    // Use the provided Stripe link for both monthly and annual for now
    const stripeLink = 'https://buy.stripe.com/7sYaEZ7aF0sO4hp4P4fMA01';
    
    console.log('🔗 Opening Stripe link:', stripeLink);
    
    try {
      // Open link immediately to avoid popup blockers
      const newWindow = window.open(stripeLink, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        console.error('❌ Popup blocked or failed to open');
        throw new Error('Payment window blocked. Please allow popups and try again.');
      }
      
      console.log('✅ Stripe payment window opened successfully');
      return true; // Return true to indicate the payment window opened
    } catch (error) {
      console.error('❌ Failed to open Stripe payment:', error);
      throw new Error('Failed to open payment page. Please try again or allow popups in your browser.');
    }
  } else {
    const errorMsg = `No payment method available for platform: ${platform.platform}`;
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }
}

export async function handleRestorePurchases(): Promise<boolean> {
  const { supportsIAP } = getPaymentPlatform();
  
  if (supportsIAP) {
    return await restorePurchases();
  }
  
  return false;
}