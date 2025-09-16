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

export async function purchasePremium(): Promise<boolean> {
  const { supportsIAP, supportsStripe } = getPaymentPlatform();
  
  if (supportsIAP) {
    return await iapPurchase();
  } else if (supportsStripe) {
    // Open Stripe payment link for web
    window.open('https://buy.stripe.com/7sYaEZ7aF0sO4hp4P4fMA01', '_blank');
    return false; // We can't know if payment succeeded immediately
  } else {
    throw new Error('No payment method available for this platform');
  }
}

export async function handleRestorePurchases(): Promise<boolean> {
  const { supportsIAP } = getPaymentPlatform();
  
  if (supportsIAP) {
    return await restorePurchases();
  }
  
  return false;
}