import { Capacitor } from '@capacitor/core';
import { purchasePackage, restorePurchases as revenueCatRestore, isRevenueCatAvailable } from './revenuecat';

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
    supportsIAP: isNative && isRevenueCatAvailable(),
    supportsStripe: platform === 'web',
  };
}

export async function initializePayments(userId: string): Promise<void> {
  const { supportsIAP } = getPaymentPlatform();
  
  if (supportsIAP) {
    try {
      console.log('RevenueCat is available for user:', userId);
      // RevenueCat initialization is handled by the native bridge
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
    }
  }
}

export async function purchasePremium(planType: 'monthly' | 'annual' = 'monthly'): Promise<boolean> {
  const platform = getPaymentPlatform();
  const { supportsIAP, isNative } = platform;
  
  console.log('🔄 Payment flow started:', { planType, platform });
  
  if (supportsIAP) {
    console.log('📱 Using RevenueCat for native platform');
    
    // Map plan types to RevenueCat package identifiers
    const packageId = planType === 'annual' ? 'com.VibeTales.Annual' : 'com.VibeTales.Monthly';
    
    try {
      return await purchasePackage(packageId);
    } catch (error) {
      console.error('❌ RevenueCat purchase failed:', error);
      throw new Error('Purchase failed. Please try again.');
    }
  } else {
    // For web platform, show message about mobile app requirement
    const errorMsg = 'In-app purchases are only available in the mobile app. Please download our app from the App Store or Google Play.';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }
}

export async function handleRestorePurchases(): Promise<boolean> {
  const { supportsIAP } = getPaymentPlatform();
  
  if (supportsIAP) {
    return await revenueCatRestore();
  }
  
  return false;
}