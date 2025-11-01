import React, { useState, useEffect } from 'react';
import { serviceWorkerFailureHandler } from '../utils/serviceWorkerFailureHandler';
import { serviceWorkerManager } from '../utils/serviceWorkerManager';
import { simplifiedCacheManager } from '../utils/simplifiedCacheManager';

interface ServiceWorkerRecoveryProps {
  onClose?: () => void;
  onRecoverySuccess?: () => void;
}

export const ServiceWorkerRecovery: React.FC<ServiceWorkerRecoveryProps> = ({
  onClose,
  onRecoverySuccess
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [recoveryActions, setRecoveryActions] = useState<any[]>([]);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [lastResult, setLastResult] = useState<string>('');

  useEffect(() => {
    // Listen for manual setup events
    const handleManualSetup = (event: CustomEvent) => {
      setRecoveryActions(event.detail.recoveryActions || []);
      setHealthStatus(serviceWorkerFailureHandler.getHealthStatus());
      setIsVisible(true);
    };

    // Listen for graceful mode events
    const handleGracefulMode = (event: CustomEvent) => {
      if (event.detail.enabled) {
        setIsVisible(true);
      }
    };

    window.addEventListener('sw-manual-setup', handleManualSetup as EventListener);
    window.addEventListener('sw-graceful-mode', handleGracefulMode as EventListener);

    return () => {
      window.removeEventListener('sw-manual-setup', handleManualSetup as EventListener);
      window.removeEventListener('sw-graceful-mode', handleGracefulMode as EventListener);
    };
  }, []);

  const executeRecoveryAction = async (actionId: string) => {
    setIsExecuting(true);
    setLastResult('');

    try {
      const success = await serviceWorkerFailureHandler.executeRecoveryAction(actionId);
      
      if (success) {
        setLastResult(`✅ Recovery action "${actionId}" completed successfully`);
        
        // Check if we should close the recovery UI
        setTimeout(() => {
          onRecoverySuccess?.();
          setIsVisible(false);
        }, 2000);
      } else {
        setLastResult(`❌ Recovery action "${actionId}" failed`);
      }
    } catch (error) {
      setLastResult(`❌ Error executing "${actionId}": ${(error as Error).message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const checkServiceWorkerStatus = async () => {
    const status = await serviceWorkerManager.getStatus();
    const cacheStats = await simplifiedCacheManager.getCacheStats();
    
    setLastResult(`
Service Worker Status:
- Registered: ${status.registered ? '✅' : '❌'}
- Active: ${status.active ? '✅' : '❌'}
- Updating: ${status.updating ? '🔄' : '❌'}

Cache Status:
- Entries: ${cacheStats.entryCount}
- Size: ${Math.round(cacheStats.totalSize / 1024)}KB
- Critical Resources: ${cacheStats.criticalResourcesCached}
    `);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Service Worker Recovery
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              The app is running in limited mode due to service worker issues. 
              You can try the recovery options below to restore full functionality.
            </p>
          </div>

          {healthStatus && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
              <h3 className="font-semibold text-sm mb-2">Current Status:</h3>
              <div className="text-xs space-y-1">
                <div>Registered: {healthStatus.isRegistered ? '✅' : '❌'}</div>
                <div>Active: {healthStatus.isActive ? '✅' : '❌'}</div>
                <div>Healthy: {healthStatus.isHealthy ? '✅' : '❌'}</div>
                <div>Error Count: {healthStatus.errorCount}</div>
                {healthStatus.lastError && (
                  <div className="text-red-600">
                    Last Error: {healthStatus.lastError.message}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 mb-4">
            <button
              onClick={checkServiceWorkerStatus}
              disabled={isExecuting}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
            >
              Check Current Status
            </button>

            {recoveryActions.map((action) => (
              <button
                key={action.id}
                onClick={() => executeRecoveryAction(action.id)}
                disabled={isExecuting}
                className={`w-full px-4 py-2 rounded text-sm font-medium disabled:opacity-50 ${
                  action.severity === 'high'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : action.severity === 'medium'
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isExecuting ? '⏳ Working...' : action.name}
                <div className="text-xs opacity-90 mt-1">
                  {action.description}
                </div>
              </button>
            ))}
          </div>

          {lastResult && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
              <h3 className="font-semibold text-sm mb-2">Result:</h3>
              <pre className="text-xs whitespace-pre-wrap text-gray-700">
                {lastResult}
              </pre>
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p>💡 <strong>Clear Cache & Retry:</strong> Removes cached data and tries again</p>
            <p>🔄 <strong>Force Re-register:</strong> Completely resets the service worker</p>
            <p>🛡️ <strong>Graceful Mode:</strong> Continues with limited offline features</p>
            <p>⚠️ <strong>Factory Reset:</strong> Clears all app data (use as last resort)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceWorkerRecovery;