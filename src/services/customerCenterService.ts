import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

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
    // Try to use RevenueCat Customer Center UI (when available)
    // For now, fallback to platform-specific subscription management
    const platform = Capacitor.getPlatform();
    
    if (platform === 'ios') {
      // Deep link to iOS subscription management
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
    } else if (platform === 'android') {
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