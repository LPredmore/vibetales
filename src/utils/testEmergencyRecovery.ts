/**
 * Emergency Recovery System Test Utility
 * 
 * Provides methods to test the emergency recovery system functionality
 * in development and testing environments.
 */

import { recoveryActionSystem } from './recoveryActionSystem';
import { emergencyDiagnosticReporter } from './emergencyDiagnosticReporter';
import { debugLogger } from './debugLogger';

export class EmergencyRecoveryTester {
  
  // Test emergency activation
  static triggerEmergencyMode(reason: string = 'test') {
    debugLogger.logLifecycle('INFO', 'Testing emergency mode activation', { reason });
    
    // Simulate emergency conditions
    localStorage.setItem('emergency-debug', 'true');
    localStorage.setItem('test-emergency-reason', reason);
    
    // Trigger emergency event
    window.dispatchEvent(new CustomEvent('activate-emergency-mode', {
      detail: { reason, test: true }
    }));
  }

  // Test recovery actions
  static async testRecoveryAction(actionId: string) {
    debugLogger.logLifecycle('INFO', 'Testing recovery action', { actionId });
    
    switch (actionId) {
      case 'clear-cache':
        return await recoveryActionSystem.clearCache({
          level: 'basic',
          includeServiceWorker: false,
          includeIndexedDB: false,
          includeLocalStorage: true,
          includeSessionStorage: true
        });
        
      case 'network-reset':
        return await recoveryActionSystem.resetNetworkSettings();
        
      case 'safe-mode':
        return await recoveryActionSystem.enterBasicSafeMode();
        
      default:
        throw new Error(`Unknown test action: ${actionId}`);
    }
  }

  // Test diagnostic report generation
  static async testDiagnosticReport() {
    debugLogger.logLifecycle('INFO', 'Testing diagnostic report generation');
    
    try {
      const report = await emergencyDiagnosticReporter.generateEmergencyReport('manual');
      
      console.log('Emergency Diagnostic Report Generated:', {
        reportId: report.support.reportId,
        severity: report.support.severity,
        criticalFindings: report.troubleshooting.criticalFindings.length,
        recommendations: report.recovery.recommendedActions.length
      });
      
      return report;
    } catch (error) {
      debugLogger.logError('ERROR', 'Diagnostic report test failed', error);
      throw error;
    }
  }

  // Simulate app loading timeout
  static simulateLoadingTimeout() {
    debugLogger.logLifecycle('INFO', 'Simulating app loading timeout');
    
    // Prevent normal app ready signals
    localStorage.setItem('simulate-timeout', 'true');
    
    // The EmergencyRecoveryActivator will trigger after its timeout
    console.log('Timeout simulation started. Emergency recovery should activate in 5 seconds.');
  }

  // Simulate consecutive failures
  static simulateConsecutiveFailures(count: number = 3) {
    debugLogger.logLifecycle('INFO', 'Simulating consecutive failures', { count });
    
    localStorage.setItem('consecutive-failures', count.toString());
    
    // Trigger a reload to test the failure detection
    window.location.reload();
  }

  // Test safe mode
  static async testSafeMode() {
    debugLogger.logLifecycle('INFO', 'Testing safe mode activation');
    
    const result = await recoveryActionSystem.enterSafeMode({
      disableServiceWorker: true,
      disableOfflineFeatures: true,
      disableAnimations: true,
      disableAdvancedFeatures: false,
      enableBasicAuth: true,
      enableMinimalUI: true
    });
    
    console.log('Safe mode test result:', result);
    return result;
  }

  // Clean up test data
  static cleanupTestData() {
    debugLogger.logLifecycle('INFO', 'Cleaning up emergency recovery test data');
    
    const testKeys = [
      'emergency-debug',
      'test-emergency-reason',
      'simulate-timeout',
      'consecutive-failures',
      'safe-mode',
      'safe-mode-config',
      'emergency-mode'
    ];
    
    testKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    recoveryActionSystem.clearEmergencyMode();
    emergencyDiagnosticReporter.clearReportCache();
    
    console.log('Test data cleaned up');
  }

  // Show test menu in console
  static showTestMenu() {
    console.log(`
🚨 Emergency Recovery System Test Menu
=====================================

Available test commands:
- EmergencyRecoveryTester.triggerEmergencyMode('test-reason')
- EmergencyRecoveryTester.simulateLoadingTimeout()
- EmergencyRecoveryTester.simulateConsecutiveFailures(3)
- EmergencyRecoveryTester.testSafeMode()
- EmergencyRecoveryTester.testDiagnosticReport()
- EmergencyRecoveryTester.testRecoveryAction('clear-cache')
- EmergencyRecoveryTester.cleanupTestData()

Keyboard shortcuts:
- Ctrl+Shift+R (or Cmd+Shift+R): Manual emergency activation

Note: These are test utilities for development only.
    `);
  }
}

// Make it available globally in development
if (process.env.NODE_ENV === 'development') {
  (window as any).EmergencyRecoveryTester = EmergencyRecoveryTester;
  
  // Show test menu on load
  setTimeout(() => {
    EmergencyRecoveryTester.showTestMenu();
  }, 2000);
}