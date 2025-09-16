import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

let isInitialized = false;

export interface IAPEntitlements {
  premiumAccess: boolean;
  expiresAt?: string;
}

export async function initializeIAP(userId: string): Promise<void> {
  if (isInitialized || !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const platform = Capacitor.getPlatform();
    
    // Get RevenueCat API keys from environment (these are set as Supabase secrets)
    const apiKey = platform === 'ios' 
      ? process.env.REVENUECAT_IOS_API_KEY
      : platform === 'android' 
        ? process.env.REVENUECAT_ANDROID_API_KEY
        : '';

    if (!apiKey) {
      console.warn('No RevenueCat API key found for platform:', platform);
      return;
    }

    await Purchases.configure({
      apiKey,
      appUserID: userId,
    });

    isInitialized = true;
    console.log('RevenueCat initialized for platform:', platform);
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    throw error;
  }
}

export async function getEntitlements(): Promise<IAPEntitlements> {
  if (!Capacitor.isNativePlatform() || !isInitialized) {
    return { premiumAccess: false };
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlements = (customerInfo as any).entitlements;
    const premiumEntitlement = entitlements?.active?.premium_access;
    
    return {
      premiumAccess: Boolean(premiumEntitlement),
      expiresAt: premiumEntitlement?.expirationDate,
    };
  } catch (error) {
    console.error('Failed to get entitlements:', error);
    return { premiumAccess: false };
  }
}

export async function purchasePremium(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !isInitialized) {
    throw new Error('IAP not available on this platform');
  }

  try {
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;
    
    if (!currentOffering?.availablePackages?.length) {
      throw new Error('No subscription packages available');
    }

    // Get the first package (typically monthly subscription)
    const packageToPurchase = currentOffering.availablePackages[0];
    
    const { customerInfo } = await Purchases.purchasePackage({ 
      aPackage: packageToPurchase 
    });
    
    const entitlements = (customerInfo as any).entitlements;
    return Boolean(entitlements?.active?.premium_access);
  } catch (error) {
    console.error('Purchase failed:', error);
    throw error;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !isInitialized) {
    throw new Error('IAP not available on this platform');
  }

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const entitlements = (customerInfo as any).entitlements;
    return Boolean(entitlements?.active?.premium_access);
  } catch (error) {
    console.error('Restore purchases failed:', error);
    throw error;
  }
}

export function isPlatformSupported(): boolean {
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'android';
}

export function getPlatform(): string {
  return Capacitor.getPlatform();
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}