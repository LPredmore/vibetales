/**
 * Progressive Loading Strategies
 * 
 * Implements network-aware loading that adapts to connection quality,
 * resource prioritization system, and timeout handling with progressive degradation.
 * 
 * Requirements: 1.1, 1.3, 4.1, 4.2
 */

import { debugLogger } from './debugLogger';
import { startupErrorDetector } from './startupErrorDetection';

export enum NetworkQuality {
  FAST = 'fast',        // 4G, good WiFi
  MODERATE = 'moderate', // 3G, slow WiFi
  SLOW = 'slow',        // 2G, very slow connection
  OFFLINE = 'offline'   // No connection
}

export enum ResourcePriority {
  CRITICAL = 'critical',     // Must load for app to function
  HIGH = 'high',            // Important for full functionality
  MEDIUM = 'medium',        // Nice to have
  LOW = 'low'              // Can be deferred
}

export interface LoadingStrategy {
  name: string;
  networkQuality: NetworkQuality;
  timeouts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  concurrency: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffDelay: number;
  };
}

export interface ResourceRequest {
  id: string;
  url: string;
  priority: ResourcePriority;
  timeout?: number;
  retries?: number;
  fallbackUrl?: string;
  validator?: (response: Response) => boolean;
  onProgress?: (loaded: number, total: number) => void;
}

export interface LoadingResult {
  success: boolean;
  resource: ResourceRequest;
  response?: Response;
  data?: any;
  error?: Error;
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  networkQuality: NetworkQuality;
  retryCount: number;
}

export interface LoadingBatch {
  id: string;
  resources: ResourceRequest[];
  priority: ResourcePriority;
  timeout: number;
  concurrency: number;
}

class ProgressiveLoadingManager {
  private currentStrategy: LoadingStrategy;
  private networkQuality: NetworkQuality = NetworkQuality.MODERATE;
  private loadingQueue: Map<ResourcePriority, ResourceRequest[]> = new Map();
  private activeRequests: Map<string, AbortController> = new Map();
  private loadingResults: Map<string, LoadingResult> = new Map();
  private networkMonitor: NetworkMonitor;

  constructor() {
    this.networkMonitor = new NetworkMonitor();
    this.setupLoadingStrategies();
    this.detectNetworkQuality();
    this.setupNetworkMonitoring();
  }

  private setupLoadingStrategies() {
    // Initialize loading queues
    Object.values(ResourcePriority).forEach(priority => {
      this.loadingQueue.set(priority as ResourcePriority, []);
    });
  }

  private detectNetworkQuality() {
    this.networkQuality = this.networkMonitor.getCurrentNetworkQuality();
    this.currentStrategy = this.getStrategyForNetworkQuality(this.networkQuality);
    
    debugLogger.logNetwork('INFO', 'Network quality detected', {
      quality: this.networkQuality,
      strategy: this.currentStrategy.name
    });
  }

  private setupNetworkMonitoring() {
    // Monitor network changes
    this.networkMonitor.onNetworkChange((quality) => {
      if (quality !== this.networkQuality) {
        debugLogger.logNetwork('INFO', 'Network quality changed', {
          from: this.networkQuality,
          to: quality
        });
        
        this.networkQuality = quality;
        this.currentStrategy = this.getStrategyForNetworkQuality(quality);
        this.adaptToNetworkChange();
      }
    });
  }

  private getStrategyForNetworkQuality(quality: NetworkQuality): LoadingStrategy {
    switch (quality) {
      case NetworkQuality.FAST:
        return {
          name: 'Fast Network Strategy',
          networkQuality: quality,
          timeouts: {
            critical: 5000,
            high: 8000,
            medium: 12000,
            low: 20000
          },
          concurrency: {
            critical: 4,
            high: 6,
            medium: 4,
            low: 2
          },
          retryPolicy: {
            maxRetries: 3,
            backoffMultiplier: 1.5,
            maxBackoffDelay: 5000
          }
        };

      case NetworkQuality.MODERATE:
        return {
          name: 'Moderate Network Strategy',
          networkQuality: quality,
          timeouts: {
            critical: 8000,
            high: 12000,
            medium: 18000,
            low: 30000
          },
          concurrency: {
            critical: 2,
            high: 3,
            medium: 2,
            low: 1
          },
          retryPolicy: {
            maxRetries: 4,
            backoffMultiplier: 2,
            maxBackoffDelay: 8000
          }
        };

      case NetworkQuality.SLOW:
        return {
          name: 'Slow Network Strategy',
          networkQuality: quality,
          timeouts: {
            critical: 15000,
            high: 25000,
            medium: 40000,
            low: 60000
          },
          concurrency: {
            critical: 1,
            high: 2,
            medium: 1,
            low: 1
          },
          retryPolicy: {
            maxRetries: 5,
            backoffMultiplier: 2.5,
            maxBackoffDelay: 15000
          }
        };

      case NetworkQuality.OFFLINE:
      default:
        return {
          name: 'Offline Strategy',
          networkQuality: quality,
          timeouts: {
            critical: 3000,
            high: 3000,
            medium: 3000,
            low: 3000
          },
          concurrency: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
          },
          retryPolicy: {
            maxRetries: 0,
            backoffMultiplier: 1,
            maxBackoffDelay: 1000
          }
        };
    }
  }

  private adaptToNetworkChange() {
    // Cancel low-priority requests on network degradation
    if (this.networkQuality === NetworkQuality.SLOW || this.networkQuality === NetworkQuality.OFFLINE) {
      this.cancelRequestsByPriority([ResourcePriority.LOW, ResourcePriority.MEDIUM]);
    }
    
    // Adjust timeouts for active requests
    this.adjustActiveRequestTimeouts();
  }

  private cancelRequestsByPriority(priorities: ResourcePriority[]) {
    for (const [requestId, controller] of this.activeRequests) {
      const result = this.loadingResults.get(requestId);
      if (result && priorities.includes(result.resource.priority)) {
        debugLogger.logNetwork('WARN', `Cancelling ${result.resource.priority} priority request due to network change`, {
          requestId,
          url: result.resource.url
        });
        controller.abort();
        this.activeRequests.delete(requestId);
      }
    }
  }

  private adjustActiveRequestTimeouts() {
    // Implementation would adjust timeouts for active requests
    // This is a simplified version - in practice, you'd need to track and adjust individual request timeouts
    debugLogger.logNetwork('INFO', 'Adjusting active request timeouts for network quality', {
      networkQuality: this.networkQuality,
      activeRequests: this.activeRequests.size
    });
  }

  async loadResource(request: ResourceRequest): Promise<LoadingResult> {
    const startTime = performance.now();
    const timeout = request.timeout || this.currentStrategy.timeouts[request.priority];
    const maxRetries = request.retries ?? this.currentStrategy.retryPolicy.maxRetries;
    
    debugLogger.logNetwork('INFO', `Loading resource: ${request.id}`, {
      url: request.url,
      priority: request.priority,
      timeout,
      networkQuality: this.networkQuality
    });

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.attemptResourceLoad(request, timeout, attempt);
        
        if (result.success) {
          debugLogger.logNetwork('INFO', `Resource loaded successfully: ${request.id}`, {
            duration: result.timing.duration,
            attempt: attempt + 1
          });
          return result;
        }
        
        lastError = result.error || new Error('Unknown loading error');
        
        // Apply backoff delay before retry
        if (attempt < maxRetries) {
          const backoffDelay = this.calculateBackoffDelay(attempt);
          debugLogger.logNetwork('WARN', `Resource load failed, retrying in ${backoffDelay}ms`, {
            resourceId: request.id,
            attempt: attempt + 1,
            error: lastError.message
          });
          await this.delay(backoffDelay);
        }
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const backoffDelay = this.calculateBackoffDelay(attempt);
          await this.delay(backoffDelay);
        }
      }
    }

    // All attempts failed
    const endTime = performance.now();
    const failureResult: LoadingResult = {
      success: false,
      resource: request,
      error: lastError || new Error('Resource loading failed'),
      timing: {
        startTime,
        endTime,
        duration: endTime - startTime
      },
      networkQuality: this.networkQuality,
      retryCount: maxRetries
    };

    debugLogger.logNetwork('ERROR', `Resource loading failed after ${maxRetries + 1} attempts: ${request.id}`, {
      error: lastError?.message,
      duration: failureResult.timing.duration
    });

    return failureResult;
  }

  private async attemptResourceLoad(
    request: ResourceRequest, 
    timeout: number, 
    attempt: number
  ): Promise<LoadingResult> {
    const startTime = performance.now();
    const controller = new AbortController();
    
    // Store active request for potential cancellation
    this.activeRequests.set(request.id, controller);
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          controller.abort();
          reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);
      });
      
      // Create fetch promise
      const fetchPromise = fetch(request.url, {
        signal: controller.signal,
        cache: attempt === 0 ? 'default' : 'no-cache' // Use cache on first attempt
      });
      
      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      // Validate response
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Custom validation if provided
      if (request.validator && !request.validator(response)) {
        throw new Error('Response failed custom validation');
      }
      
      const endTime = performance.now();
      
      // Clean up
      this.activeRequests.delete(request.id);
      
      return {
        success: true,
        resource: request,
        response,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        },
        networkQuality: this.networkQuality,
        retryCount: attempt
      };
      
    } catch (error) {
      const endTime = performance.now();
      
      // Clean up
      this.activeRequests.delete(request.id);
      
      // Try fallback URL if available and this is the last attempt
      if (request.fallbackUrl && attempt === this.currentStrategy.retryPolicy.maxRetries) {
        debugLogger.logNetwork('WARN', `Trying fallback URL for ${request.id}`, {
          originalUrl: request.url,
          fallbackUrl: request.fallbackUrl
        });
        
        const fallbackRequest = { ...request, url: request.fallbackUrl, fallbackUrl: undefined };
        return await this.attemptResourceLoad(fallbackRequest, timeout, 0);
      }
      
      return {
        success: false,
        resource: request,
        error: error as Error,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        },
        networkQuality: this.networkQuality,
        retryCount: attempt
      };
    }
  }

  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const delay = baseDelay * Math.pow(this.currentStrategy.retryPolicy.backoffMultiplier, attempt);
    return Math.min(delay, this.currentStrategy.retryPolicy.maxBackoffDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async loadResourceBatch(batch: LoadingBatch): Promise<LoadingResult[]> {
    debugLogger.logNetwork('INFO', `Loading resource batch: ${batch.id}`, {
      resourceCount: batch.resources.length,
      priority: batch.priority,
      concurrency: batch.concurrency
    });

    const results: LoadingResult[] = [];
    const semaphore = new Semaphore(batch.concurrency);
    
    const loadPromises = batch.resources.map(async (resource) => {
      await semaphore.acquire();
      
      try {
        const result = await this.loadResource(resource);
        results.push(result);
        return result;
      } finally {
        semaphore.release();
      }
    });
    
    // Wait for all resources to complete or timeout
    try {
      await Promise.race([
        Promise.allSettled(loadPromises),
        this.createBatchTimeout(batch.timeout)
      ]);
    } catch (error) {
      debugLogger.logNetwork('ERROR', `Batch loading timeout: ${batch.id}`, error);
    }
    
    debugLogger.logNetwork('INFO', `Batch loading complete: ${batch.id}`, {
      totalResources: batch.resources.length,
      successfulLoads: results.filter(r => r.success).length,
      failedLoads: results.filter(r => !r.success).length
    });
    
    return results;
  }

  private async createBatchTimeout(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Batch timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  // Progressive degradation methods
  async loadWithProgressiveDegradation(
    resources: ResourceRequest[]
  ): Promise<{ critical: LoadingResult[], optional: LoadingResult[] }> {
    // Separate critical and optional resources
    const criticalResources = resources.filter(r => r.priority === ResourcePriority.CRITICAL);
    const optionalResources = resources.filter(r => r.priority !== ResourcePriority.CRITICAL);
    
    debugLogger.logNetwork('INFO', 'Starting progressive degradation loading', {
      criticalCount: criticalResources.length,
      optionalCount: optionalResources.length,
      networkQuality: this.networkQuality
    });
    
    // Load critical resources first
    const criticalBatch: LoadingBatch = {
      id: 'critical-batch',
      resources: criticalResources,
      priority: ResourcePriority.CRITICAL,
      timeout: this.currentStrategy.timeouts.critical * criticalResources.length,
      concurrency: this.currentStrategy.concurrency.critical
    };
    
    const criticalResults = await this.loadResourceBatch(criticalBatch);
    
    // Check if critical loading was successful enough to continue
    const criticalSuccessRate = criticalResults.filter(r => r.success).length / criticalResults.length;
    
    if (criticalSuccessRate < 0.8) { // 80% success threshold
      debugLogger.logNetwork('WARN', 'Critical resource loading below threshold, skipping optional resources', {
        successRate: criticalSuccessRate,
        threshold: 0.8
      });
      
      return {
        critical: criticalResults,
        optional: []
      };
    }
    
    // Load optional resources with lower priority
    const optionalBatch: LoadingBatch = {
      id: 'optional-batch',
      resources: optionalResources,
      priority: ResourcePriority.HIGH,
      timeout: this.currentStrategy.timeouts.high * Math.min(optionalResources.length, 5),
      concurrency: Math.max(1, this.currentStrategy.concurrency.high - 1)
    };
    
    const optionalResults = await this.loadResourceBatch(optionalBatch);
    
    return {
      critical: criticalResults,
      optional: optionalResults
    };
  }

  // Public API methods
  getCurrentNetworkQuality(): NetworkQuality {
    return this.networkQuality;
  }

  getCurrentStrategy(): LoadingStrategy {
    return this.currentStrategy;
  }

  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  cancelAllRequests() {
    debugLogger.logNetwork('WARN', 'Cancelling all active requests', {
      count: this.activeRequests.size
    });
    
    for (const [requestId, controller] of this.activeRequests) {
      controller.abort();
    }
    
    this.activeRequests.clear();
  }

  getLoadingResults(): LoadingResult[] {
    return Array.from(this.loadingResults.values());
  }
}

// Network monitoring utility
class NetworkMonitor {
  private currentQuality: NetworkQuality = NetworkQuality.MODERATE;
  private listeners: ((quality: NetworkQuality) => void)[] = [];
  private lastSpeedTest: number = 0;
  private speedTestInterval = 30000; // 30 seconds

  constructor() {
    this.detectInitialQuality();
    this.setupEventListeners();
  }

  private detectInitialQuality() {
    if (!navigator.onLine) {
      this.currentQuality = NetworkQuality.OFFLINE;
      return;
    }

    // Use Connection API if available
    const connection = (navigator as any).connection;
    if (connection) {
      this.currentQuality = this.mapConnectionToQuality(connection);
    } else {
      // Fallback to speed test
      this.performSpeedTest();
    }
  }

  private mapConnectionToQuality(connection: any): NetworkQuality {
    const effectiveType = connection.effectiveType;
    const downlink = connection.downlink;

    if (effectiveType === '4g' && downlink > 10) {
      return NetworkQuality.FAST;
    } else if (effectiveType === '4g' || (effectiveType === '3g' && downlink > 1.5)) {
      return NetworkQuality.MODERATE;
    } else if (effectiveType === '3g' || effectiveType === '2g') {
      return NetworkQuality.SLOW;
    }

    return NetworkQuality.MODERATE;
  }

  private setupEventListeners() {
    // Online/offline events
    window.addEventListener('online', () => {
      this.updateQuality(NetworkQuality.MODERATE);
      this.performSpeedTest();
    });

    window.addEventListener('offline', () => {
      this.updateQuality(NetworkQuality.OFFLINE);
    });

    // Connection change events
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        const newQuality = this.mapConnectionToQuality(connection);
        this.updateQuality(newQuality);
      });
    }
  }

  private async performSpeedTest() {
    const now = Date.now();
    if (now - this.lastSpeedTest < this.speedTestInterval) {
      return; // Too soon since last test
    }

    this.lastSpeedTest = now;

    try {
      const startTime = performance.now();
      
      // Test with a small image (approximately 50KB)
      const response = await fetch('/favicon.ico?' + Math.random(), {
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const quality = this.calculateQualityFromTiming(duration);
        this.updateQuality(quality);
      }
    } catch (error) {
      debugLogger.logNetwork('WARN', 'Speed test failed', error);
    }
  }

  private calculateQualityFromTiming(duration: number): NetworkQuality {
    if (duration < 200) {
      return NetworkQuality.FAST;
    } else if (duration < 1000) {
      return NetworkQuality.MODERATE;
    } else {
      return NetworkQuality.SLOW;
    }
  }

  private updateQuality(quality: NetworkQuality) {
    if (quality !== this.currentQuality) {
      this.currentQuality = quality;
      this.notifyListeners(quality);
    }
  }

  private notifyListeners(quality: NetworkQuality) {
    this.listeners.forEach(listener => {
      try {
        listener(quality);
      } catch (error) {
        debugLogger.logNetwork('ERROR', 'Network quality listener error', error);
      }
    });
  }

  getCurrentNetworkQuality(): NetworkQuality {
    return this.currentQuality;
  }

  onNetworkChange(listener: (quality: NetworkQuality) => void) {
    this.listeners.push(listener);
  }

  removeNetworkChangeListener(listener: (quality: NetworkQuality) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
}

// Semaphore utility for concurrency control
class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }
}

// Singleton instance
export const progressiveLoadingManager = new ProgressiveLoadingManager();