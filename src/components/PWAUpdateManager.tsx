import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Download } from 'lucide-react';
import { isTWA, forceTWAManifestRefresh, checkTWAUpdate, logTWAInfo } from '@/utils/twaDetection';

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
      
      // Force TWA manifest refresh on startup
      await forceTWAManifestRefresh();
      
      if ('serviceWorker' in navigator) {
        try {
          // Enhanced update checking for TWA and PWA
          const checkForUpdates = async () => {
            const existingRegistration = await navigator.serviceWorker.getRegistration();
            if (existingRegistration) {
              setRegistration(existingRegistration);
              console.log('🔄 Checking for PWA updates...');
              await existingRegistration.update();
            }
            
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
    console.log('🔄 Applying update...');

    try {
      // TWA-specific update handling
      if (isTWA()) {
        console.log('📱 Applying TWA update');
        
        // Force manifest refresh
        await forceTWAManifestRefresh();
        
        // Clear all caches for clean TWA update
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log('🧹 TWA caches cleared');
        }
        
        // Force page reload for TWA
        window.location.reload();
        return;
      }

      // Standard PWA update handling
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        // Fallback: force reload
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Update failed:', error);
      // Fallback: force reload
      window.location.reload();
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