import { debugLogger } from './debugLogger';

export interface CacheValidationResult {
  isValid: boolean;
  isCorrupted: boolean;
  needsRefresh: boolean;
  error?: Error;
  details: {
    cacheExists: boolean;
    entryCount: number;
    totalSize: number;
    lastModified?: Date;
  };
}

export interface CacheEntry {
  url: string;
  response: Response;
  timestamp: number;
  priority: 'critical' | 'important' | 'optional';
}

export interface SimplifiedCacheConfig {
  cacheName: string;
  maxEntries: number;
  maxAgeSeconds: number;
  criticalResources: string[];
  optionalResources: string[];
  validationInterval: number;
}

export class SimplifiedCacheManager {
  private config: SimplifiedCacheConfig;
  private cache: Cache | null = null;
  private isInitialized = false;

  constructor(config?: Partial<SimplifiedCacheConfig>) {
    this.config = {
      cacheName: 'vibetales-minimal-v1',
      maxEntries: 15, // Very limited for new installations
      maxAgeSeconds: 86400, // 1 day only
      criticalResources: [
        '/',
        '/index.html',
        '/manifest.json',
        '/assets/index.css',
        '/assets/index.js'
      ],
      optionalResources: [
        '/favicon.ico',
        '/apple-touch-icon.png',
        '/pwa-192x192.png'
      ],
      validationInterval: 3600000, // 1 hour
      ...config
    };
  }

  /**
   * Initialize minimal cache for first-time installations
   */
  async initializeMinimalCache(): Promise<boolean> {
    try {
      if (!('caches' in window)) {
        debugLogger.logLifecycle('WARN', 'Cache API not supported');
        return false;
      }

      // Open or create cache
      this.cache = await caches.open(this.config.cacheName);
      this.isInitialized = true;

      debugLogger.logLifecycle('INFO', 'Minimal cache initialized', {
        cacheName: this.config.cacheName,
        maxEntries: this.config.maxEntries
      });

      // Pre-cache only critical resources for new installations
      await this._precacheCriticalResources();

      return true;
    } catch (error) {
      debugLogger.logError('ERROR', 'Failed to initialize minimal cache', error);
      return false;
    }
  }

  /**
   * Pre-cache only critical resources to minimize initial load
   */
  private async _precacheCriticalResources(): Promise<void> {
    if (!this.cache) return;

    const criticalRequests = this.config.criticalResources.map(url => {
      return this._createCacheRequest(url, 'critical');
    });

    // Cache critical resources with timeout
    const results = await Promise.allSettled(
      criticalRequests.map(request => 
        this._cacheResourceWithTimeout(request, 5000)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    debugLogger.logLifecycle('INFO', 'Critical resources pre-cached', {
      successful,
      failed,
      total: criticalRequests.length
    });
  }

  /**
   * Progressive cache enhancement after successful initialization
   */
  async enhanceCacheProgressively(): Promise<void> {
    if (!this.cache || !this.isInitialized) {
      debugLogger.logLifecycle('WARN', 'Cache not initialized for enhancement');
      return;
    }

    try {
      // Wait a bit to avoid interfering with app startup
      await this._delay(2000);

      debugLogger.logLifecycle('INFO', 'Starting progressive cache enhancement');

      // Add optional resources in background
      const optionalRequests = this.config.optionalResources.map(url => {
        return this._createCacheRequest(url, 'optional');
      });

      // Cache optional resources with lower priority
      const results = await Promise.allSettled(
        optionalRequests.map(request => 
          this._cacheResourceWithTimeout(request, 10000)
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      debugLogger.logLifecycle('INFO', 'Progressive cache enhancement completed', {
        optionalResourcesCached: successful,
        total: optionalRequests.length
      });

      // Clean up old entries if needed
      await this._enforceMaxEntries();

    } catch (error) {
      debugLogger.logError('WARN', 'Progressive cache enhancement failed', error);
    }
  }

  /**
   * Validate cache integrity and detect corruption
   */
  async validateCache(): Promise<CacheValidationResult> {
    const result: CacheValidationResult = {
      isValid: false,
      isCorrupted: false,
      needsRefresh: false,
      details: {
        cacheExists: false,
        entryCount: 0,
        totalSize: 0
      }
    };

    try {
      if (!('caches' in window)) {
        return result;
      }

      // Check if cache exists
      const cacheExists = await caches.has(this.config.cacheName);
      result.details.cacheExists = cacheExists;

      if (!cacheExists) {
        result.needsRefresh = true;
        return result;
      }

      // Open cache and validate entries
      const cache = await caches.open(this.config.cacheName);
      const requests = await cache.keys();
      result.details.entryCount = requests.length;

      // Validate critical resources
      const criticalMissing = [];
      for (const url of this.config.criticalResources) {
        const response = await cache.match(url);
        if (!response) {
          criticalMissing.push(url);
        } else {
          // Check if response is valid
          if (!response.ok || response.status >= 400) {
            result.isCorrupted = true;
            criticalMissing.push(url);
          }
        }
      }

      // Calculate total size (approximate)
      let totalSize = 0;
      for (const request of requests) {
        try {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.clone().blob();
            totalSize += blob.size;
          }
        } catch (error) {
          // Skip corrupted entries
          result.isCorrupted = true;
        }
      }
      result.details.totalSize = totalSize;

      // Determine validation result
      result.isValid = criticalMissing.length === 0 && !result.isCorrupted;
      result.needsRefresh = criticalMissing.length > 0 || result.isCorrupted;

      debugLogger.logLifecycle('INFO', 'Cache validation completed', {
        isValid: result.isValid,
        isCorrupted: result.isCorrupted,
        criticalMissing: criticalMissing.length,
        totalEntries: result.details.entryCount,
        totalSize: Math.round(totalSize / 1024) + 'KB'
      });

      return result;

    } catch (error) {
      result.error = error as Error;
      result.isCorrupted = true;
      result.needsRefresh = true;
      
      debugLogger.logError('ERROR', 'Cache validation failed', error);
      return result;
    }
  }

  /**
   * Clear corrupted cache and reinitialize
   */
  async clearAndReinitialize(): Promise<boolean> {
    try {
      debugLogger.logLifecycle('INFO', 'Clearing corrupted cache');

      // Delete existing cache
      await caches.delete(this.config.cacheName);
      
      // Reset state
      this.cache = null;
      this.isInitialized = false;

      // Reinitialize with fresh cache
      return await this.initializeMinimalCache();

    } catch (error) {
      debugLogger.logError('ERROR', 'Failed to clear and reinitialize cache', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    entryCount: number;
    totalSize: number;
    criticalResourcesCached: number;
    optionalResourcesCached: number;
    lastValidation?: Date;
  }> {
    const stats = {
      entryCount: 0,
      totalSize: 0,
      criticalResourcesCached: 0,
      optionalResourcesCached: 0
    };

    try {
      if (!this.cache) {
        return stats;
      }

      const requests = await this.cache.keys();
      stats.entryCount = requests.length;

      // Count critical and optional resources
      for (const request of requests) {
        const url = request.url;
        if (this.config.criticalResources.some(critical => url.includes(critical))) {
          stats.criticalResourcesCached++;
        } else if (this.config.optionalResources.some(optional => url.includes(optional))) {
          stats.optionalResourcesCached++;
        }

        // Calculate size
        try {
          const response = await this.cache.match(request);
          if (response) {
            const blob = await response.clone().blob();
            stats.totalSize += blob.size;
          }
        } catch (error) {
          // Skip corrupted entries
        }
      }

      return stats;

    } catch (error) {
      debugLogger.logError('WARN', 'Failed to get cache stats', error);
      return stats;
    }
  }

  /**
   * Create cache request with appropriate headers
   */
  private _createCacheRequest(url: string, priority: 'critical' | 'important' | 'optional'): Request {
    const headers = new Headers();
    
    // Add cache-busting for critical resources only if needed
    if (priority === 'critical') {
      const cacheBuster = Date.now().toString();
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}_cb=${cacheBuster}`;
    }

    return new Request(url, {
      method: 'GET',
      headers,
      cache: 'default',
      mode: 'cors'
    });
  }

  /**
   * Cache resource with timeout
   */
  private async _cacheResourceWithTimeout(request: Request, timeoutMs: number): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Cache timeout for ${request.url}`));
      }, timeoutMs);

      try {
        if (!this.cache) {
          throw new Error('Cache not initialized');
        }

        const response = await fetch(request.clone());
        
        if (response.ok) {
          await this.cache.put(request, response);
          clearTimeout(timeout);
          resolve();
        } else {
          throw new Error(`HTTP ${response.status} for ${request.url}`);
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Enforce maximum cache entries
   */
  private async _enforceMaxEntries(): Promise<void> {
    if (!this.cache) return;

    try {
      const requests = await this.cache.keys();
      
      if (requests.length <= this.config.maxEntries) {
        return;
      }

      // Sort by priority and age, remove oldest optional entries first
      const entries: Array<{ request: Request; priority: number; timestamp: number }> = [];
      
      for (const request of requests) {
        let priority = 3; // Default to optional
        
        if (this.config.criticalResources.some(critical => request.url.includes(critical))) {
          priority = 1; // Critical
        } else if (this.config.optionalResources.some(optional => request.url.includes(optional))) {
          priority = 2; // Optional
        }

        // Try to get timestamp from response headers or use current time
        let timestamp = Date.now();
        try {
          const response = await this.cache.match(request);
          if (response) {
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
              timestamp = new Date(dateHeader).getTime();
            }
          }
        } catch (error) {
          // Use current time as fallback
        }

        entries.push({ request, priority, timestamp });
      }

      // Sort by priority (lower is higher priority) then by age (older first)
      entries.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority number = remove first
        }
        return a.timestamp - b.timestamp; // Older first
      });

      // Remove excess entries
      const toRemove = entries.slice(0, entries.length - this.config.maxEntries);
      
      for (const entry of toRemove) {
        await this.cache.delete(entry.request);
      }

      debugLogger.logLifecycle('INFO', 'Cache entries cleaned up', {
        removed: toRemove.length,
        remaining: this.config.maxEntries
      });

    } catch (error) {
      debugLogger.logError('WARN', 'Failed to enforce max entries', error);
    }
  }

  /**
   * Utility delay function
   */
  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if cache is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.cache !== null;
  }

  /**
   * Get cache name
   */
  getCacheName(): string {
    return this.config.cacheName;
  }
}

// Export singleton instance
export const simplifiedCacheManager = new SimplifiedCacheManager();