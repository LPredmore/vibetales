/**
 * TWA (Trusted Web Activity) Detection and Update Utilities
 * Critical for Google Play Store PWA updates
 */

// Detect if app is running in TWA environment
export const isTWA = (): boolean => {
  // Check for TWA-specific user agent
  const userAgent = navigator.userAgent;
  const isTWAUserAgent = userAgent.includes('wv') && userAgent.includes('Chrome');
  
  // Check for TWA-specific window properties
  const hasTWAProperties = 'TWA' in window || 'android' in window;
  
  // Check for display mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Additional TWA indicators
  const isFromPlayStore = document.referrer.includes('android-app://com.android.vending');
  
  return isTWAUserAgent || hasTWAProperties || (isStandalone && isFromPlayStore);
};

// Force manifest refresh for TWA
export const forceTWAManifestRefresh = async (): Promise<void> => {
  if (!isTWA()) return;
  
  try {
    console.log('🔄 TWA detected - forcing manifest refresh');
    
    // Force manifest re-fetch with cache busting
    const manifestUrl = `/manifest.json?v=${Date.now()}`;
    const response = await fetch(manifestUrl, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (response.ok) {
      const manifest = await response.json();
      console.log('📱 TWA manifest refreshed, version:', manifest.version);
      
      // Notify TWA of version change if possible
      if ('android' in window && typeof (window as any).android.onVersionUpdate === 'function') {
        (window as any).android.onVersionUpdate(manifest.version);
      }
    }
  } catch (error) {
    console.error('❌ TWA manifest refresh failed:', error);
  }
};

// Get current app version for TWA
export const getTWAVersion = async (): Promise<string | null> => {
  try {
    const response = await fetch('/app-version.json', { cache: 'no-cache' });
    if (response.ok) {
      const versionInfo = await response.json();
      return versionInfo.version || null;
    }
  } catch (error) {
    console.error('❌ Failed to get TWA version:', error);
  }
  return null;
};

// Check if TWA needs update by comparing versions
export const checkTWAUpdate = async (): Promise<boolean> => {
  if (!isTWA()) return false;
  
  try {
    // Get cached version
    const cachedVersion = localStorage.getItem('twa-app-version');
    
    // Get current version
    const currentVersion = await getTWAVersion();
    
    if (!currentVersion) return false;
    
    // Store current version
    localStorage.setItem('twa-app-version', currentVersion);
    
    // Check if version changed
    const needsUpdate = cachedVersion && cachedVersion !== currentVersion;
    
    if (needsUpdate) {
      console.log('📱 TWA update detected:', cachedVersion, '->', currentVersion);
    }
    
    return !!needsUpdate;
  } catch (error) {
    console.error('❌ TWA update check failed:', error);
    return false;
  }
};

// Log TWA environment info for debugging
export const logTWAInfo = (): void => {
  console.log('📱 TWA Detection Info:');
  console.log('- User Agent:', navigator.userAgent);
  console.log('- Display Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
  console.log('- Referrer:', document.referrer);
  console.log('- Is TWA:', isTWA());
  console.log('- Android object:', 'android' in window);
  console.log('- TWA object:', 'TWA' in window);
};