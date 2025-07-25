/**
 * TWA (Trusted Web Activity) Detection and Update Utilities
 * Critical for Google Play Store PWA updates
 */

// Detect if app is running in PWA environment (mobile or desktop)
export const isPWA = (): boolean => {
  // Check for standalone display mode (PWA installed)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Check for mobile user agent
  const userAgent = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Check if it's likely a PWA environment
  const isPWALikely = isStandalone || 
                      (isMobile && !window.location.href.includes('localhost')) ||
                      'serviceWorker' in navigator;
  
  return isPWALikely;
};

// Legacy TWA detection for backward compatibility
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

// Force manifest refresh for TWA with aggressive cache busting
export const forceTWAManifestRefresh = async (): Promise<void> => {
  if (!isTWA()) return;
  
  try {
    console.log('🔄 TWA detected - forcing aggressive manifest refresh');
    
    const timestamp = Date.now();
    
    // Multiple manifest refresh attempts with different cache-busting strategies
    const manifestUrls = [
      `/manifest.json?v=${timestamp}`,
      `/manifest.json?bust=${timestamp}&twa=1`,
      `/manifest.json?${timestamp}`
    ];
    
    for (const manifestUrl of manifestUrls) {
      try {
        const response = await fetch(manifestUrl, {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
            'If-None-Match': '"invalidate-cache"'
          }
        });
        
        if (response.ok) {
          const manifest = await response.json();
          console.log('📱 TWA manifest refreshed successfully:', {
            version: manifest.version,
            url: manifestUrl,
            timestamp: new Date().toISOString()
          });
          
          // Store the new version for comparison
          if (manifest.version) {
            localStorage.setItem('twa-manifest-version', manifest.version);
          }
          
          // Notify TWA container if possible
          if ('android' in window && typeof (window as any).android.onVersionUpdate === 'function') {
            (window as any).android.onVersionUpdate(manifest.version);
          }
          
          break; // Success, no need to try other URLs
        }
      } catch (fetchError) {
        console.warn(`❌ Failed to fetch ${manifestUrl}:`, fetchError);
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