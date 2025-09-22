import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { supabase } from '@/lib/supabase';

// RevenueCat bridge interface (assumes wrapper injects window.revenueCat)
interface RevenueCatOffering {
  identifier: string;
  serverDescription: string;
  availablePackages: RevenueCatPackage[];
}

interface RevenueCatPackage {
  identifier: string;
  product: RevenueCatProduct;
  storeProduct?: RevenueCatProduct;
}

interface RevenueCatProduct {
  identifier: string;
  price: string;
  priceString: string;
  currency_code?: string;
  currencyCode?: string;
  price_string?: string;
}

interface RevenueCatPurchaseResult {
  customerInfo: RevenueCatCustomerInfo;
  productIdentifier: string;
}

interface RevenueCatCustomerInfo {
  entitlements: Record<string, RevenueCatEntitlement>;
  activeSubscriptions: string[];
  active?: boolean; // Add active property for compatibility
}

interface RevenueCatEntitlement {
  identifier: string;
  isActive: boolean;
  productIdentifier: string;
}

interface RevenueCatBridge {
  getOfferings: () => Promise<{ current: RevenueCatOffering }>;
  purchasePackage: (packageId: string) => Promise<RevenueCatPurchaseResult>;
  restorePurchases: () => Promise<RevenueCatCustomerInfo>;
  getCustomerInfo: () => Promise<RevenueCatCustomerInfo>;
}

// Declare window.revenueCat for native platforms
declare global {
  interface Window {
    revenueCat?: RevenueCatBridge;
  }
}

export interface RevenueCatOfferings {
  current?: {
    availablePackages: Array<{
      identifier: string;
      product: {
        identifier: string;
        price: string;
        priceString: string;
      };
    }>;
  };
}

export interface RevenueCatEntitlements {
  entitlements: Record<string, RevenueCatEntitlement>;
  active: boolean;
}

// Platform detection
function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

function getPlatform(): string {
  return Capacitor.getPlatform();
}

// Get offerings available for purchase
export async function getOfferings(): Promise<RevenueCatOfferings> {
  if (!isNativePlatform()) {
    throw new Error('RevenueCat is only available on native platforms');
  }

  try {
    const offerings = await Purchases.getOfferings();
    console.log('RevenueCat offerings received:', offerings);
    
    // Transform Purchases type to our expected type
    const transformedOfferings: RevenueCatOfferings = {
      current: offerings.current ? {
        availablePackages: offerings.current.availablePackages.map(pkg => ({
          identifier: pkg.identifier,
          product: {
            identifier: pkg.product.identifier,
            price: pkg.product.price.toString(),
            priceString: pkg.product.priceString
          }
        }))
      } : undefined
    };
    
    return transformedOfferings;
  } catch (error) {
    console.error('Failed to get RevenueCat offerings:', error);
    throw new Error('Failed to load subscription options');
  }
}

// Purchase a package
export async function purchasePackage(packageId: string): Promise<boolean> {
  if (!isNativePlatform()) {
    throw new Error('RevenueCat purchases are only available on native platforms');
  }

  try {
    console.log('Purchasing RevenueCat package:', packageId);
    
    // Get offerings first to find the correct package
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(p => p.identifier === packageId);
    
    if (!pkg) {
      throw new Error(`Package ${packageId} not found`);
    }
    
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    
    // Refresh entitlements after successful purchase
    await refreshEntitlements();
    
    console.log('Purchase completed:', result);
    return true;
  } catch (error) {
    console.error('Purchase failed:', error);
    throw error;
  }
}

// Restore previous purchases
export async function restorePurchases(): Promise<boolean> {
  if (!isNativePlatform()) {
    throw new Error('RevenueCat restore is only available on native platforms');
  }

  try {
    console.log('Restoring RevenueCat purchases');
    const result = await Purchases.restorePurchases();
    
    // Refresh entitlements after restore
    await refreshEntitlements();
    
    console.log('Purchases restored:', result);
    return true;
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
}

// Refresh entitlements via Supabase edge function
export async function refreshEntitlements(): Promise<RevenueCatEntitlements> {
  try {
    console.log('Refreshing entitlements via Supabase');
    const { data, error } = await supabase.functions.invoke('refresh-entitlements');

    if (error) {
      console.error('Failed to refresh entitlements:', error);
      throw new Error('Failed to refresh subscription status');
    }

    console.log('Entitlements refreshed:', data);
    return data;
  } catch (error) {
    console.error('Error refreshing entitlements:', error);
    throw error;
  }
}

// Get current customer info from RevenueCat
export async function getCustomerInfo(): Promise<RevenueCatCustomerInfo> {
  if (!isNativePlatform()) {
    // For web, use entitlements refresh instead
    const entitlements = await refreshEntitlements();
    return { 
      entitlements: entitlements.entitlements, 
      activeSubscriptions: [], 
      active: entitlements.active 
    } as RevenueCatCustomerInfo;
  }

  try {
    const result = await Purchases.getCustomerInfo();
    console.log('Customer info received:', result);
    
    // Transform the result to match our interface
    const customerInfo: RevenueCatCustomerInfo = {
      entitlements: (result.customerInfo?.entitlements as unknown as Record<string, RevenueCatEntitlement>) || {},
      activeSubscriptions: result.customerInfo?.activeSubscriptions || [],
      active: result.customerInfo?.activeSubscriptions?.length > 0
    };
    
    return customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    throw error;
  }
}

// Check if RevenueCat is available on current platform
export function isRevenueCatAvailable(): boolean {
  return isNativePlatform();
}

// Platform information
export { isNativePlatform, getPlatform };