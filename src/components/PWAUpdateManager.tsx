
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Download } from 'lucide-react';
import { isTWA, forceTWAManifestRefresh, checkTWAUpdate, logTWAInfo } from '@/utils/twaDetection';
import { ALLOWED_ORIGINS, isAllowedDomain, getCurrentDomain } from '@/utils/domainConfig';
import { backgroundSync } from '@/services/backgroundSync';

interface PWAUpdateManagerProps {
  onUpdateAvailable?: (updateFunction: () => void) => void;
}

export const PWAUpdateManager = ({ onUpdateAvailable }: PWAUpdateManagerProps) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const setupUpdateListener = async () => {
      // Log TWA info for debugging
      logTWAInfo();
      
      // Initialize background sync service
      try {
        const syncRegistered = await backgroundSync.registerPeriodicSync();
        if (syncRegistered) {
          await backgroundSync.requestPermissions();
          console.log('🔄 Background sync initialized successfully');
        }
      } catch (error) {
        console.warn('⚠️ Background sync setup failed:', error);
      }
      
      // Force TWA manifest refresh on startup
      await forceTWAManifestRefresh();
      
      const currentUrl = getCurrentDomain();
      
      // Only log domain validation in debug mode to prevent console spam
      const isDebugMode = localStorage.getItem('enable-debug') === 'true' || 
                         window.location.search.includes('debug=true');
      
      if (isDebugMode) {
        console.log('🌐 Current URL:', currentUrl);
        
        // Enhanced domain validation using centralized config
        if (!isAllowedDomain(currentUrl)) {
          console.warn('⚠️ App is running on unexpected URL:', currentUrl);
          console.warn('⚠️ Allowed domains:', ALLOWED_ORIGINS);
        } else {
          console.log('✅ App running on approved domain');
        }
      }
      
      // Let VitePWA handle all service worker registration
      if ('serviceWorker' in navigator) {
        try {
          // Enhanced update checking for TWA and PWA
          const checkForUpdates = async () => {
            const existingRegistration = await navigator.serviceWorker.getRegistration();
            if (existingRegistration) {
              setRegistration(existingRegistration);
              
              // Only log in debug mode
              const isDebugMode = localStorage.getItem('enable-debug') === 'true' || 
                                 window.location.search.includes('debug=true');
              if (isDebugMode) {
                console.log('🔄 Checking for PWA updates...');
              }
              
              await existingRegistration.update();
            }
            // Queue background sync tasks
            backgroundSync.queueTask('update-check');
            backgroundSync.queueTask('sync-preferences');
            
            // Additional TWA-specific update check
            if (isTWA()) {
              const twaUpdateAvailable = await checkTWAUpdate();
              if (twaUpdateAvailable) {
                console.log('📱 TWA update detected');
                setUpdateAvailable(true);
                
                if (onUpdateAvailable) {
                  onUpdateAvailable(() => applyUpdate());
                }
              }
            }
          };

          // Initial check
          await checkForUpdates();
          
          // More aggressive checking for TWA (every 15 seconds)
          const updateInterval = setInterval(checkForUpdates, isTWA() ? 15000 : 30000);

          // Listen for service worker updates
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('📦 New service worker activated, update available');
            setUpdateAvailable(true);
            
            if (onUpdateAvailable) {
              onUpdateAvailable(() => applyUpdate());
            }
          });

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'SKIP_WAITING') {
              console.log('🚀 Service worker activated, reloading page');
              window.location.reload();
            }
          });

          // TWA-specific visibility change handler
          if (isTWA()) {
            const handleVisibilityChange = async () => {
              if (!document.hidden) {
                console.log('📱 TWA app resumed, checking for updates');
                await checkForUpdates();
              }
            };
            
            document.addEventListener('visibilitychange', handleVisibilityChange);
            
            return () => {
              clearInterval(updateInterval);
              document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
          }

          return () => clearInterval(updateInterval);
        } catch (error) {
          console.error('❌ Service worker setup failed:', error);
        }
      }
    };

    const cleanup = setupUpdateListener();
    return () => {
      if (cleanup) cleanup.then(fn => fn && fn());
    };
  }, [onUpdateAvailable]);

  const applyUpdate = async () => {
    setIsUpdating(true);
    try {
      console.log('🔄 Applying PWA update...');
      
      // Enhanced TWA update handling with aggressive cache busting
      if (isTWA()) {
        console.log('📱 TWA update detected - applying aggressive update strategy');
        
        // Step 1: Activate service worker FIRST before clearing anything
        if (registration) {
          console.log('⚡ Activating new service worker...');
          await registration.update();
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            // Wait for activation
            await new Promise((resolve) => {
              const handleStateChange = () => {
                if (registration.active) {
                  resolve(undefined);
                }
              };
              if (registration.waiting) {
                registration.waiting.addEventListener('statechange', handleStateChange);
              }
              // Timeout after 2 seconds
              setTimeout(resolve, 2000);
            });
          }
        }
        
        // Step 2: Now safe to clear caches - SW is active
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          // Only clear asset and image caches, NOT auth or API caches
          const cachesToClear = cacheNames.filter(name => 
            name.includes('assets-') || 
            name.includes('images-') ||
            name.includes('workbox-') ||
            name.includes('vite-')
          );
          await Promise.all(
            cachesToClear.map(cacheName => {
              console.log(`🗑️ Clearing cache: ${cacheName}`);
              return caches.delete(cacheName);
            })
          );
          console.log(`✅ Cleared ${cachesToClear.length} caches, preserved ${cacheNames.length - cachesToClear.length} auth/API caches`);
        }
        
        // Step 3: Force manifest refresh with cache busting
        await forceTWAManifestRefresh();
        
        // Step 4: Clear ONLY version info (preserve all auth tokens)
        localStorage.removeItem('twa-app-version');
        localStorage.removeItem('twa-manifest-version');
        // DO NOT clear: 'sb-*' keys (Supabase auth tokens)
        
        // Step 5: Add cache-busting parameters and reload
        const timestamp = Date.now();
        window.location.href = `${window.location.origin}/?twa_update=${timestamp}&v=${timestamp}`;
      } else if (registration?.waiting) {
        // Standard PWA update - activate SW first
        console.log('⚡ Activating PWA service worker...');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        // Wait briefly for activation
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Update failed:', error);
      // Fallback: aggressive reload with cache busting
      const timestamp = Date.now();
      window.location.href = `${window.location.origin}/?fallback_update=${timestamp}`;
    } finally {
      setIsUpdating(false);
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable) return null;

  return (
    <Alert className="fixed bottom-4 right-4 z-50 max-w-sm shadow-lg">
      <Download className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-2">
        <span>{isTWA() ? 'App update available from Play Store!' : 'A new version is available!'}</span>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={applyUpdate}
            disabled={isUpdating}
            className="flex items-center gap-1"
          >
            {isUpdating ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            {isUpdating ? 'Updating...' : 'Update'}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={dismissUpdate}
            disabled={isUpdating}
          >
            Later
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
