import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { purchasePackage, restorePurchases as revenueCatRestore, isRevenueCatAvailable } from './revenuecat';
import { supabase } from '@/lib/supabase';

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
  const { supportsIAP, platform } = getPaymentPlatform();
  
  if (supportsIAP) {
    try {
      console.log('Initializing RevenueCat for user:', userId);
      
      // Configure RevenueCat with platform-specific API key
      let apiKey: string;
      if (platform === 'ios') {
        // For iOS, we need to get the iOS API key from environment
        apiKey = 'appl_YOUR_IOS_API_KEY'; // This will be set in the native app
      } else if (platform === 'android') {
        // For Android, we need to get the Android API key from environment
        apiKey = 'goog_YOUR_ANDROID_API_KEY'; // This will be set in the native app
      } else {
        throw new Error('Unsupported platform for RevenueCat');
      }
      
      // Initialize RevenueCat
      await Purchases.setLogLevel({ level: LOG_LEVEL.INFO });
      await Purchases.configure({
        apiKey,
        appUserID: userId,
      });
      
      console.log('✅ RevenueCat initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize RevenueCat:', error);
      throw error;
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
  } else if (platform.supportsStripe) {
    // For web platform, use Stripe checkout
    console.log('🌐 Using Stripe for web platform');
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planType }
      });
      
      if (error) throw error;
      
      // Redirect to Stripe checkout
      window.location.href = data.url;
      return true;
    } catch (error) {
      console.error('❌ Stripe checkout failed:', error);
      throw new Error('Failed to create checkout session. Please try again.');
    }
  } else {
    // Fallback error
    const errorMsg = 'Payment not supported on this platform.';
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