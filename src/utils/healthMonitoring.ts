/**
 * Health Monitoring System
 * 
 * Implements real-time health status tracking for all app components,
 * performance metrics collection, and automatic recovery triggers.
 * 
 * Requirements: 2.1, 2.3
 */

import { startupErrorDetector, ErrorSeverity, StartupPhase } from './startupErrorDetection';

export enum ComponentStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED', 
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN'
}

export enum AppComponent {
  REACT_APP = 'REACT_APP',
  AUTHENTICATION = 'AUTHENTICATION',
  SERVICE_WORKER = 'SERVICE_WORKER',
  NETWORK = 'NETWORK',
  STORAGE = 'STORAGE',
  TWA_CONTAINER = 'TWA_CONTAINER',
  CAPACITOR_BRIDGE = 'CAPACITOR_BRIDGE'
}

export interface ComponentHealth {
  component: AppComponent;
  status: ComponentStatus;
  lastCheck: number;
  responseTime?: number;
  errorCount: number;
  uptime: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  startupTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  memoryUsage?: any;
  networkLatency?: number;
  renderTime?: number;
}

export interface HealthCheckResult {
  component: AppComponent;
  status: ComponentStatus;
  responseTime: number;
  details?: Record<string, any>;
  error?: Error;
}

export interface RecoveryTrigger {
  id: string;
  component: AppComponent;
  condition: string;
  action: RecoveryAction;
  triggered: boolean;
  lastTriggered?: number;
}

export enum RecoveryAction {
  RESTART_COMPONENT = 'RESTART_COMPONENT',
  CLEAR_CACHE = 'CLEAR_CACHE',
  RELOAD_PAGE = 'RELOAD_PAGE',
  EMERGENCY_MODE = 'EMERGENCY_MODE',
  SAFE_MODE = 'SAFE_MODE'
}

class HealthMonitoringSystem {
  private componentHealth: Map<AppComponent, ComponentHealth> = new Map();
  private performanceMetrics: PerformanceMetrics | null = null;
  private recoveryTriggers: Map<string, RecoveryTrigger> = new Map();
  private monitoringInterval: number | null = null;
  private checkInterval = 5000; // 5 seconds
  private initialized = false;
  private startTime = Date.now();

  constructor() {
    this.initializeComponents();
    this.setupPerformanceObserver();
    this.setupRecoveryTriggers();
    this.initialized = true;
  }

  private initializeComponents() {
    // Initialize all components with unknown status
    for (const component of Object.values(AppComponent)) {
      this.componentHealth.set(component, {
        component,
        status: ComponentStatus.UNKNOWN,
        lastCheck: 0,
        errorCount: 0,
        uptime: 0
      });
    }
  }

  private setupPerformanceObserver() {
    // Initialize performance metrics
    this.performanceMetrics = {
      startupTime: 0,
      timeToInteractive: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0
    };

    // Observe performance entries
    if ('PerformanceObserver' in window) {
      try {
        // Paint timing
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.performanceMetrics!.firstContentfulPaint = entry.startTime;
            }
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.performanceMetrics!.largestContentfulPaint = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              this.performanceMetrics!.cumulativeLayoutShift += (entry as any).value;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

      } catch (error) {
        console.warn('Performance observer setup failed:', error);
      }
    }

    // Memory usage monitoring
    this.updateMemoryUsage();
  }

  private setupRecoveryTriggers() {
    // Define automatic recovery triggers
    this.addRecoveryTrigger({
      id: 'auth-failure',
      component: AppComponent.AUTHENTICATION,
      condition: 'status === UNHEALTHY && errorCount >= 3',
      action: RecoveryAction.RESTART_COMPONENT,
      triggered: false
    });

    this.addRecoveryTrigger({
      id: 'network-failure',
      component: AppComponent.NETWORK,
      condition: 'status === UNHEALTHY && errorCount >= 5',
      action: RecoveryAction.RELOAD_PAGE,
      triggered: false
    });

    this.addRecoveryTrigger({
      id: 'critical-errors',
      component: AppComponent.REACT_APP,
      condition: 'criticalErrorCount >= 2',
      action: RecoveryAction.EMERGENCY_MODE,
      triggered: false
    });

    this.addRecoveryTrigger({
      id: 'storage-quota',
      component: AppComponent.STORAGE,
      condition: 'status === UNHEALTHY',
      action: RecoveryAction.CLEAR_CACHE,
      triggered: false
    });
  }

  startMonitoring() {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
      this.evaluateRecoveryTriggers();
      this.updatePerformanceMetrics();
    }, this.checkInterval) as unknown as number;

    // Initial health check
    this.performHealthChecks();
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async performHealthChecks() {
    const checks = [
      this.checkReactApp(),
      this.checkAuthentication(),
      this.checkServiceWorker(),
      this.checkNetwork(),
      this.checkStorage(),
      this.checkTWAContainer(),
      this.checkCapacitorBridge()
    ];

    const results = await Promise.allSettled(checks);
    
    results.forEach((result, index) => {
      const component = Object.values(AppComponent)[index];
      if (result.status === 'fulfilled') {
        this.updateComponentHealth(component, result.value);
      } else {
        this.updateComponentHealth(component, {
          component,
          status: ComponentStatus.UNHEALTHY,
          responseTime: 0,
          error: result.reason
        });
      }
    });
  }

  private async checkReactApp(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    
    try {
      // Check if React root is mounted and responsive
      const rootElement = document.getElementById('root');
      const hasContent = rootElement && rootElement.children.length > 0;
      const hasReactContent = rootElement?.querySelector('[data-reactroot], .react-component, [class*="react"]');
      
      const responseTime = performance.now() - startTime;
      
      return {
        component: AppComponent.REACT_APP,
        status: hasContent && hasReactContent ? ComponentStatus.HEALTHY : ComponentStatus.DEGRADED,
        responseTime,
        details: {
          hasRootElement: !!rootElement,
          hasContent,
          hasReactContent: !!hasReactContent,
          childrenCount: rootElement?.children.length || 0
        }
      };
    } catch (error) {
      return {
        component: AppComponent.REACT_APP,
        status: ComponentStatus.UNHEALTHY,
        responseTime: performance.now() - startTime,
        error: error as Error
      };
    }
  }

  private async checkAuthentication(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    
    try {
      // Check if Supabase client is available and responsive
      const supabaseAvailable = window.localStorage.getItem('supabase.auth.token') !== null ||
                               window.sessionStorage.getItem('supabase.auth.token') !== null;
      
      const responseTime = performance.now() - startTime;
      
      return {
        component: AppComponent.AUTHENTICATION,
        status: supabaseAvailable ? ComponentStatus.HEALTHY : ComponentStatus.DEGRADED,
        responseTime,
        details: {
          hasStoredAuth: supabaseAvailable,
          localStorageAvailable: this.isStorageAvailable('localStorage'),
          sessionStorageAvailable: this.isStorageAvailable('sessionStorage')
        }
      };
    } catch (error) {
      return {
        component: AppComponent.AUTHENTICATION,
        status: ComponentStatus.UNHEALTHY,
        responseTime: performance.now() - startTime,
        error: error as Error
      };
    }
  }

  private async checkServiceWorker(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    
    try {
      if (!('serviceWorker' in navigator)) {
        return {
          component: AppComponent.SERVICE_WORKER,
          status: ComponentStatus.DEGRADED,
          responseTime: performance.now() - startTime,
          details: { supported: false }
        };
      }

      const registration = await navigator.serviceWorker.getRegistration();
      const responseTime = performance.now() - startTime;
      
      return {
        component: AppComponent.SERVICE_WORKER,
        status: registration ? ComponentStatus.HEALTHY : ComponentStatus.DEGRADED,
        responseTime,
        details: {
          registered: !!registration,
          active: !!registration?.active,
          installing: !!registration?.installing,
          waiting: !!registration?.waiting
        }
      };
    } catch (error) {
      return {
        component: AppComponent.SERVICE_WORKER,
        status: ComponentStatus.UNHEALTHY,
        responseTime: performance.now() - startTime,
        error: error as Error
      };
    }
  }

  private async checkNetwork(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    
    try {
      // Simple connectivity check
      const online = navigator.onLine;
      const connection = (navigator as any).connection;
      
      // Try a lightweight network request
      let networkLatency = 0;
      if (online) {
        try {
          const testStart = performance.now();
          await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' });
          networkLatency = performance.now() - testStart;
        } catch {
          // Network request failed, but we're "online"
        }
      }
      
      const responseTime = performance.now() - startTime;
      
      return {
        component: AppComponent.NETWORK,
        status: online ? ComponentStatus.HEALTHY : ComponentStatus.UNHEALTHY,
        responseTime,
        details: {
          online,
          effectiveType: connection?.effectiveType || 'unknown',
          downlink: connection?.downlink || 'unknown',
          rtt: connection?.rtt || 'unknown',
          networkLatency
        }
      };
    } catch (error) {
      return {
        component: AppComponent.NETWORK,
        status: ComponentStatus.UNHEALTHY,
        responseTime: performance.now() - startTime,
        error: error as Error
      };
    }
  }

  private async checkStorage(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    
    try {
      const localStorageOk = this.isStorageAvailable('localStorage');
      const sessionStorageOk = this.isStorageAvailable('sessionStorage');
      const indexedDBOk = await this.checkIndexedDB();
      
      let quota = null;
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        quota = await navigator.storage.estimate();
      }
      
      const responseTime = performance.now() - startTime;
      const allStorageOk = localStorageOk && sessionStorageOk && indexedDBOk;
      
      return {
        component: AppComponent.STORAGE,
        status: allStorageOk ? ComponentStatus.HEALTHY : ComponentStatus.DEGRADED,
        responseTime,
        details: {
          localStorage: localStorageOk,
          sessionStorage: sessionStorageOk,
          indexedDB: indexedDBOk,
          quota: quota ? {
            usage: quota.usage,
            quota: quota.quota,
            usagePercentage: quota.quota ? (quota.usage! / quota.quota * 100).toFixed(2) : 'unknown'
          } : null
        }
      };
    } catch (error) {
      return {
        component: AppComponent.STORAGE,
        status: ComponentStatus.UNHEALTHY,
        responseTime: performance.now() - startTime,
        error: error as Error
      };
    }
  }

  private async checkTWAContainer(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    
    try {
      const isTWA = this.detectTWAEnvironment();
      const hasAndroidInterface = 'android' in window;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      const responseTime = performance.now() - startTime;
      
      return {
        component: AppComponent.TWA_CONTAINER,
        status: isTWA ? ComponentStatus.HEALTHY : ComponentStatus.DEGRADED,
        responseTime,
        details: {
          isTWA,
          hasAndroidInterface,
          isStandalone,
          userAgent: navigator.userAgent,
          referrer: document.referrer
        }
      };
    } catch (error) {
      return {
        component: AppComponent.TWA_CONTAINER,
        status: ComponentStatus.UNHEALTHY,
        responseTime: performance.now() - startTime,
        error: error as Error
      };
    }
  }

  private async checkCapacitorBridge(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    
    try {
      // Check if Capacitor is available and responsive
      const hasCapacitor = 'Capacitor' in window;
      const isNative = hasCapacitor && (window as any).Capacitor?.isNativePlatform?.();
      
      const responseTime = performance.now() - startTime;
      
      return {
        component: AppComponent.CAPACITOR_BRIDGE,
        status: hasCapacitor ? ComponentStatus.HEALTHY : ComponentStatus.DEGRADED,
        responseTime,
        details: {
          hasCapacitor,
          isNative,
          platform: hasCapacitor ? (window as any).Capacitor?.getPlatform?.() : 'unknown'
        }
      };
    } catch (error) {
      return {
        component: AppComponent.CAPACITOR_BRIDGE,
        status: ComponentStatus.UNHEALTHY,
        responseTime: performance.now() - startTime,
        error: error as Error
      };
    }
  }

  private isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private async checkIndexedDB(): Promise<boolean> {
    try {
      if (!('indexedDB' in window)) return false;
      
      return new Promise((resolve) => {
        const request = indexedDB.open('__health_check__', 1);
        request.onsuccess = () => {
          request.result.close();
          indexedDB.deleteDatabase('__health_check__');
          resolve(true);
        };
        request.onerror = () => resolve(false);
        request.onblocked = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  private detectTWAEnvironment(): boolean {
    return navigator.userAgent.includes('wv') || 
           document.referrer.includes('android-app://') ||
           window.matchMedia('(display-mode: standalone)').matches ||
           'android' in window;
  }

  private updateComponentHealth(component: AppComponent, result: HealthCheckResult) {
    const existing = this.componentHealth.get(component);
    const now = Date.now();
    
    const health: ComponentHealth = {
      component,
      status: result.status,
      lastCheck: now,
      responseTime: result.responseTime,
      errorCount: result.error ? (existing?.errorCount || 0) + 1 : (existing?.errorCount || 0),
      uptime: existing ? existing.uptime + (now - existing.lastCheck) : 0,
      metadata: result.details
    };
    
    this.componentHealth.set(component, health);
    
    // Log status changes
    if (existing && existing.status !== result.status) {
      console.log(`🏥 Health status changed: ${component} ${existing.status} → ${result.status}`);
    }
  }

  private evaluateRecoveryTriggers() {
    for (const trigger of this.recoveryTriggers.values()) {
      if (trigger.triggered) continue;
      
      const shouldTrigger = this.evaluateTriggerCondition(trigger);
      if (shouldTrigger) {
        this.executeTrigger(trigger);
      }
    }
  }

  private evaluateTriggerCondition(trigger: RecoveryTrigger): boolean {
    const health = this.componentHealth.get(trigger.component);
    if (!health) return false;
    
    const criticalErrorCount = startupErrorDetector.getErrorsBySeverity(ErrorSeverity.CRITICAL).length;
    
    // Simple condition evaluation (could be enhanced with a proper expression parser)
    const context = {
      status: health.status,
      errorCount: health.errorCount,
      criticalErrorCount,
      responseTime: health.responseTime || 0
    };
    
    try {
      // Basic condition evaluation
      return this.evaluateCondition(trigger.condition, context);
    } catch (error) {
      console.warn(`Failed to evaluate trigger condition: ${trigger.condition}`, error);
      return false;
    }
  }

  private evaluateCondition(condition: string, context: any): boolean {
    // Simple condition parser - replace with proper expression evaluator if needed
    const normalizedCondition = condition
      .replace(/status === UNHEALTHY/g, `"${context.status}" === "UNHEALTHY"`)
      .replace(/status === DEGRADED/g, `"${context.status}" === "DEGRADED"`)
      .replace(/status === HEALTHY/g, `"${context.status}" === "HEALTHY"`)
      .replace(/errorCount/g, context.errorCount.toString())
      .replace(/criticalErrorCount/g, context.criticalErrorCount.toString())
      .replace(/responseTime/g, context.responseTime.toString());
    
    try {
      return Function(`"use strict"; return (${normalizedCondition})`)();
    } catch {
      return false;
    }
  }

  private executeTrigger(trigger: RecoveryTrigger) {
    trigger.triggered = true;
    trigger.lastTriggered = Date.now();
    
    console.warn(`🚨 Recovery trigger activated: ${trigger.id} - ${trigger.action}`);
    
    // Emit recovery event
    window.dispatchEvent(new CustomEvent('health-recovery-triggered', {
      detail: trigger
    }));
    
    // Execute recovery action based on type
    switch (trigger.action) {
      case RecoveryAction.EMERGENCY_MODE:
        this.activateEmergencyMode();
        break;
      case RecoveryAction.CLEAR_CACHE:
        this.clearApplicationCache();
        break;
      case RecoveryAction.RELOAD_PAGE:
        this.reloadPage();
        break;
      case RecoveryAction.SAFE_MODE:
        this.activateSafeMode();
        break;
    }
  }

  private activateEmergencyMode() {
    localStorage.setItem('emergency-debug', 'true');
    window.dispatchEvent(new CustomEvent('activate-emergency-mode'));
  }

  private clearApplicationCache() {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  private reloadPage() {
    window.location.reload();
  }

  private activateSafeMode() {
    localStorage.setItem('safe-mode', 'true');
    window.location.reload();
  }

  private updatePerformanceMetrics() {
    if (!this.performanceMetrics) return;
    
    // Update startup time
    this.performanceMetrics.startupTime = Date.now() - this.startTime;
    
    // Update memory usage
    this.updateMemoryUsage();
    
    // Calculate time to interactive (simplified)
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.performanceMetrics.timeToInteractive = navigation.loadEventEnd - navigation.fetchStart;
    }
  }

  private updateMemoryUsage() {
    if ('memory' in performance) {
      this.performanceMetrics!.memoryUsage = (performance as any).memory;
    }
  }

  // Public API methods
  addRecoveryTrigger(trigger: RecoveryTrigger) {
    this.recoveryTriggers.set(trigger.id, trigger);
  }

  removeRecoveryTrigger(id: string) {
    this.recoveryTriggers.delete(id);
  }

  getComponentHealth(component?: AppComponent): ComponentHealth | ComponentHealth[] {
    if (component) {
      return this.componentHealth.get(component) || {
        component,
        status: ComponentStatus.UNKNOWN,
        lastCheck: 0,
        errorCount: 0,
        uptime: 0
      };
    }
    return Array.from(this.componentHealth.values());
  }

  getOverallHealth(): ComponentStatus {
    const healths = Array.from(this.componentHealth.values());
    
    if (healths.some(h => h.status === ComponentStatus.UNHEALTHY)) {
      return ComponentStatus.UNHEALTHY;
    }
    
    if (healths.some(h => h.status === ComponentStatus.DEGRADED)) {
      return ComponentStatus.DEGRADED;
    }
    
    if (healths.every(h => h.status === ComponentStatus.HEALTHY)) {
      return ComponentStatus.HEALTHY;
    }
    
    return ComponentStatus.UNKNOWN;
  }

  getPerformanceMetrics(): PerformanceMetrics | null {
    return this.performanceMetrics;
  }

  getHealthSummary() {
    const components = Array.from(this.componentHealth.values());
    const overall = this.getOverallHealth();
    
    return {
      overall,
      components: components.length,
      healthy: components.filter(c => c.status === ComponentStatus.HEALTHY).length,
      degraded: components.filter(c => c.status === ComponentStatus.DEGRADED).length,
      unhealthy: components.filter(c => c.status === ComponentStatus.UNHEALTHY).length,
      unknown: components.filter(c => c.status === ComponentStatus.UNKNOWN).length,
      totalErrors: components.reduce((sum, c) => sum + c.errorCount, 0),
      avgResponseTime: components.reduce((sum, c) => sum + (c.responseTime || 0), 0) / components.length,
      uptime: Date.now() - this.startTime
    };
  }

  exportHealthData() {
    return {
      timestamp: new Date().toISOString(),
      overall: this.getOverallHealth(),
      components: Array.from(this.componentHealth.values()),
      performance: this.performanceMetrics,
      triggers: Array.from(this.recoveryTriggers.values()),
      summary: this.getHealthSummary()
    };
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitoringSystem();