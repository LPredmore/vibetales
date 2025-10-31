import React, { useEffect, useState } from 'react';
import { EmergencyDebugOverlay } from './EmergencyDebugOverlay';
import { debugLogger } from '@/utils/debugLogger';

export const EmergencyDebugActivator: React.FC = () => {
  const [showEmergencyDebug, setShowEmergencyDebug] = useState(false);

  useEffect(() => {
    // Check for emergency debug activation via URL or localStorage
    const checkEmergencyDebug = () => {
      const urlParams = new URLSearchParams(window.location.search);
      
      const emergencyMode = urlParams.get('debug') === 'emergency' || 
                           localStorage.getItem('emergency-debug') === 'true';
      
      if (emergencyMode) {
        debugLogger.logError('CRITICAL', 'Emergency debug mode activated', {
          via: urlParams.get('debug') === 'emergency' ? 'URL' : 'localStorage',
          userAgent: navigator.userAgent,
          url: window.location.href
        });
        setShowEmergencyDebug(true);
      }
    };

    checkEmergencyDebug();

    // Listen for keyboard shortcut (Ctrl+Shift+D+E+B+U+G)
    let keySequence = '';
    const targetSequence = 'debug';
    
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey) {
        keySequence += event.key.toLowerCase();
        
        if (keySequence.length > targetSequence.length) {
          keySequence = keySequence.slice(-targetSequence.length);
        }
        
        if (keySequence === targetSequence) {
          debugLogger.logError('CRITICAL', 'Emergency debug activated via keyboard shortcut');
          localStorage.setItem('emergency-debug', 'true');
          setShowEmergencyDebug(true);
          keySequence = '';
        }
      } else {
        keySequence = '';
      }
    };

    // Listen for triple-click on top-left corner (for mobile)
    let clickCount = 0;
    let clickTimer: NodeJS.Timeout;
    
    const handleClick = (event: MouseEvent) => {
      // Check if click is in top-left 100x100 pixel area
      if (event.clientX < 100 && event.clientY < 100) {
        clickCount++;
        
        if (clickTimer) {
          clearTimeout(clickTimer);
        }
        
        clickTimer = setTimeout(() => {
          if (clickCount >= 5) {
            debugLogger.logError('CRITICAL', 'Emergency debug activated via corner clicks');
            localStorage.setItem('emergency-debug', 'true');
            setShowEmergencyDebug(true);
          }
          clickCount = 0;
        }, 1000);
      } else {
        clickCount = 0;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleClick);
      if (clickTimer) {
        clearTimeout(clickTimer);
      }
    };
  }, []);

  const closeEmergencyDebug = () => {
    setShowEmergencyDebug(false);
    localStorage.removeItem('emergency-debug');
    
    // Remove debug parameter from URL if present
    const url = new URL(window.location.href);
    url.searchParams.delete('debug');
    window.history.replaceState({}, '', url.toString());
  };

  if (!showEmergencyDebug) {
    return null;
  }

  return <EmergencyDebugOverlay onClose={closeEmergencyDebug} />;
};