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
    // Use Vite PWA's built-in registration, don't register manually
    const setupUpdateListener = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // Wait for existing registration from Vite PWA
          const existingRegistration = await navigator.serviceWorker.getRegistration();
          
          if (existingRegistration) {
            setRegistration(existingRegistration);
            console.log('✅ Using existing service worker registration');

            // Listen for updates on existing registration
            existingRegistration.addEventListener('updatefound', () => {
              console.log('🔍 Service worker update found');
              const newWorker = existingRegistration.installing;
              
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
          }
        } catch (error) {
          console.error('❌ Service worker setup failed:', error);
        }
      }
    };

    setupUpdateListener();
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