import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

let isInitialized = false;

export interface IAPEntitlements {
  premiumAnnual: boolean;
  premiumMonthly: boolean;
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
    return { premiumAnnual: false, premiumMonthly: false };
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlements = (customerInfo as any).entitlements;
    const annualEntitlement = entitlements?.active?.premium_annual;
    const monthlyEntitlement = entitlements?.active?.premium_monthly;
    
    return {
      premiumAnnual: Boolean(annualEntitlement),
      premiumMonthly: Boolean(monthlyEntitlement),
      expiresAt: annualEntitlement?.expirationDate || monthlyEntitlement?.expirationDate,
    };
  } catch (error) {
    console.error('Failed to get entitlements:', error);
    return { premiumAnnual: false, premiumMonthly: false };
  }
}

export async function purchasePremium(planType: 'monthly' | 'annual' = 'monthly'): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !isInitialized) {
    throw new Error('IAP not available on this platform');
  }

  try {
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;
    
    if (!currentOffering?.availablePackages?.length) {
      throw new Error('No subscription packages available');
    }

    // Find the specific package by Product ID
    const productId = planType === 'annual' ? 'com.VibeTales.Annual' : 'com.VibeTales.Monthly';
    const packageToPurchase = currentOffering.availablePackages.find(
      pkg => pkg.identifier === productId
    );
    
    if (!packageToPurchase) {
      throw new Error(`Package not found for ${planType} subscription (${productId})`);
    }
    
    const { customerInfo } = await Purchases.purchasePackage({ 
      aPackage: packageToPurchase 
    });
    
    const entitlements = (customerInfo as any).entitlements;
    return Boolean(entitlements?.active?.premium_annual || entitlements?.active?.premium_monthly);
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
    return Boolean(entitlements?.active?.premium_annual || entitlements?.active?.premium_monthly);
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