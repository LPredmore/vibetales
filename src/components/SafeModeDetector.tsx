import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, X } from 'lucide-react';
import { recoveryActionSystem } from '@/utils/recoveryActionSystem';
import { debugLogger } from '@/utils/debugLogger';

export const SafeModeDetector: React.FC = () => {
  const [isSafeModeActive, setIsSafeModeActive] = useState(false);
  const [safeModeConfig, setSafeModeConfig] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Check if safe mode is active
    const safeModeActive = recoveryActionSystem.isSafeModeActive();
    const config = recoveryActionSystem.getSafeModeConfig();
    
    setIsSafeModeActive(safeModeActive);
    setSafeModeConfig(config);
    
    if (safeModeActive) {
      setShowNotification(true);
      debugLogger.logLifecycle('INFO', 'Safe mode detected on app start', { config });
      
      // Apply safe mode configurations
      applySafeModeSettings(config);
      
      // Show notification for a few seconds, then auto-hide
      setTimeout(() => {
        setShowNotification(false);
      }, 10000);
    }
  }, []);

  const applySafeModeSettings = (config: any) => {
    if (!config) return;
    
    // Apply CSS classes for safe mode
    const body = document.body;
    
    if (config.disableAnimations) {
      body.classList.add('safe-mode-no-animations');
    }
    
    if (config.enableMinimalUI) {
      body.classList.add('safe-mode-minimal-ui');
    }
    
    // Add safe mode styles
    const style = document.createElement('style');
    style.textContent = `
      .safe-mode-no-animations * {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      
      .safe-mode-minimal-ui .clay-card {
        box-shadow: none !important;
        background: white !important;
        border: 1px solid #ddd !important;
      }
      
      .safe-mode-minimal-ui .clay-button {
        box-shadow: none !important;
        background: #f5f5f5 !important;
        border: 1px solid #ccc !important;
      }
      
      .safe-mode-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        background: #ff9800;
        color: white;
        padding: 8px 16px;
        text-align: center;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(style);
    
    // Add safe mode banner
    if (config.enableMinimalUI) {
      const banner = document.createElement('div');
      banner.className = 'safe-mode-banner';
      banner.textContent = 'Safe Mode Active - Limited functionality enabled for stability';
      document.body.appendChild(banner);
      
      // Adjust body padding to account for banner
      document.body.style.paddingTop = '40px';
    }
  };

  const exitSafeMode = async () => {
    try {
      debugLogger.logLifecycle('INFO', 'User requested to exit safe mode');
      await recoveryActionSystem.exitSafeMode();
    } catch (error) {
      debugLogger.logError('ERROR', 'Failed to exit safe mode', error);
    }
  };

  const dismissNotification = () => {
    setShowNotification(false);
  };

  if (!isSafeModeActive || !showNotification) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert className="border-orange-200 bg-orange-50">
        <Shield className="w-4 h-4 text-orange-600" />
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <AlertTitle className="text-orange-800">Safe Mode Active</AlertTitle>
            <AlertDescription className="text-orange-700 mt-1">
              The app is running with limited features for maximum stability. 
              Some functionality may be disabled.
            </AlertDescription>
            
            {safeModeConfig && (
              <div className="mt-2 text-xs text-orange-600">
                <div>Settings:</div>
                <ul className="list-disc list-inside ml-2">
                  {safeModeConfig.disableServiceWorker && <li>Service Worker disabled</li>}
                  {safeModeConfig.disableOfflineFeatures && <li>Offline features disabled</li>}
                  {safeModeConfig.disableAnimations && <li>Animations disabled</li>}
                  {safeModeConfig.enableMinimalUI && <li>Minimal UI enabled</li>}
                </ul>
              </div>
            )}
            
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={exitSafeMode}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                Exit Safe Mode
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismissNotification}
                className="text-orange-600 hover:bg-orange-100"
              >
                Dismiss
              </Button>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={dismissNotification}
            className="ml-2 text-orange-600 hover:bg-orange-100 p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Alert>
    </div>
  );
};