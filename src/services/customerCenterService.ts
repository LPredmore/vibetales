import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';
// Note: RevenueCat Customer Center UI package is already installed
// import { PurchasesUI } from '@revenuecat/purchases-capacitor-ui';

export async function showCustomerCenter(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    // Web fallback - redirect to appropriate subscription management
    const platform = Capacitor.getPlatform();
    if (platform === 'web') {
      // For now, show a message. In production, you might want to redirect to account page
      console.log('Customer center not available on web platform');
      return;
    }
  }

  try {
    // TODO: Implement RevenueCat Customer Center UI when available
    // Currently, the @revenuecat/purchases-capacitor-ui package is installed
    // but the Customer Center feature might need additional setup
    
    // For now, we'll use a fallback approach
    const customerInfo = await Purchases.getCustomerInfo();
    console.log('Customer info retrieved for management:', customerInfo);
    
    // You can add deep linking to iOS/Android subscription management here
    if (Capacitor.getPlatform() === 'ios') {
      // Deep link to iOS subscription management
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
    } else if (Capacitor.getPlatform() === 'android') {
      // Deep link to Google Play subscription management
      window.open('https://play.google.com/store/account/subscriptions', '_blank');
    }
  } catch (error) {
    console.error('Failed to show customer center:', error);
    throw error;
  }
}

export function canShowCustomerCenter(): boolean {
  return Capacitor.isNativePlatform();
}