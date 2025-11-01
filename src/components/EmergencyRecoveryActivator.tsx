import React, { useState, useEffect } from 'react';
import { EmergencyRecoveryInterface } from './EmergencyRecoveryInterface';
import { emergencyDiagnosticReporter } from '@/utils/emergencyDiagnosticReporter';
import { recoveryActionSystem } from '@/utils/recoveryActionSystem';
import { debugLogger } from '@/utils/debugLogger';

interface EmergencyRecoveryActivatorProps {
  timeoutMs?: number;
  enableAutoActivation?: boolean;
}

export const EmergencyRecoveryActivator: React.FC<EmergencyRecoveryActivatorProps> = ({
  timeoutMs = 5000, // Reduced from 10 seconds to 5 seconds as per requirements
  enableAutoActivation = true
}) => {
  const [isRecoveryVisible, setIsRecoveryVisible] = useState(false);
  const [activationTrigger, setActivationTrigger] = useState<'timeout' | 'error' | 'manual' | 'health-check'>('manual');
  const [hasActivated, setHasActivated] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let hasLoaded = false;

    // Check if we're already in emergency mode
    if (recoveryActionSystem.isEmergencyModeActive()) {
      setActivationTrigger('error');
      setIsRecoveryVisible(true);
      setHasActivated(true);
      return;
    }

    // Set up timeout for automatic activation
    if (enableAutoActivation && !hasActivated) {
      timeoutId = setTimeout(() => {
        if (!hasLoaded && !hasActivated) {
          debugLogger.logError('CRITICAL', 'App loading timeout - activating emergency recovery', {
            timeoutMs,
            trigger: 'timeout'
          });
          
          setActivationTrigger('timeout');
          setIsRecoveryVisible(true);
          setHasActivated(true);
          
          // Generate emergency report
          emergencyDiagnosticReporter.generateEmergencyReport('timeout').catch(error => {
            debugLogger.logError('ERROR', 'Failed to generate timeout emergency report', error);
          });
        }
      }, timeoutMs);
    }

    // Listen for app ready signals
    const handleAppReady = () => {
      hasLoaded = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Mark successful load
      localStorage.setItem('last-successful-load', new Date().toISOString());
      localStorage.removeItem('consecutive-failures');
      
      debugLogger.logLifecycle('INFO', 'App loaded successfully - emergency recovery not needed');
    };

    // Listen for various ready signals
    const readyEvents = [
      'app-ready',
      'react-mount-complete',
      'auth-initialized',
      'startup-complete'
    ];

    readyEvents.forEach(event => {
      window.addEventListener(event, handleAppReady);
    });

    // Also check for DOM content loaded and interactive states
    const checkReadyState = () => {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // Give a small delay to ensure React has mounted
        setTimeout(() => {
          const rootElement = document.getElementById('root');
          if (rootElement && rootElement.children.length > 0) {
            handleAppReady();
          }
        }, 1000);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkReadyState);
    } else {
      checkReadyState();
    }

    // Listen for emergency activation events
    const handleEmergencyActivation = (event: CustomEvent) => {
      if (!hasActivated) {
        debugLogger.logError('CRITICAL', 'Emergency mode activated by system', event.detail);
        
        setActivationTrigger('error');
        setIsRecoveryVisible(true);
        setHasActivated(true);
        
        // Generate emergency report
        emergencyDiagnosticReporter.generateEmergencyReport('error').catch(error => {
          debugLogger.logError('ERROR', 'Failed to generate error emergency report', error);
        });
      }
    };

    const handleShowRecovery = (event: CustomEvent) => {
      if (!hasActivated) {
        const trigger = event.detail?.trigger || 'manual';
        debugLogger.logLifecycle('INFO', 'Emergency recovery UI requested', { trigger });
        
        setActivationTrigger(trigger);
        setIsRecoveryVisible(true);
        setHasActivated(true);
        
        // Generate emergency report
        emergencyDiagnosticReporter.generateEmergencyReport(trigger).catch(error => {
          debugLogger.logError('ERROR', 'Failed to generate manual emergency report', error);
        });
      }
    };

    const handleHealthRecovery = (event: CustomEvent) => {
      if (!hasActivated) {
        debugLogger.logError('WARN', 'Health monitoring triggered recovery', event.detail);
        
        setActivationTrigger('health-check');
        setIsRecoveryVisible(true);
        setHasActivated(true);
        
        // Generate emergency report
        emergencyDiagnosticReporter.generateEmergencyReport('health-check').catch(error => {
          debugLogger.logError('ERROR', 'Failed to generate health emergency report', error);
        });
      }
    };

    window.addEventListener('activate-emergency-mode', handleEmergencyActivation as EventListener);
    window.addEventListener('show-emergency-recovery', handleShowRecovery as EventListener);
    window.addEventListener('health-recovery-triggered', handleHealthRecovery as EventListener);

    // Track consecutive failures
    const updateFailureCount = () => {
      const currentCount = parseInt(localStorage.getItem('consecutive-failures') || '0');
      localStorage.setItem('consecutive-failures', (currentCount + 1).toString());
      
      // Auto-activate after 3 consecutive failures
      if (currentCount >= 2 && !hasActivated) {
        debugLogger.logError('CRITICAL', 'Multiple consecutive failures detected', {
          count: currentCount + 1
        });
        
        setActivationTrigger('error');
        setIsRecoveryVisible(true);
        setHasActivated(true);
      }
    };

    // Check for previous failures on mount
    const consecutiveFailures = parseInt(localStorage.getItem('consecutive-failures') || '0');
    if (consecutiveFailures >= 3 && !hasActivated) {
      updateFailureCount();
    } else if (consecutiveFailures > 0) {
      updateFailureCount();
    }

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      readyEvents.forEach(event => {
        window.removeEventListener(event, handleAppReady);
      });
      
      document.removeEventListener('DOMContentLoaded', checkReadyState);
      window.removeEventListener('activate-emergency-mode', handleEmergencyActivation as EventListener);
      window.removeEventListener('show-emergency-recovery', handleShowRecovery as EventListener);
      window.removeEventListener('health-recovery-triggered', handleHealthRecovery as EventListener);
    };
  }, [timeoutMs, enableAutoActivation, hasActivated]);

  // Listen for manual activation via keyboard shortcut
  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      // Ctrl+Shift+R or Cmd+Shift+R for manual activation
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        
        if (!hasActivated) {
          debugLogger.logLifecycle('INFO', 'Emergency recovery activated via keyboard shortcut');
          
          setActivationTrigger('manual');
          setIsRecoveryVisible(true);
          setHasActivated(true);
          
          // Generate emergency report
          emergencyDiagnosticReporter.generateEmergencyReport('manual').catch(error => {
            debugLogger.logError('ERROR', 'Failed to generate manual emergency report', error);
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcut);
    
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcut);
    };
  }, [hasActivated]);

  const handleCloseRecovery = () => {
    setIsRecoveryVisible(false);
    
    // Clear emergency mode if it was active
    recoveryActionSystem.clearEmergencyMode();
    
    debugLogger.logLifecycle('INFO', 'Emergency recovery interface closed');
  };

  return (
    <>
      {isRecoveryVisible && (
        <EmergencyRecoveryInterface
          isVisible={isRecoveryVisible}
          onClose={handleCloseRecovery}
          trigger={activationTrigger}
        />
      )}
    </>
  );
};