import { debugLogger } from './debugLogger';
import { detectTWAEnvironment } from './twaDetection';
import { ErrorCategory, startupErrorDetector } from './startupErrorDetection';

export interface ServiceWorkerCapabilities {
  supported: boolean;
  registrationSupported: boolean;
  cacheSupported: boolean;
  backgroundSyncSupported: boolean;
  pushSupported: boolean;
}

export interface RegistrationResult {
  success: boolean;
  registration?: ServiceWorkerRegistration;
  mode: 'full' | 'minimal' | 'disabled';
  error?: Error;
  capabilities: ServiceWorkerCapabilities;
  timing: number;
}

export interface CacheStrategy {
  name: string;
  enabled: boolean;
  maxEntries: number;
  maxAgeSeconds: number;
  networkFirst: boolean;
}

export interface ServiceWorkerConfig {
  scriptUrl: string;
  scope: string;
  updateViaCache: 'imports' | 'all' | 'none';
  strategies: CacheStrategy[];
  retryAttempts: number;
  retryDelay: number;
  backgroundRegistration: boolean;
}

export class ServiceWorkerManager {
  private config: ServiceWorkerConfig;
  private capabilities: ServiceWorkerCapabilities;
  private registrationPromise: Promise<RegistrationResult> | null = null;
  private retryCount = 0;

  constructor(config?: Partial<ServiceWorkerConfig>) {
    this.config = {
      scriptUrl: '/sw.js',
      scope: '/',
      updateViaCache: 'imports',
      strategies: [
        {
          name: 'minimal',
          enabled: true,
          maxEntries: 10,
          maxAgeSeconds: 86400, // 1 day
          networkFirst: true
        },
        {
          name: 'full',
          enabled: false,
          maxEntries: 50,
          maxAgeSeconds: 604800, // 1 week
          networkFirst: false
        }
      ],
      retryAttempts: 3,
      retryDelay: 1000,
      backgroundRegistration: true,
      ...config
    };

    this.capabilities = this.detectCapabilities();
  }

  /**
   * Detect service worker capabilities in current environment
   */
  private detectCapabilities(): ServiceWorkerCapabilities {
    const capabilities: ServiceWorkerCapabilities = {
      supported: 'serviceWorker' in navigator,
      registrationSupported: false,
      cacheSupported: 'caches' in window,
      backgroundSyncSupported: false,
      pushSupported: false
    };

    if (capabilities.supported) {
      try {
        // Test registration support
        capabilities.registrationSupported = typeof navigator.serviceWorker.register === 'function';
        
        // Test background sync support
        capabilities.backgroundSyncSupported = 'sync' in window.ServiceWorkerRegistration.prototype;
        
        // Test push support
        capabilities.pushSupported = 'PushManager' in window && 'Notification' in window;
      } catch (error) {
        debugLogger.logError('WARN', 'Error detecting service worker capabilities', error);
      }
    }

    return capabilities;
  }

  /**
   * Progressive service worker registration with environment-based logic
   */
  async registerProgressively(): Promise<RegistrationResult> {
    // Return existing promise if registration is in progress
    if (this.registrationPromise) {
      return this.registrationPromise;
    }

    this.registrationPromise = this._performRegistration();
    return this.registrationPromise;
  }

  private async _performRegistration(): Promise<RegistrationResult> {
    const startTime = performance.now();
    
    try {
      // Check basic support
      if (!this.capabilities.supported || !this.capabilities.registrationSupported) {
        return {
          success: false,
          mode: 'disabled',
          error: new Error('Service Worker not supported in this environment'),
          capabilities: this.capabilities,
          timing: performance.now() - startTime
        };
      }

      // Detect environment for conditional registration
      const twaEnvironment = detectTWAEnvironment();
      const shouldUseMinimalMode = this._shouldUseMinimalMode(twaEnvironment);

      debugLogger.logLifecycle('INFO', 'Starting progressive SW registration', {
        twaEnvironment,
        minimalMode: shouldUseMinimalMode,
        capabilities: this.capabilities
      });

      // Check for existing registration
      const existingRegistration = await navigator.serviceWorker.getRegistration(this.config.scope);
      
      if (existingRegistration) {
        debugLogger.logLifecycle('INFO', 'Existing SW registration found', {
          scope: existingRegistration.scope,
          state: existingRegistration.active?.state
        });

        return {
          success: true,
          registration: existingRegistration,
          mode: shouldUseMinimalMode ? 'minimal' : 'full',
          capabilities: this.capabilities,
          timing: performance.now() - startTime
        };
      }

      // Perform new registration with retry logic
      const registration = await this._registerWithRetry();

      // Configure caching strategy based on mode
      await this._configureCacheStrategy(registration, shouldUseMinimalMode ? 'minimal' : 'full');

      debugLogger.logLifecycle('INFO', 'SW registration completed successfully', {
        scope: registration.scope,
        mode: shouldUseMinimalMode ? 'minimal' : 'full'
      });

      return {
        success: true,
        registration,
        mode: shouldUseMinimalMode ? 'minimal' : 'full',
        capabilities: this.capabilities,
        timing: performance.now() - startTime
      };

    } catch (error) {
      debugLogger.logError('ERROR', 'SW registration failed', error);
      
      return {
        success: false,
        mode: 'disabled',
        error: error as Error,
        capabilities: this.capabilities,
        timing: performance.now() - startTime
      };
    }
  }

  /**
   * Determine if minimal mode should be used based on environment
   */
  private _shouldUseMinimalMode(twaEnvironment: any): boolean {
    // Use minimal mode for:
    // 1. Fresh TWA installations
    // 2. First-time users
    // 3. Slow network conditions
    // 4. Limited storage environments

    if (twaEnvironment.isTWA && twaEnvironment.isFirstLaunch) {
      return true;
    }

    // Check if this is a first-time user
    const hasExistingData = localStorage.getItem('app-version') || 
                           sessionStorage.length > 0;
    
    if (!hasExistingData) {
      return true;
    }

    // Check network conditions
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        return true;
      }
    }

    // Check storage quota
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        const availableSpace = estimate.quota ? estimate.quota - (estimate.usage || 0) : 0;
        // Use minimal mode if less than 50MB available
        return availableSpace < 50 * 1024 * 1024;
      }).catch(() => false);
    }

    return false;
  }

  /**
   * Register service worker with exponential backoff retry
   */
  private async _registerWithRetry(): Promise<ServiceWorkerRegistration> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          debugLogger.logLifecycle('INFO', `SW registration retry ${attempt}/${this.config.retryAttempts}`, {
            delay,
            previousError: lastError?.message
          });
          await this._delay(delay);
        }

        // Perform registration
        if (this.config.backgroundRegistration && attempt === 0) {
          // Use background registration for first attempt to avoid blocking
          return await this._backgroundRegister();
        } else {
          // Use direct registration for retries
          return await navigator.serviceWorker.register(this.config.scriptUrl, {
            scope: this.config.scope,
            updateViaCache: this.config.updateViaCache
          });
        }

      } catch (error) {
        lastError = error as Error;
        this.retryCount = attempt + 1;

        // Log specific error types
        if (error instanceof TypeError) {
          debugLogger.logError('WARN', 'SW registration network error', error);
        } else if (error instanceof DOMException) {
          debugLogger.logError('WARN', 'SW registration DOM error', error);
        } else {
          debugLogger.logError('WARN', 'SW registration unknown error', error);
        }

        // Don't retry on certain fatal errors
        if (this._isFatalError(error as Error)) {
          throw error;
        }
      }
    }

    throw lastError || new Error('Service Worker registration failed after all retries');
  }

  /**
   * Background registration to avoid blocking main thread
   */
  private async _backgroundRegister(): Promise<ServiceWorkerRegistration> {
    return new Promise((resolve, reject) => {
      // Use setTimeout to defer registration to next tick
      setTimeout(async () => {
        try {
          const registration = await navigator.serviceWorker.register(this.config.scriptUrl, {
            scope: this.config.scope,
            updateViaCache: this.config.updateViaCache
          });
          resolve(registration);
        } catch (error) {
          reject(error);
        }
      }, 0);
    });
  }

  /**
   * Configure cache strategy based on mode
   */
  private async _configureCacheStrategy(registration: ServiceWorkerRegistration, mode: string): Promise<void> {
    const strategy = this.config.strategies.find(s => s.name === mode);
    if (!strategy) return;

    // Send configuration to service worker
    if (registration.active) {
      registration.active.postMessage({
        type: 'CONFIGURE_CACHE',
        config: strategy
      });
    }

    // Store strategy preference
    localStorage.setItem('sw-cache-strategy', mode);
  }

  /**
   * Check if error is fatal and should not be retried
   */
  private _isFatalError(error: Error): boolean {
    const fatalMessages = [
      'Service Worker script has a bad MIME type',
      'Service Worker script evaluation failed',
      'Service Worker script not found',
      'The script resource is behind a redirect'
    ];

    return fatalMessages.some(msg => error.message.includes(msg));
  }

  /**
   * Utility delay function
   */
  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current service worker status
   */
  async getStatus(): Promise<{
    registered: boolean;
    active: boolean;
    updating: boolean;
    registration?: ServiceWorkerRegistration;
  }> {
    try {
      const registration = await navigator.serviceWorker.getRegistration(this.config.scope);
      
      return {
        registered: !!registration,
        active: !!registration?.active,
        updating: !!registration?.installing || !!registration?.waiting,
        registration
      };
    } catch (error) {
      return {
        registered: false,
        active: false,
        updating: false
      };
    }
  }

  /**
   * Get service worker capabilities
   */
  getCapabilities(): ServiceWorkerCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ServiceWorkerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();