import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Download } from 'lucide-react';

interface PWAUpdateManagerProps {
  onUpdateAvailable?: (updateFunction: () => void) => void;
}

export const PWAUpdateManager = ({ onUpdateAvailable }: PWAUpdateManagerProps) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const setupUpdateListener = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // Check for updates immediately on startup
          const checkForUpdates = async () => {
            const existingRegistration = await navigator.serviceWorker.getRegistration();
            if (existingRegistration) {
              setRegistration(existingRegistration);
              console.log('🔄 Checking for PWA updates...');
              await existingRegistration.update();
            }
          };

          // Initial check
          await checkForUpdates();
          
          // Check for updates periodically (every 30 seconds)
          const updateInterval = setInterval(checkForUpdates, 30000);

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
    if (!registration) return;

    setIsUpdating(true);
    console.log('🔄 Applying update...');

    try {
      // Tell the waiting service worker to skip waiting
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // The page will reload automatically when the service worker activates
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
        <span>A new version is available!</span>
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