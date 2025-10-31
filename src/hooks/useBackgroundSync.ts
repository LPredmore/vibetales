import { useEffect, useState, useCallback } from 'react';
import { backgroundSync } from '@/services/backgroundSync';

export interface BackgroundSyncStatus {
  isSupported: boolean;
  isRegistered: boolean;
  hasPermissions: boolean;
  error?: string;
}

export const useBackgroundSync = () => {
  const [status, setStatus] = useState<BackgroundSyncStatus>({
    isSupported: false,
    isRegistered: false,
    hasPermissions: false
  });

  useEffect(() => {
    const checkSupport = () => {
      const isSupported = 'serviceWorker' in navigator && 
                         'sync' in window.ServiceWorkerRegistration.prototype;
      
      setStatus(prev => ({ ...prev, isSupported }));
    };

    checkSupport();
  }, []);

  const registerSync = useCallback(async () => {
    try {
      const registered = await backgroundSync.registerPeriodicSync();
      const hasPermissions = await backgroundSync.requestPermissions();
      
      setStatus(prev => ({
        ...prev,
        isRegistered: registered,
        hasPermissions,
        error: undefined
      }));

      return registered && hasPermissions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus(prev => ({
        ...prev,
        error: errorMessage
      }));
      return false;
    }
  }, []);

  const queueTask = useCallback((type: 'update-check' | 'sync-preferences' | 'prefetch-content' | 'cleanup-cache', data?: any) => {
    backgroundSync.queueTask(type, data);
  }, []);

  return {
    status,
    registerSync,
    queueTask
  };
};