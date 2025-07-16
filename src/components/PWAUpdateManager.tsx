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
    // Register service worker manually for better control
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          console.log('🔄 Registering service worker...');
          const swRegistration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none' // Always check for updates
          });

          setRegistration(swRegistration);
          console.log('✅ Service worker registered successfully');

          // Check for updates immediately
          await swRegistration.update();

          // Listen for updates
          swRegistration.addEventListener('updatefound', () => {
            console.log('🔍 Service worker update found');
            const newWorker = swRegistration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('📦 New service worker installed, update available');
                  setUpdateAvailable(true);
                  
                  // Notify parent component
                  if (onUpdateAvailable) {
                    onUpdateAvailable(() => applyUpdate());
                  }
                }
              });
            }
          });

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'SKIP_WAITING') {
              console.log('🚀 Service worker activated, reloading page');
              window.location.reload();
            }
          });

          // Check for updates every 30 seconds when the page is visible
          const checkForUpdates = () => {
            if (document.visibilityState === 'visible') {
              swRegistration.update().catch(console.error);
            }
          };

          setInterval(checkForUpdates, 30000);
          document.addEventListener('visibilitychange', checkForUpdates);

        } catch (error) {
          console.error('❌ Service worker registration failed:', error);
        }
      }
    };

    registerSW();
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