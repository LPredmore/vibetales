import { debugLogger } from './debugLogger';
import { serviceWorkerManager, ServiceWorkerCapabilities } from './serviceWorkerManager';
import { simplifiedCacheManager } from './simplifiedCacheManager';
import { ErrorCategory, startupErrorDetector } from './startupErrorDetection';

export interface FailureHandlingConfig {
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
  gracefulDegradationEnabled: boolean;
  manualSetupEnabled: boolean;
  autoRecoveryEnabled: boolean;
}

export interface ServiceWorkerHealth {
  isRegistered: boolean;
  isActive: boolean;
  isHealthy: boolean;
  lastCheck: Date;
  errorCount: number;
  lastError?: Error;
  capabilities: ServiceWorkerCapabilities;
}

export interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  autoExecute: boolean;
  execute: () => Promise<boolean>;
}

export interface FailureContext {
  error: Error;
  phase: 'registration' | 'activation' | 'runtime' | 'update';
  timestamp: Date;
  retryCount: number;
  environment: {
    isTWA: boolean;
    isFirstLaunch: boolean;
    networkStatus: string;
  };
}

export class ServiceWorkerFailureHandler {
  private config: FailureHandlingConfig;
  private health: ServiceWorkerHealth;
  private healthCheckTimer: number | null = null;
  private recoveryActions: Map<string, RecoveryAction> = new Map();
  private failureHistory: FailureContext[] = [];
  private isInGracefulMode = false;

  constructor(config?: Partial<FailureHandlingConfig>) {
    this.config = {
      maxRetries: 3,
      retryDelay: 2000,
      healthCheckInterval: 30000, // 30 seconds
      gracefulDegradationEnabled: true,
      manualSetupEnabled: true,
      autoRecoveryEnabled: true,
      ...config
    };

    this.health = {
      isRegistered: false,
      isActive: false,
      isHealthy: false,
      lastCheck: new Date(),
      errorCount: 0,
      capabilities: serviceWorkerManager.getCapabilities()
    };

    this._initializeRecoveryActions();
  }

  /**
   * Initialize available recovery actions
   */
  private _initializeRecoveryActions(): void {
    // Clear cache and retry registration
    this.recoveryActions.set('clear-cache-retry', {
      id: 'clear-cache-retry',
      name: 'Clear Cache & Retry',
      description: 'Clear all caches and attempt service worker registration again',
      severity: 'medium',
      autoExecute: false,
      execute: async () => {
        try {
          await this._clearAllCaches();
          const result = await serviceWorkerManager.registerProgressively();
          return result.success;
        } catch (error) {
          debugLogger.logError('ERROR', 'Clear cache retry failed', error);
          return false;
        }
      }
    });

    // Force unregister and re-register
    this.recoveryActions.set('force-reregister', {
      id: 'force-reregister',
      name: 'Force Re-register',
      description: 'Unregister existing service worker and register fresh',
      severity: 'high',
      autoExecute: false,
      execute: async () => {
        try {
          await this._forceUnregister();
          await this._delay(1000);
          const result = await serviceWorkerManager.registerProgressively();
          return result.success;
        } catch (error) {
          debugLogger.logError('ERROR', 'Force re-register failed', error);
          return false;
        }
      }
    });

    // Enable graceful degradation mode
    this.recoveryActions.set('graceful-degradation', {
      id: 'graceful-degradation',
      name: 'Enable Graceful Mode',
      description: 'Continue without service worker with limited offline capabilities',
      severity: 'low',
      autoExecute: true,
      execute: async () => {
        return this._enableGracefulDegradation();
      }
    });

    // Manual service worker setup
    this.recoveryActions.set('manual-setup', {
      id: 'manual-setup',
      name: 'Manual Setup',
      description: 'Provide manual service worker setup options',
      severity: 'medium',
      autoExecute: false,
      execute: async () => {
        return this._setupManualServiceWorker();
      }
    });

    // Reset to factory defaults
    this.recoveryActions.set('factory-reset', {
      id: 'factory-reset',
      name: 'Factory Reset',
      description: 'Clear all app data and restart with fresh configuration',
      severity: 'high',
      autoExecute: false,
      execute: async () => {
        return this._performFactoryReset();
      }
    });
  }

  /**
   * Handle service worker registration failure
   */
  async handleRegistrationFailure(error: Error, context: Partial<FailureContext> = {}): Promise<boolean> {
    const failureContext: FailureContext = {
      error,
      phase: 'registration',
      timestamp: new Date(),
      retryCount: context.retryCount || 0,
      environment: {
        isTWA: false, // Will be updated by caller
        isFirstLaunch: false,
        networkStatus: navigator.onLine ? 'online' : 'offline',
        ...context.environment
      }
    };

    this.failureHistory.push(failureContext);
    this.health.errorCount++;
    this.health.lastError = error;

    debugLogger.logError('ERROR', 'Service Worker registration failed', {
      error: error.message,
      context: failureContext,
      healthStatus: this.health
    });

    // Determine recovery strategy based on error type and context
    const recoveryStrategy = this._determineRecoveryStrategy(failureContext);
    
    debugLogger.logLifecycle('INFO', 'Executing recovery strategy', {
      strategy: recoveryStrategy,
      autoExecute: this.config.autoRecoveryEnabled
    });

    // Execute recovery actions
    if (this.config.autoRecoveryEnabled) {
      return await this._executeRecoveryStrategy(recoveryStrategy);
    } else {
      // Just enable graceful degradation for manual mode
      return await this._enableGracefulDegradation();
    }
  }

  /**
   * Start health monitoring for registered service worker
   */
  startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = window.setInterval(async () => {
      await this._performHealthCheck();
    }, this.config.healthCheckInterval);

    debugLogger.logLifecycle('INFO', 'Service Worker health monitoring started', {
      interval: this.config.healthCheckInterval
    });
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Perform health check on service worker
   */
  private async _performHealthCheck(): Promise<void> {
    try {
      const status = await serviceWorkerManager.getStatus();
      const previousHealth = this.health.isHealthy;

      this.health = {
        ...this.health,
        isRegistered: status.registered,
        isActive: status.active,
        isHealthy: status.registered && status.active,
        lastCheck: new Date()
      };

      // Detect health state changes
      if (previousHealth && !this.health.isHealthy) {
        debugLogger.logLifecycle('WARN', 'Service Worker health degraded', this.health);
        
        if (this.config.autoRecoveryEnabled) {
          await this._handleHealthDegradation();
        }
      } else if (!previousHealth && this.health.isHealthy) {
        debugLogger.logLifecycle('INFO', 'Service Worker health restored', this.health);
      }

    } catch (error) {
      this.health.lastError = error as Error;
      this.health.errorCount++;
      debugLogger.logError('WARN', 'Health check failed', error);
    }
  }

  /**
   * Handle service worker health degradation
   */
  private async _handleHealthDegradation(): Promise<void> {
    debugLogger.logLifecycle('INFO', 'Handling SW health degradation');

    // Try automatic re-registration first
    try {
      const result = await serviceWorkerManager.registerProgressively();
      if (result.success) {
        debugLogger.logLifecycle('INFO', 'SW health restored via re-registration');
        return;
      }
    } catch (error) {
      debugLogger.logError('WARN', 'Auto re-registration failed', error);
    }

    // Fall back to graceful degradation
    await this._enableGracefulDegradation();
  }

  /**
   * Determine recovery strategy based on failure context
   */
  private _determineRecoveryStrategy(context: FailureContext): string[] {
    const strategies: string[] = [];

    // Analyze error type
    const errorMessage = context.error.message.toLowerCase();

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      // Network-related failures
      if (context.environment.networkStatus === 'offline') {
        strategies.push('graceful-degradation');
      } else {
        strategies.push('clear-cache-retry', 'graceful-degradation');
      }
    } else if (errorMessage.includes('mime type') || errorMessage.includes('script')) {
      // Script/MIME type issues
      strategies.push('force-reregister', 'manual-setup', 'graceful-degradation');
    } else if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
      // Storage issues
      strategies.push('clear-cache-retry', 'factory-reset', 'graceful-degradation');
    } else if (context.retryCount >= this.config.maxRetries) {
      // Too many retries
      strategies.push('manual-setup', 'graceful-degradation');
    } else {
      // Generic failure
      strategies.push('clear-cache-retry', 'graceful-degradation');
    }

    // For TWA first launch, prefer graceful degradation
    if (context.environment.isTWA && context.environment.isFirstLaunch) {
      strategies.unshift('graceful-degradation');
    }

    return strategies;
  }

  /**
   * Execute recovery strategy
   */
  private async _executeRecoveryStrategy(strategies: string[]): Promise<boolean> {
    for (const strategyId of strategies) {
      const action = this.recoveryActions.get(strategyId);
      if (!action) continue;

      try {
        debugLogger.logLifecycle('INFO', `Executing recovery action: ${action.name}`);
        
        const success = await action.execute();
        
        if (success) {
          debugLogger.logLifecycle('INFO', `Recovery action succeeded: ${action.name}`);
          return true;
        } else {
          debugLogger.logLifecycle('WARN', `Recovery action failed: ${action.name}`);
        }
      } catch (error) {
        debugLogger.logError('ERROR', `Recovery action error: ${action.name}`, error);
      }

      // Add delay between recovery attempts
      await this._delay(this.config.retryDelay);
    }

    return false;
  }

  /**
   * Enable graceful degradation mode
   */
  private async _enableGracefulDegradation(): Promise<boolean> {
    try {
      this.isInGracefulMode = true;

      debugLogger.logLifecycle('INFO', 'Enabling graceful degradation mode');

      // Initialize simplified cache manager as fallback
      const cacheInitialized = await simplifiedCacheManager.initializeMinimalCache();
      
      // Store degradation state
      localStorage.setItem('sw-graceful-mode', 'true');
      localStorage.setItem('sw-graceful-timestamp', Date.now().toString());

      // Notify app components about degraded mode
      window.dispatchEvent(new CustomEvent('sw-graceful-mode', {
        detail: {
          enabled: true,
          cacheAvailable: cacheInitialized,
          timestamp: new Date()
        }
      }));

      return true;
    } catch (error) {
      debugLogger.logError('ERROR', 'Failed to enable graceful degradation', error);
      return false;
    }
  }

  /**
   * Setup manual service worker registration
   */
  private async _setupManualServiceWorker(): Promise<boolean> {
    try {
      debugLogger.logLifecycle('INFO', 'Setting up manual service worker');

      // Create manual setup UI event
      window.dispatchEvent(new CustomEvent('sw-manual-setup', {
        detail: {
          capabilities: this.health.capabilities,
          recoveryActions: Array.from(this.recoveryActions.values()),
          failureHistory: this.failureHistory
        }
      }));

      return true;
    } catch (error) {
      debugLogger.logError('ERROR', 'Manual setup failed', error);
      return false;
    }
  }

  /**
   * Clear all caches
   */
  private async _clearAllCaches(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      debugLogger.logLifecycle('INFO', 'All caches cleared', { count: cacheNames.length });
    }
  }

  /**
   * Force unregister service worker
   */
  private async _forceUnregister(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      debugLogger.logLifecycle('INFO', 'All service workers unregistered', { count: registrations.length });
    }
  }

  /**
   * Perform factory reset
   */
  private async _performFactoryReset(): Promise<boolean> {
    try {
      debugLogger.logLifecycle('INFO', 'Performing factory reset');

      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all caches
      await this._clearAllCaches();
      
      // Unregister service workers
      await this._forceUnregister();

      // Clear IndexedDB (if used)
      if ('indexedDB' in window) {
        // Note: This is a simplified approach
        // In production, you might want to enumerate and delete specific databases
      }

      debugLogger.logLifecycle('INFO', 'Factory reset completed');
      
      // Trigger page reload after reset
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      return true;
    } catch (error) {
      debugLogger.logError('ERROR', 'Factory reset failed', error);
      return false;
    }
  }

  /**
   * Get available recovery actions
   */
  getRecoveryActions(): RecoveryAction[] {
    return Array.from(this.recoveryActions.values());
  }

  /**
   * Execute specific recovery action
   */
  async executeRecoveryAction(actionId: string): Promise<boolean> {
    const action = this.recoveryActions.get(actionId);
    if (!action) {
      throw new Error(`Recovery action not found: ${actionId}`);
    }

    return await action.execute();
  }

  /**
   * Get current health status
   */
  getHealthStatus(): ServiceWorkerHealth {
    return { ...this.health };
  }

  /**
   * Get failure history
   */
  getFailureHistory(): FailureContext[] {
    return [...this.failureHistory];
  }

  /**
   * Check if in graceful degradation mode
   */
  isInGracefulDegradationMode(): boolean {
    return this.isInGracefulMode || localStorage.getItem('sw-graceful-mode') === 'true';
  }

  /**
   * Exit graceful degradation mode
   */
  exitGracefulDegradationMode(): void {
    this.isInGracefulMode = false;
    localStorage.removeItem('sw-graceful-mode');
    localStorage.removeItem('sw-graceful-timestamp');
    
    window.dispatchEvent(new CustomEvent('sw-graceful-mode', {
      detail: {
        enabled: false,
        timestamp: new Date()
      }
    }));
  }

  /**
   * Utility delay function
   */
  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopHealthMonitoring();
    this.recoveryActions.clear();
    this.failureHistory = [];
  }
}

// Export singleton instance
export const serviceWorkerFailureHandler = new ServiceWorkerFailureHandler();