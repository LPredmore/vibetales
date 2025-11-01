/**
 * Enhanced TWA (Trusted Web Activity) Detection and Configuration System
 * Provides comprehensive environment detection with multiple validation methods
 * Critical for Google Play Store PWA compatibility and initialization
 */

import { Capacitor } from '@capacitor/core';

// Enhanced TWA Environment Detection Results
export interface TWAEnvironment {
  isTWA: boolean;
  isPWA: boolean;
  isBrowser: boolean;
  isCapacitor: boolean;
  confidence: 'high' | 'medium' | 'low';
  detectionMethods: string[];
  playStoreOrigin: boolean;
  webViewCapabilities: WebViewCapabilities;
  capacitorStatus: CapacitorStatus;
}

export interface WebViewCapabilities {
  hasWebView: boolean;
  webViewVersion: string | null;
  supportsServiceWorker: boolean;
  supportsIndexedDB: boolean;
  supportsLocalStorage: boolean;
  userAgent: string;
}

export interface CapacitorStatus {
  isAvailable: boolean;
  platform: string;
  isNative: boolean;
  bridgeHealthy: boolean;
  plugins: string[];
  errors: string[];
}

// Multi-method TWA detection with comprehensive validation
export const detectTWAEnvironment = (): TWAEnvironment => {
  const detectionMethods: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  // Method 1: User Agent Analysis
  const userAgent = navigator.userAgent;
  const hasWebView = userAgent.includes('wv');
  const hasChrome = userAgent.includes('Chrome');
  const isAndroid = userAgent.includes('Android');
  
  if (hasWebView && hasChrome && isAndroid) {
    detectionMethods.push('user-agent-webview');
    confidence = 'medium';
  }
  
  // Method 2: Display Mode Analysis
  const displayMode = window.matchMedia('(display-mode: standalone)').matches;
  if (displayMode) {
    detectionMethods.push('display-mode-standalone');
    if (confidence === 'low') confidence = 'medium';
  }
  
  // Method 3: Referrer Analysis (Play Store origin validation)
  const playStoreOrigin = validatePlayStoreOrigin();
  if (playStoreOrigin) {
    detectionMethods.push('play-store-referrer');
    confidence = 'high';
  }
  
  // Method 4: Capacitor Detection
  const capacitorStatus = getCapacitorStatus();
  if (capacitorStatus.isAvailable && capacitorStatus.isNative) {
    detectionMethods.push('capacitor-native');
    confidence = 'high';
  }
  
  // Method 5: Window Properties Analysis
  const hasAndroidInterface = 'android' in window;
  const hasTWAInterface = 'TWA' in window;
  if (hasAndroidInterface || hasTWAInterface) {
    detectionMethods.push('window-interfaces');
    if (confidence === 'low') confidence = 'medium';
  }
  
  // Method 6: WebView Capabilities Testing
  const webViewCapabilities = testWebViewCapabilities();
  
  // Determine environment type
  const isTWA = (hasWebView && hasChrome && isAndroid) || 
                (capacitorStatus.isNative && isAndroid) ||
                playStoreOrigin;
  
  const isPWA = displayMode && !isTWA;
  const isBrowser = !isTWA && !isPWA;
  const isCapacitor = capacitorStatus.isAvailable;
  
  return {
    isTWA,
    isPWA,
    isBrowser,
    isCapacitor,
    confidence,
    detectionMethods,
    playStoreOrigin,
    webViewCapabilities,
    capacitorStatus
  };
};

// Validate Play Store origin with multiple methods
export const validatePlayStoreOrigin = (): boolean => {
  const referrer = document.referrer;
  
  // Method 1: Direct Play Store referrer
  if (referrer.includes('android-app://com.android.vending')) {
    return true;
  }
  
  // Method 2: Play Store package referrer
  if (referrer.includes('play.google.com')) {
    return true;
  }
  
  // Method 3: Check for Play Store specific headers or parameters
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('utm_source') === 'play-store' || 
      urlParams.get('referrer') === 'play-store') {
    return true;
  }
  
  // Method 4: Check localStorage for Play Store installation marker
  const playStoreInstall = localStorage.getItem('play-store-install');
  if (playStoreInstall === 'true') {
    return true;
  }
  
  return false;
};

// Test Android WebView capabilities
export const testWebViewCapabilities = (): WebViewCapabilities => {
  const userAgent = navigator.userAgent;
  
  // Extract WebView version from user agent
  let webViewVersion: string | null = null;
  const webViewMatch = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
  if (webViewMatch) {
    webViewVersion = webViewMatch[1];
  }
  
  // Test various web capabilities
  const supportsServiceWorker = 'serviceWorker' in navigator;
  const supportsIndexedDB = 'indexedDB' in window;
  const supportsLocalStorage = (() => {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  })();
  
  return {
    hasWebView: userAgent.includes('wv'),
    webViewVersion,
    supportsServiceWorker,
    supportsIndexedDB,
    supportsLocalStorage,
    userAgent
  };
};

// Get comprehensive Capacitor status and bridge health
export const getCapacitorStatus = (): CapacitorStatus => {
  const errors: string[] = [];
  
  try {
    const isAvailable = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    
    // Test bridge health by attempting to get platform info
    let bridgeHealthy = false;
    try {
      const platformInfo = Capacitor.getPlatform();
      bridgeHealthy = platformInfo !== 'web';
    } catch (error) {
      errors.push(`Bridge health check failed: ${error}`);
      bridgeHealthy = false;
    }
    
    // Get available plugins (this is a simplified check)
    const plugins: string[] = [];
    if (isAvailable) {
      // Check for common Capacitor plugins
      const commonPlugins = ['App', 'Device', 'Network', 'StatusBar', 'SplashScreen'];
      commonPlugins.forEach(plugin => {
        try {
          if ((window as any).Capacitor?.Plugins?.[plugin]) {
            plugins.push(plugin);
          }
        } catch (error) {
          errors.push(`Plugin ${plugin} check failed: ${error}`);
        }
      });
    }
    
    return {
      isAvailable,
      platform,
      isNative,
      bridgeHealthy,
      plugins,
      errors
    };
  } catch (error) {
    errors.push(`Capacitor status check failed: ${error}`);
    return {
      isAvailable: false,
      platform: 'web',
      isNative: false,
      bridgeHealthy: false,
      plugins: [],
      errors
    };
  }
};

// Legacy compatibility functions
export const isPWA = (): boolean => {
  const env = detectTWAEnvironment();
  return env.isPWA;
};

export const isTWA = (): boolean => {
  const env = detectTWAEnvironment();
  return env.isTWA;
};

// Enhanced TWA manifest refresh with validation
export const forceTWAManifestRefresh = async (): Promise<void> => {
  const env = detectTWAEnvironment();
  if (!env.isTWA) return;
  
  try {
    console.log('🔄 Enhanced TWA detected - forcing aggressive manifest refresh');
    
    const timestamp = Date.now();
    
    // Multiple manifest refresh attempts with different cache-busting strategies
    const manifestUrls = [
      `/manifest.json?v=${timestamp}`,
      `/manifest.json?bust=${timestamp}&twa=1`,
      `/manifest.json?${timestamp}`,
      `/manifest.json?capacitor=${env.isCapacitor}&native=${env.capacitorStatus.isNative}`
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
            'If-None-Match': '"invalidate-cache"',
            'X-TWA-Detection': env.detectionMethods.join(','),
            'X-TWA-Confidence': env.confidence
          }
        });
        
        if (response.ok) {
          const manifest = await response.json();
          console.log('📱 Enhanced TWA manifest refreshed successfully:', {
            version: manifest.version,
            url: manifestUrl,
            timestamp: new Date().toISOString(),
            environment: env,
            capacitorBridge: env.capacitorStatus.bridgeHealthy
          });
          
          // Store the new version for comparison
          if (manifest.version) {
            localStorage.setItem('twa-manifest-version', manifest.version);
          }
          
          // Enhanced TWA container notification
          await notifyTWAContainer(manifest.version, env);
          
          break; // Success, no need to try other URLs
        }
      } catch (fetchError) {
        console.warn(`❌ Failed to fetch ${manifestUrl}:`, fetchError);
      }
    }
  } catch (error) {
    console.error('❌ Enhanced TWA manifest refresh failed:', error);
  }
};

// Enhanced TWA container notification with Capacitor support
const notifyTWAContainer = async (version: string, env: TWAEnvironment): Promise<void> => {
  try {
    // Method 1: Legacy Android interface
    if ('android' in window && typeof (window as any).android.onVersionUpdate === 'function') {
      (window as any).android.onVersionUpdate(version);
    }
    
    // Method 2: Capacitor App plugin
    if (env.isCapacitor && env.capacitorStatus.bridgeHealthy) {
      try {
        const { App } = await import('@capacitor/app');
        // Notify app of version update if plugin supports it
        console.log('📱 Notified Capacitor App plugin of version update:', version);
      } catch (error) {
        console.warn('❌ Failed to notify Capacitor App plugin:', error);
      }
    }
    
    // Method 3: Custom TWA interface
    if ('TWA' in window && typeof (window as any).TWA.onVersionUpdate === 'function') {
      (window as any).TWA.onVersionUpdate(version);
    }
  } catch (error) {
    console.warn('❌ Failed to notify TWA container:', error);
  }
};

// Enhanced version detection with Capacitor support
export const getTWAVersion = async (): Promise<string | null> => {
  const env = detectTWAEnvironment();
  
  try {
    // Method 1: Fetch from app-version.json
    const response = await fetch('/app-version.json', { cache: 'no-cache' });
    if (response.ok) {
      const versionInfo = await response.json();
      return versionInfo.version || null;
    }
    
    // Method 2: Try Capacitor App plugin if available
    if (env.isCapacitor && env.capacitorStatus.bridgeHealthy) {
      try {
        const { App } = await import('@capacitor/app');
        const appInfo = await App.getInfo();
        return appInfo.version;
      } catch (error) {
        console.warn('❌ Failed to get version from Capacitor App plugin:', error);
      }
    }
    
    // Method 3: Check package.json version (fallback)
    const packageResponse = await fetch('/package.json', { cache: 'no-cache' });
    if (packageResponse.ok) {
      const packageInfo = await packageResponse.json();
      return packageInfo.version || null;
    }
  } catch (error) {
    console.error('❌ Failed to get TWA version:', error);
  }
  return null;
};

// Enhanced update checking with environment awareness
export const checkTWAUpdate = async (): Promise<boolean> => {
  const env = detectTWAEnvironment();
  if (!env.isTWA) return false;
  
  try {
    // Get cached version and build number
    const cachedVersion = localStorage.getItem('twa-app-version');
    const cachedBuildNumber = localStorage.getItem('twa-build-number');
    const cachedEnvironment = localStorage.getItem('twa-environment');
    
    // Get current version info
    const currentVersion = await getTWAVersion();
    
    if (!currentVersion) return false;
    
    // Get build number from version info
    const response = await fetch('/app-version.json', { cache: 'no-cache' });
    let currentBuildNumber = null;
    if (response.ok) {
      const versionInfo = await response.json();
      currentBuildNumber = versionInfo.buildNumber;
    }
    
    // Store current version, build number, and environment
    localStorage.setItem('twa-app-version', currentVersion);
    if (currentBuildNumber) {
      localStorage.setItem('twa-build-number', currentBuildNumber);
    }
    localStorage.setItem('twa-environment', JSON.stringify(env));
    
    // Check if version, build number, or environment changed
    const versionChanged = cachedVersion && cachedVersion !== currentVersion;
    const buildChanged = cachedBuildNumber && currentBuildNumber && cachedBuildNumber !== currentBuildNumber;
    const environmentChanged = cachedEnvironment && cachedEnvironment !== JSON.stringify(env);
    const needsUpdate = versionChanged || buildChanged || environmentChanged;
    
    if (needsUpdate) {
      console.log('📱 Enhanced TWA update detected:', {
        version: cachedVersion + ' -> ' + currentVersion,
        build: cachedBuildNumber + ' -> ' + currentBuildNumber,
        environment: env,
        environmentChanged
      });
    }
    
    return !!needsUpdate;
  } catch (error) {
    console.error('❌ Enhanced TWA update check failed:', error);
    return false;
  }
};

// Comprehensive TWA environment logging
export const logTWAInfo = (): void => {
  const env = detectTWAEnvironment();
  
  console.log('📱 Enhanced TWA Detection Info:');
  console.log('- Environment:', env);
  console.log('- User Agent:', navigator.userAgent);
  console.log('- Display Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
  console.log('- Referrer:', document.referrer);
  console.log('- Detection Methods:', env.detectionMethods);
  console.log('- Confidence Level:', env.confidence);
  console.log('- Play Store Origin:', env.playStoreOrigin);
  console.log('- WebView Capabilities:', env.webViewCapabilities);
  console.log('- Capacitor Status:', env.capacitorStatus);
  console.log('- Android object:', 'android' in window);
  console.log('- TWA object:', 'TWA' in window);
};

// TWA-Specific Initialization System
export interface TWAInitializationResult {
  success: boolean;
  mode: 'twa-optimized' | 'twa-fallback' | 'standard';
  timing: number;
  errors: string[];
  containerStatus: TWAContainerStatus;
}

export interface TWAContainerStatus {
  communicationHealthy: boolean;
  supportedFeatures: string[];
  limitations: string[];
  lastHeartbeat?: number;
}

// TWA-optimized startup sequence with reduced complexity
export const initializeTWAOptimized = async (): Promise<TWAInitializationResult> => {
  const startTime = Date.now();
  const errors: string[] = [];
  let mode: 'twa-optimized' | 'twa-fallback' | 'standard' = 'standard';
  
  try {
    const env = detectTWAEnvironment();
    
    if (!env.isTWA) {
      return {
        success: true,
        mode: 'standard',
        timing: Date.now() - startTime,
        errors: [],
        containerStatus: {
          communicationHealthy: false,
          supportedFeatures: [],
          limitations: ['not-twa-environment']
        }
      };
    }
    
    console.log('🚀 Starting TWA-optimized initialization...');
    
    // Step 1: Validate TWA container communication
    const containerStatus = await validateTWAContainer();
    
    if (containerStatus.communicationHealthy) {
      mode = 'twa-optimized';
      
      // Step 2: Optimize for TWA environment
      await optimizeForTWAEnvironment(env);
      
      // Step 3: Setup TWA-specific monitoring
      setupTWAMonitoring(containerStatus);
      
      // Step 4: Configure TWA-specific error handling
      setupTWAErrorHandling();
      
      console.log('✅ TWA-optimized initialization completed successfully');
    } else {
      mode = 'twa-fallback';
      errors.push('TWA container communication failed, using fallback mode');
      console.warn('⚠️ TWA container communication failed, using fallback initialization');
      
      // Fallback to standard initialization with TWA awareness
      await initializeTWAFallback(env);
    }
    
    return {
      success: true,
      mode,
      timing: Date.now() - startTime,
      errors,
      containerStatus
    };
    
  } catch (error) {
    errors.push(`TWA initialization failed: ${error}`);
    console.error('❌ TWA initialization failed:', error);
    
    return {
      success: false,
      mode: 'twa-fallback',
      timing: Date.now() - startTime,
      errors,
      containerStatus: {
        communicationHealthy: false,
        supportedFeatures: [],
        limitations: ['initialization-failed']
      }
    };
  }
};

// Validate TWA container communication and capabilities
const validateTWAContainer = async (): Promise<TWAContainerStatus> => {
  const supportedFeatures: string[] = [];
  const limitations: string[] = [];
  let communicationHealthy = false;
  
  try {
    // Test 1: Basic Android interface
    if ('android' in window) {
      supportedFeatures.push('android-interface');
      communicationHealthy = true;
    }
    
    // Test 2: Capacitor bridge health
    const capacitorStatus = getCapacitorStatus();
    if (capacitorStatus.bridgeHealthy) {
      supportedFeatures.push('capacitor-bridge');
      supportedFeatures.push(...capacitorStatus.plugins.map(p => `capacitor-${p.toLowerCase()}`));
      communicationHealthy = true;
    } else if (capacitorStatus.errors.length > 0) {
      limitations.push(...capacitorStatus.errors);
    }
    
    // Test 3: TWA-specific interfaces
    if ('TWA' in window) {
      supportedFeatures.push('twa-interface');
      communicationHealthy = true;
    }
    
    // Test 4: WebView capabilities
    const webViewCaps = testWebViewCapabilities();
    if (webViewCaps.supportsServiceWorker) {
      supportedFeatures.push('service-worker');
    } else {
      limitations.push('no-service-worker-support');
    }
    
    if (webViewCaps.supportsIndexedDB) {
      supportedFeatures.push('indexed-db');
    } else {
      limitations.push('no-indexed-db-support');
    }
    
    if (webViewCaps.supportsLocalStorage) {
      supportedFeatures.push('local-storage');
    } else {
      limitations.push('no-local-storage-support');
    }
    
    // Test 5: Network connectivity
    if (navigator.onLine) {
      supportedFeatures.push('network-connectivity');
    } else {
      limitations.push('offline-mode');
    }
    
    return {
      communicationHealthy,
      supportedFeatures,
      limitations,
      lastHeartbeat: Date.now()
    };
    
  } catch (error) {
    limitations.push(`Container validation failed: ${error}`);
    return {
      communicationHealthy: false,
      supportedFeatures,
      limitations,
      lastHeartbeat: Date.now()
    };
  }
};

// Optimize initialization for TWA environment
const optimizeForTWAEnvironment = async (env: TWAEnvironment): Promise<void> => {
  try {
    // Optimization 1: Reduce initial resource loading
    console.log('🔧 Applying TWA-specific optimizations...');
    
    // Skip heavy animations and transitions on initial load
    document.documentElement.style.setProperty('--initial-animation-duration', '0ms');
    
    // Optimization 2: Prioritize critical resources
    if (env.webViewCapabilities.supportsServiceWorker) {
      // Defer service worker registration to avoid blocking
      setTimeout(() => {
        console.log('📦 Deferring service worker registration for TWA optimization');
      }, 1000);
    }
    
    // Optimization 3: Configure memory management
    if (env.capacitorStatus.isNative) {
      // Enable memory optimizations for native environment
      console.log('💾 Enabling memory optimizations for native TWA');
    }
    
    // Optimization 4: Network request optimization
    // Set shorter timeouts for TWA environment
    const originalFetch = window.fetch;
    window.fetch = async (input, init = {}) => {
      const twaInit = {
        ...init,
        headers: {
          ...init.headers,
          'X-TWA-Environment': 'true',
          'X-TWA-Confidence': env.confidence
        }
      };
      
      // Implement timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await originalFetch(input, { ...twaInit, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };
    
  } catch (error) {
    console.warn('⚠️ TWA optimization failed:', error);
  }
};

// Setup TWA-specific monitoring
const setupTWAMonitoring = (containerStatus: TWAContainerStatus): void => {
  try {
    // Monitor 1: Container health heartbeat
    const heartbeatInterval = setInterval(() => {
      const newStatus = validateTWAContainer();
      newStatus.then(status => {
        if (!status.communicationHealthy && containerStatus.communicationHealthy) {
          console.warn('⚠️ TWA container communication lost, switching to fallback mode');
          // Trigger fallback initialization
          initializeTWAFallback(detectTWAEnvironment());
        }
      });
    }, 30000); // Check every 30 seconds
    
    // Store interval ID for cleanup
    (window as any).__twaHeartbeatInterval = heartbeatInterval;
    
    // Monitor 2: Memory usage tracking
    if ('memory' in performance) {
      const memoryMonitor = setInterval(() => {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          console.warn('⚠️ High memory usage detected in TWA environment');
          // Trigger memory cleanup
          triggerMemoryCleanup();
        }
      }, 60000); // Check every minute
      
      (window as any).__twaMemoryMonitor = memoryMonitor;
    }
    
    // Monitor 3: Network status changes
    window.addEventListener('online', () => {
      console.log('🌐 TWA network connectivity restored');
    });
    
    window.addEventListener('offline', () => {
      console.log('📴 TWA network connectivity lost');
    });
    
  } catch (error) {
    console.warn('⚠️ TWA monitoring setup failed:', error);
  }
};

// Setup TWA-specific error handling
const setupTWAErrorHandling = (): void => {
  try {
    // Enhanced error handler for TWA environment
    const originalErrorHandler = window.onerror;
    
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('🚨 TWA Error:', {
        message,
        source,
        lineno,
        colno,
        error,
        environment: detectTWAEnvironment(),
        timestamp: new Date().toISOString()
      });
      
      // Call original handler if it exists
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      
      return false;
    };
    
    // Enhanced unhandled promise rejection handler
    const originalRejectionHandler = window.onunhandledrejection;
    
    window.onunhandledrejection = function(event) {
      console.error('🚨 TWA Unhandled Promise Rejection:', {
        reason: event.reason,
        promise: event.promise,
        environment: detectTWAEnvironment(),
        timestamp: new Date().toISOString()
      });
      
      // Call original handler if it exists
      if (originalRejectionHandler) {
        return originalRejectionHandler.call(this, event);
      }
    };
    
  } catch (error) {
    console.warn('⚠️ TWA error handling setup failed:', error);
  }
};

// Fallback initialization for TWA when optimized mode fails
const initializeTWAFallback = async (env: TWAEnvironment): Promise<void> => {
  try {
    console.log('🔄 Initializing TWA fallback mode...');
    
    // Fallback 1: Disable advanced features that might cause issues
    localStorage.setItem('twa-fallback-mode', 'true');
    
    // Fallback 2: Use simplified caching strategy
    if (env.webViewCapabilities.supportsLocalStorage) {
      localStorage.setItem('cache-strategy', 'minimal');
    }
    
    // Fallback 3: Reduce animation complexity
    document.documentElement.classList.add('twa-fallback-mode');
    
    // Fallback 4: Setup basic error recovery
    setTimeout(() => {
      const appElement = document.getElementById('root');
      if (appElement && appElement.children.length === 0) {
        console.warn('⚠️ App failed to render in TWA fallback mode, triggering emergency recovery');
        // Trigger emergency recovery if app didn't render
        window.dispatchEvent(new CustomEvent('twa-emergency-recovery'));
      }
    }, 5000);
    
    console.log('✅ TWA fallback initialization completed');
    
  } catch (error) {
    console.error('❌ TWA fallback initialization failed:', error);
  }
};

// Memory cleanup for TWA environment
const triggerMemoryCleanup = (): void => {
  try {
    // Clear unnecessary caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('old') || cacheName.includes('temp')) {
            caches.delete(cacheName);
          }
        });
      });
    }
    
    // Clear old localStorage entries
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('temp-') || key.includes('cache-'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('🧹 TWA memory cleanup completed');
    
  } catch (error) {
    console.warn('⚠️ TWA memory cleanup failed:', error);
  }
};

// Cleanup TWA monitoring on app shutdown
export const cleanupTWAMonitoring = (): void => {
  try {
    if ((window as any).__twaHeartbeatInterval) {
      clearInterval((window as any).__twaHeartbeatInterval);
    }
    
    if ((window as any).__twaMemoryMonitor) {
      clearInterval((window as any).__twaMemoryMonitor);
    }
    
    console.log('🧹 TWA monitoring cleanup completed');
    
  } catch (error) {
    console.warn('⚠️ TWA monitoring cleanup failed:', error);
  }
};

// TWA Manifest Validation and Management System
export interface TWAManifestValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  manifest?: any;
  lastValidated: number;
  needsRefresh: boolean;
}

export interface ManifestRefreshResult {
  success: boolean;
  refreshed: boolean;
  errors: string[];
  newVersion?: string;
  timing: number;
}

// Validate TWA manifest for Play Store compatibility
export const validateTWAManifest = async (): Promise<TWAManifestValidation> => {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  let manifest: any = null;
  let isValid = false;
  let needsRefresh = false;
  
  try {
    // Fetch current manifest
    const response = await fetch('/manifest.json', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      errors.push(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
      return {
        isValid: false,
        errors,
        warnings,
        lastValidated: Date.now(),
        needsRefresh: true
      };
    }
    
    manifest = await response.json();
    
    // Validate required TWA fields
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Validate TWA-specific requirements
    if (manifest.display !== 'standalone' && manifest.display !== 'fullscreen') {
      errors.push(`Invalid display mode: ${manifest.display}. TWA requires 'standalone' or 'fullscreen'`);
    }
    
    if (!manifest.start_url || !manifest.start_url.startsWith('https://')) {
      errors.push('start_url must be a valid HTTPS URL for TWA');
    }
    
    // Validate icons for Play Store requirements
    if (!manifest.icons || manifest.icons.length === 0) {
      errors.push('Icons are required for TWA');
    } else {
      const requiredSizes = ['192x192', '512x512'];
      const availableSizes = manifest.icons.map((icon: any) => icon.sizes);
      const missingSizes = requiredSizes.filter(size => !availableSizes.includes(size));
      
      if (missingSizes.length > 0) {
        warnings.push(`Missing recommended icon sizes: ${missingSizes.join(', ')}`);
      }
    }
    
    // Validate theme colors
    if (manifest.theme_color && !isValidColor(manifest.theme_color)) {
      warnings.push(`Invalid theme_color format: ${manifest.theme_color}`);
    }
    
    if (manifest.background_color && !isValidColor(manifest.background_color)) {
      warnings.push(`Invalid background_color format: ${manifest.background_color}`);
    }
    
    // Check for TWA-specific optimizations
    if (!manifest.orientation) {
      warnings.push('Consider setting orientation for better TWA experience');
    }
    
    if (!manifest.categories || manifest.categories.length === 0) {
      warnings.push('Consider adding categories for better Play Store classification');
    }
    
    // Validate scope for security
    if (manifest.scope && !manifest.scope.startsWith('https://')) {
      errors.push('Scope must be a valid HTTPS URL for TWA');
    }
    
    // Check for version information
    const cachedVersion = localStorage.getItem('twa-manifest-version');
    if (manifest.version && cachedVersion && manifest.version !== cachedVersion) {
      needsRefresh = true;
    }
    
    isValid = errors.length === 0;
    
    return {
      isValid,
      errors,
      warnings,
      manifest,
      lastValidated: Date.now(),
      needsRefresh
    };
    
  } catch (error) {
    errors.push(`Manifest validation failed: ${error}`);
    return {
      isValid: false,
      errors,
      warnings,
      lastValidated: Date.now(),
      needsRefresh: true
    };
  }
};

// Refresh TWA manifest with enhanced validation
export const refreshTWAManifest = async (): Promise<ManifestRefreshResult> => {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    console.log('🔄 Starting enhanced TWA manifest refresh...');
    
    const env = detectTWAEnvironment();
    if (!env.isTWA) {
      return {
        success: true,
        refreshed: false,
        errors: ['Not in TWA environment'],
        timing: Date.now() - startTime
      };
    }
    
    // Step 1: Validate current manifest
    const validation = await validateTWAManifest();
    if (!validation.isValid) {
      errors.push(...validation.errors);
    }
    
    // Step 2: Force refresh if needed
    if (validation.needsRefresh || !validation.isValid) {
      await forceTWAManifestRefresh();
      
      // Step 3: Re-validate after refresh
      const revalidation = await validateTWAManifest();
      if (revalidation.isValid) {
        console.log('✅ TWA manifest refreshed and validated successfully');
        
        // Update cached version
        if (revalidation.manifest?.version) {
          localStorage.setItem('twa-manifest-version', revalidation.manifest.version);
        }
        
        // Notify TWA container of refresh
        await notifyManifestRefresh(revalidation.manifest);
        
        return {
          success: true,
          refreshed: true,
          errors: [],
          newVersion: revalidation.manifest?.version,
          timing: Date.now() - startTime
        };
      } else {
        errors.push(...revalidation.errors);
      }
    }
    
    return {
      success: validation.isValid,
      refreshed: false,
      errors,
      timing: Date.now() - startTime
    };
    
  } catch (error) {
    errors.push(`Manifest refresh failed: ${error}`);
    return {
      success: false,
      refreshed: false,
      errors,
      timing: Date.now() - startTime
    };
  }
};

// Notify TWA container of manifest refresh
const notifyManifestRefresh = async (manifest: any): Promise<void> => {
  try {
    const env = detectTWAEnvironment();
    
    // Method 1: Capacitor App plugin notification
    if (env.isCapacitor && env.capacitorStatus.bridgeHealthy) {
      try {
        const { App } = await import('@capacitor/app');
        // Trigger app refresh if supported
        console.log('📱 Notified Capacitor App of manifest refresh');
      } catch (error) {
        console.warn('❌ Failed to notify Capacitor App:', error);
      }
    }
    
    // Method 2: Android interface notification
    if ('android' in window) {
      try {
        const android = (window as any).android;
        if (typeof android.onManifestRefresh === 'function') {
          android.onManifestRefresh(JSON.stringify(manifest));
        }
      } catch (error) {
        console.warn('❌ Failed to notify Android interface:', error);
      }
    }
    
    // Method 3: Custom TWA interface
    if ('TWA' in window) {
      try {
        const twa = (window as any).TWA;
        if (typeof twa.onManifestUpdate === 'function') {
          twa.onManifestUpdate(manifest);
        }
      } catch (error) {
        console.warn('❌ Failed to notify TWA interface:', error);
      }
    }
    
    // Method 4: Broadcast event for other components
    window.dispatchEvent(new CustomEvent('twa-manifest-refreshed', {
      detail: { manifest, timestamp: Date.now() }
    }));
    
  } catch (error) {
    console.warn('❌ Failed to notify manifest refresh:', error);
  }
};

// Validate color format (hex, rgb, hsl, named colors)
const isValidColor = (color: string): boolean => {
  try {
    // Create a temporary element to test color validity
    const element = document.createElement('div');
    element.style.color = color;
    return element.style.color !== '';
  } catch {
    return false;
  }
};

// Setup automatic manifest monitoring
export const setupManifestMonitoring = (): void => {
  try {
    const env = detectTWAEnvironment();
    if (!env.isTWA) return;
    
    console.log('📋 Setting up TWA manifest monitoring...');
    
    // Monitor 1: Periodic manifest validation
    const manifestCheckInterval = setInterval(async () => {
      const validation = await validateTWAManifest();
      if (!validation.isValid) {
        console.warn('⚠️ TWA manifest validation failed:', validation.errors);
        // Attempt automatic refresh
        await refreshTWAManifest();
      }
    }, 300000); // Check every 5 minutes
    
    // Store interval for cleanup
    (window as any).__twaManifestMonitor = manifestCheckInterval;
    
    // Monitor 2: Listen for visibility changes (app resume)
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        // App became visible, check for manifest updates
        const validation = await validateTWAManifest();
        if (validation.needsRefresh) {
          console.log('🔄 App resumed, refreshing manifest...');
          await refreshTWAManifest();
        }
      }
    });
    
    // Monitor 3: Listen for network status changes
    window.addEventListener('online', async () => {
      console.log('🌐 Network restored, validating manifest...');
      await validateTWAManifest();
    });
    
    console.log('✅ TWA manifest monitoring setup completed');
    
  } catch (error) {
    console.warn('⚠️ Manifest monitoring setup failed:', error);
  }
};

// Cleanup manifest monitoring
export const cleanupManifestMonitoring = (): void => {
  try {
    if ((window as any).__twaManifestMonitor) {
      clearInterval((window as any).__twaManifestMonitor);
      delete (window as any).__twaManifestMonitor;
    }
    
    console.log('🧹 TWA manifest monitoring cleanup completed');
    
  } catch (error) {
    console.warn('⚠️ Manifest monitoring cleanup failed:', error);
  }
};

// WebView settings optimization for consistent behavior
export const optimizeWebViewSettings = async (): Promise<void> => {
  try {
    const env = detectTWAEnvironment();
    if (!env.isTWA || !env.isCapacitor) return;
    
    console.log('⚙️ Optimizing WebView settings for TWA...');
    
    // Apply CSS optimizations for WebView
    const style = document.createElement('style');
    style.textContent = `
      /* TWA WebView optimizations */
      * {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      
      input, textarea, [contenteditable] {
        -webkit-user-select: text;
        user-select: text;
      }
      
      /* Prevent zoom on input focus */
      input, select, textarea {
        font-size: 16px !important;
      }
      
      /* Smooth scrolling for WebView */
      html {
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
      }
      
      /* Hardware acceleration hints */
      .animated, .transition {
        -webkit-transform: translateZ(0);
        transform: translateZ(0);
        will-change: transform;
      }
    `;
    document.head.appendChild(style);
    
    // Set viewport meta tag for consistent behavior
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
    
    console.log('✅ WebView settings optimization completed');
    
  } catch (error) {
    console.warn('⚠️ WebView settings optimization failed:', error);
  }
};