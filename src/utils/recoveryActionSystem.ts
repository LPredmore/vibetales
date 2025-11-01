/**
 * Recovery Action System
 * 
 * Implements cache clearing mechanisms, hard reload functionality,
 * and safe mode with minimal feature set for maximum compatibility.
 * 
 * Requirements: 5.2, 5.3, 5.4
 */

import { debugLogger } from './debugLogger';
import { startupOrchestrator } from './startupOrchestrator';

export interface RecoveryActionResult {
  success: boolean;
  message: string;
  requiresReload: boolean;
  nextActions?: string[];
  metadata?: Record<string, any>;
}

export interface CacheClearingOptions {
  level: 'basic' | 'thorough' | 'complete';
  includeServiceWorker: boolean;
  includeIndexedDB: boolean;
  includeLocalStorage: boolean;
  includeSessionStorage: boolean;
}

export interface SafeModeConfig {
  disableServiceWorker: boolean;
  disableOfflineFeatures: boolean;
  disableAnimations: boolean;
  disableAdvancedFeatures: boolean;
  enableBasicAuth: boolean;
  enableMinimalUI: boolean;
}

export interface HardReloadOptions {
  cacheBusting: boolean;
  disableServiceWorker: boolean;
  clearStorage: boolean;
  forceRefresh: boolean;
}

class RecoveryActionSystem {
  private safeModeActive = false;
  private recoveryHistory: Array<{
    action: string;
    timestamp: number;
    result: RecoveryActionResult;
  }> = [];

  constructor() {
    this.initializeRecoverySystem();
  }

  private initializeRecoverySystem() {
    // Check if we're already in safe mode
    this.safeModeActive = this.isSafeModeActive();
    
    // Listen for recovery events
    window.addEventListener('activate-emergency-mode', () => {
      this.handleEmergencyActivation();
    });

    debugLogger.logLifecycle('INFO', 'Recovery action system initialized', {
      safeModeActive: this.safeModeActive
    });
  }

  // Cache Clearing Mechanisms
  async clearCache(options: CacheClearingOptions): Promise<RecoveryActionResult> {
    debugLogger.logLifecycle('INFO', 'Starting cache clearing operation', { options });
    
    const startTime = Date.now();
    const clearedItems: string[] = [];
    const errors: string[] = [];

    try {
      // Clear localStorage
      if (options.includeLocalStorage) {
        try {
          const itemCount = localStorage.length;
          localStorage.clear();
          clearedItems.push(`localStorage (${itemCount} items)`);
        } catch (error) {
          errors.push(`localStorage: ${error.message}`);
        }
      }

      // Clear sessionStorage
      if (options.includeSessionStorage) {
        try {
          const itemCount = sessionStorage.length;
          sessionStorage.clear();
          clearedItems.push(`sessionStorage (${itemCount} items)`);
        } catch (error) {
          errors.push(`sessionStorage: ${error.message}`);
        }
      }

      // Clear Cache API
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          
          if (options.level === 'basic') {
            // Only clear app-specific caches
            const appCaches = cacheNames.filter(name => 
              name.includes('vibetales') || name.includes('workbox')
            );
            await Promise.all(appCaches.map(name => caches.delete(name)));
            clearedItems.push(`Cache API (${appCaches.length} app caches)`);
          } else {
            // Clear all caches
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            clearedItems.push(`Cache API (${cacheNames.length} caches)`);
          }
        } catch (error) {
          errors.push(`Cache API: ${error.message}`);
        }
      }

      // Clear IndexedDB
      if (options.includeIndexedDB && 'indexedDB' in window) {
        try {
          const databases = await this.getIndexedDBDatabases();
          
          if (options.level === 'complete') {
            // Delete all databases
            await Promise.all(databases.map(db => this.deleteIndexedDB(db)));
            clearedItems.push(`IndexedDB (${databases.length} databases)`);
          } else {
            // Only delete app-specific databases
            const appDatabases = databases.filter(db => 
              db.includes('vibetales') || db.includes('supabase')
            );
            await Promise.all(appDatabases.map(db => this.deleteIndexedDB(db)));
            clearedItems.push(`IndexedDB (${appDatabases.length} app databases)`);
          }
        } catch (error) {
          errors.push(`IndexedDB: ${error.message}`);
        }
      }

      // Clear Service Worker caches
      if (options.includeServiceWorker && 'serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          if (options.level === 'complete') {
            // Unregister all service workers
            await Promise.all(registrations.map(reg => reg.unregister()));
            clearedItems.push(`Service Workers (${registrations.length} unregistered)`);
          } else {
            // Just clear service worker caches via messaging
            registrations.forEach(reg => {
              if (reg.active) {
                reg.active.postMessage({ type: 'CLEAR_CACHE' });
              }
            });
            clearedItems.push(`Service Worker caches cleared`);
          }
        } catch (error) {
          errors.push(`Service Worker: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;
      const result: RecoveryActionResult = {
        success: errors.length === 0,
        message: errors.length === 0 
          ? `Cache cleared successfully: ${clearedItems.join(', ')}`
          : `Cache clearing completed with errors: ${errors.join(', ')}`,
        requiresReload: true,
        metadata: {
          clearedItems,
          errors,
          duration,
          level: options.level
        }
      };

      this.recordRecoveryAction('cache-clear', result);
      return result;

    } catch (error) {
      const result: RecoveryActionResult = {
        success: false,
        message: `Cache clearing failed: ${error.message}`,
        requiresReload: false,
        metadata: { error: error.message }
      };

      this.recordRecoveryAction('cache-clear', result);
      return result;
    }
  }

  // Hard Reload Functionality
  async performHardReload(options: HardReloadOptions): Promise<RecoveryActionResult> {
    debugLogger.logLifecycle('INFO', 'Performing hard reload', { options });

    try {
      // Clear storage if requested
      if (options.clearStorage) {
        await this.clearCache({
          level: 'thorough',
          includeServiceWorker: options.disableServiceWorker,
          includeIndexedDB: true,
          includeLocalStorage: true,
          includeSessionStorage: true
        });
      }

      // Disable service worker if requested
      if (options.disableServiceWorker && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // Create cache-busting URL
      const url = new URL(window.location.href);
      
      if (options.cacheBusting) {
        url.searchParams.set('v', Date.now().toString());
        url.searchParams.set('hard-reload', '1');
        url.searchParams.set('no-cache', '1');
      }

      if (options.disableServiceWorker) {
        url.searchParams.set('disable-sw', '1');
      }

      // Record the action before reload
      const result: RecoveryActionResult = {
        success: true,
        message: 'Hard reload initiated with cache bypass',
        requiresReload: true,
        metadata: {
          url: url.toString(),
          options
        }
      };

      this.recordRecoveryAction('hard-reload', result);

      // Perform the reload
      if (options.forceRefresh) {
        window.location.replace(url.toString());
      } else {
        window.location.href = url.toString();
      }

      return result;

    } catch (error) {
      const result: RecoveryActionResult = {
        success: false,
        message: `Hard reload failed: ${error.message}`,
        requiresReload: false,
        metadata: { error: error.message }
      };

      this.recordRecoveryAction('hard-reload', result);
      return result;
    }
  }

  // Safe Mode Implementation
  async enterSafeMode(config: SafeModeConfig): Promise<RecoveryActionResult> {
    debugLogger.logLifecycle('INFO', 'Entering safe mode', { config });

    try {
      // Set safe mode flags
      localStorage.setItem('safe-mode', 'true');
      localStorage.setItem('safe-mode-config', JSON.stringify(config));
      localStorage.setItem('safe-mode-timestamp', Date.now().toString());

      // Configure safe mode settings
      if (config.disableServiceWorker) {
        localStorage.setItem('disable-service-worker', 'true');
      }

      if (config.disableOfflineFeatures) {
        localStorage.setItem('disable-offline', 'true');
      }

      if (config.disableAnimations) {
        localStorage.setItem('disable-animations', 'true');
      }

      if (config.disableAdvancedFeatures) {
        localStorage.setItem('minimal-features', 'true');
      }

      if (config.enableBasicAuth) {
        localStorage.setItem('basic-auth-only', 'true');
      }

      if (config.enableMinimalUI) {
        localStorage.setItem('minimal-ui', 'true');
      }

      // Clear potentially problematic data
      this.clearProblematicData();

      // Create safe mode URL
      const url = new URL(window.location.href);
      url.searchParams.set('safe-mode', '1');
      url.searchParams.set('minimal', '1');

      const result: RecoveryActionResult = {
        success: true,
        message: 'Safe mode activated with minimal features',
        requiresReload: true,
        nextActions: [
          'App will restart with limited functionality',
          'Some features may be disabled for stability',
          'Exit safe mode from settings when issues are resolved'
        ],
        metadata: {
          config,
          url: url.toString()
        }
      };

      this.recordRecoveryAction('safe-mode', result);
      this.safeModeActive = true;

      // Reload in safe mode
      window.location.href = url.toString();

      return result;

    } catch (error) {
      const result: RecoveryActionResult = {
        success: false,
        message: `Safe mode activation failed: ${error.message}`,
        requiresReload: false,
        metadata: { error: error.message }
      };

      this.recordRecoveryAction('safe-mode', result);
      return result;
    }
  }

  // Exit Safe Mode
  async exitSafeMode(): Promise<RecoveryActionResult> {
    debugLogger.logLifecycle('INFO', 'Exiting safe mode');

    try {
      // Remove safe mode flags
      localStorage.removeItem('safe-mode');
      localStorage.removeItem('safe-mode-config');
      localStorage.removeItem('safe-mode-timestamp');
      localStorage.removeItem('disable-service-worker');
      localStorage.removeItem('disable-offline');
      localStorage.removeItem('disable-animations');
      localStorage.removeItem('minimal-features');
      localStorage.removeItem('basic-auth-only');
      localStorage.removeItem('minimal-ui');

      // Create normal mode URL
      const url = new URL(window.location.href);
      url.searchParams.delete('safe-mode');
      url.searchParams.delete('minimal');
      url.searchParams.set('exit-safe-mode', '1');

      const result: RecoveryActionResult = {
        success: true,
        message: 'Safe mode deactivated - returning to normal operation',
        requiresReload: true,
        metadata: {
          url: url.toString()
        }
      };

      this.recordRecoveryAction('exit-safe-mode', result);
      this.safeModeActive = false;

      // Reload in normal mode
      window.location.href = url.toString();

      return result;

    } catch (error) {
      const result: RecoveryActionResult = {
        success: false,
        message: `Safe mode exit failed: ${error.message}`,
        requiresReload: false,
        metadata: { error: error.message }
      };

      this.recordRecoveryAction('exit-safe-mode', result);
      return result;
    }
  }

  // Network Recovery Actions
  async resetNetworkSettings(): Promise<RecoveryActionResult> {
    debugLogger.logLifecycle('INFO', 'Resetting network settings');

    try {
      const clearedItems: string[] = [];

      // Clear network-related storage
      const networkKeys = [
        'network-cache',
        'offline-data',
        'connection-status',
        'network-quality',
        'failed-requests'
      ];

      networkKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          clearedItems.push(key);
        }
      });

      // Reset service worker network cache
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'RESET_NETWORK_CACHE'
        });
        clearedItems.push('service-worker-network-cache');
      }

      // Test network connectivity
      let networkTest = false;
      try {
        const response = await fetch(window.location.origin + '/favicon.ico', {
          cache: 'no-cache',
          mode: 'no-cors'
        });
        networkTest = true;
      } catch (error) {
        debugLogger.logError('WARN', 'Network connectivity test failed', error);
      }

      const result: RecoveryActionResult = {
        success: true,
        message: `Network settings reset. Connectivity test: ${networkTest ? 'passed' : 'failed'}`,
        requiresReload: false,
        nextActions: networkTest 
          ? ['Network connectivity restored', 'Try reloading the page']
          : ['Network connectivity issues detected', 'Check your internet connection'],
        metadata: {
          clearedItems,
          networkTest
        }
      };

      this.recordRecoveryAction('network-reset', result);
      return result;

    } catch (error) {
      const result: RecoveryActionResult = {
        success: false,
        message: `Network reset failed: ${error.message}`,
        requiresReload: false,
        metadata: { error: error.message }
      };

      this.recordRecoveryAction('network-reset', result);
      return result;
    }
  }

  // Complete System Reset
  async performCompleteReset(): Promise<RecoveryActionResult> {
    debugLogger.logLifecycle('WARN', 'Performing complete system reset');

    try {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // Clear IndexedDB databases
      const databases = await this.getIndexedDBDatabases();
      await Promise.all(databases.map(db => this.deleteIndexedDB(db)));

      // Create fresh start URL
      const baseUrl = window.location.origin + window.location.pathname;
      const url = new URL(baseUrl);
      url.searchParams.set('fresh-start', '1');
      url.searchParams.set('reset-complete', '1');

      const result: RecoveryActionResult = {
        success: true,
        message: 'Complete system reset performed - starting fresh',
        requiresReload: true,
        nextActions: [
          'All app data has been cleared',
          'You will need to log in again',
          'App will start with default settings'
        ],
        metadata: {
          url: url.toString(),
          timestamp: Date.now()
        }
      };

      // Record this action before clearing everything
      this.recordRecoveryAction('complete-reset', result);

      // Reload with fresh state
      window.location.href = url.toString();

      return result;

    } catch (error) {
      const result: RecoveryActionResult = {
        success: false,
        message: `Complete reset failed: ${error.message}`,
        requiresReload: false,
        metadata: { error: error.message }
      };

      this.recordRecoveryAction('complete-reset', result);
      return result;
    }
  }

  // Utility Methods
  private async getIndexedDBDatabases(): Promise<string[]> {
    try {
      if ('databases' in indexedDB) {
        const databases = await (indexedDB as any).databases();
        return databases.map((db: any) => db.name);
      } else {
        // Fallback to known database names
        return [
          'vibetales-cache',
          'vibetales-auth',
          'vibetales-data',
          'supabase-cache',
          'workbox-cache'
        ];
      }
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to get IndexedDB databases', error);
      return [];
    }
  }

  private async deleteIndexedDB(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(name);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onblocked = () => {
        debugLogger.logError('WARN', `IndexedDB deletion blocked: ${name}`);
        resolve(); // Continue anyway
      };
    });
  }

  private clearProblematicData() {
    const problematicKeys = [
      'auth-cache',
      'user-preferences',
      'cached-responses',
      'error-logs',
      'performance-data'
    ];

    problematicKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (error) {
        debugLogger.logError('WARN', `Failed to clear ${key}`, error);
      }
    });
  }

  private handleEmergencyActivation() {
    debugLogger.logLifecycle('CRITICAL', 'Emergency mode activated');
    
    // Set emergency flags
    localStorage.setItem('emergency-mode', 'true');
    localStorage.setItem('emergency-timestamp', Date.now().toString());
    
    // Trigger emergency UI if not already visible
    window.dispatchEvent(new CustomEvent('show-emergency-recovery', {
      detail: { trigger: 'emergency' }
    }));
  }

  private recordRecoveryAction(action: string, result: RecoveryActionResult) {
    this.recoveryHistory.push({
      action,
      timestamp: Date.now(),
      result
    });

    // Keep only last 10 actions
    if (this.recoveryHistory.length > 10) {
      this.recoveryHistory = this.recoveryHistory.slice(-10);
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem('recovery-history', JSON.stringify(this.recoveryHistory));
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to store recovery history', error);
    }
  }

  // Public API Methods
  isSafeModeActive(): boolean {
    return localStorage.getItem('safe-mode') === 'true' || 
           new URLSearchParams(window.location.search).has('safe-mode');
  }

  getSafeModeConfig(): SafeModeConfig | null {
    try {
      const config = localStorage.getItem('safe-mode-config');
      return config ? JSON.parse(config) : null;
    } catch {
      return null;
    }
  }

  getRecoveryHistory(): Array<{ action: string; timestamp: number; result: RecoveryActionResult }> {
    return [...this.recoveryHistory];
  }

  isEmergencyModeActive(): boolean {
    return localStorage.getItem('emergency-mode') === 'true';
  }

  clearEmergencyMode() {
    localStorage.removeItem('emergency-mode');
    localStorage.removeItem('emergency-timestamp');
  }

  // Preset Recovery Actions
  async quickReload(): Promise<RecoveryActionResult> {
    return this.performHardReload({
      cacheBusting: true,
      disableServiceWorker: false,
      clearStorage: false,
      forceRefresh: false
    });
  }

  async clearCacheAndReload(): Promise<RecoveryActionResult> {
    await this.clearCache({
      level: 'thorough',
      includeServiceWorker: true,
      includeIndexedDB: false,
      includeLocalStorage: true,
      includeSessionStorage: true
    });

    return this.performHardReload({
      cacheBusting: true,
      disableServiceWorker: false,
      clearStorage: false,
      forceRefresh: true
    });
  }

  async enterBasicSafeMode(): Promise<RecoveryActionResult> {
    return this.enterSafeMode({
      disableServiceWorker: true,
      disableOfflineFeatures: true,
      disableAnimations: true,
      disableAdvancedFeatures: true,
      enableBasicAuth: true,
      enableMinimalUI: true
    });
  }
}

// Singleton instance
export const recoveryActionSystem = new RecoveryActionSystem();