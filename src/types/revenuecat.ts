// RevenueCat type definitions for better type safety
export interface RevenueCatProduct {
  identifier: string;
  price: string;
  priceString: string;
  currency_code?: string;
  currencyCode?: string;
  price_string?: string;
}

export interface RevenueCatPackage {
  identifier: string;
  product: RevenueCatProduct;
  storeProduct?: RevenueCatProduct;
}

export interface RevenueCatOffering {
  identifier: string;
  serverDescription: string;
  availablePackages: RevenueCatPackage[];
}

export interface RevenueCatEntitlement {
  identifier: string;
  isActive: boolean;
  productIdentifier: string;
}

export interface RevenueCatCustomerInfo {
  entitlements: Record<string, RevenueCatEntitlement>;
  activeSubscriptions: string[];
}

export interface RevenueCatPurchaseResult {
  customerInfo: RevenueCatCustomerInfo;
  productIdentifier: string;
}