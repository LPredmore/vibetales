interface LogEntry {
  timestamp: string;
  category: 'AUTH' | 'SESSION' | 'STORAGE' | 'VERSION' | 'TWA' | 'AUTOFILL' | 'LIFECYCLE' | 'NETWORK' | 'PERFORMANCE' | 'ERROR' | 'ANDROID' | 'CACHE' | 'ROUTING' | 'SYSTEM';
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'CRITICAL';
  message: string;
  data?: unknown;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
}

type AndroidBridge = { log?: (message: string, payload: string) => void };

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 200; // Reduced from 1000
  private storageKey = 'vibetales-debug-logs';
  private performanceMarks: Map<string, number> = new Map();
  private isEmergencyMode: boolean = false;
  private initialized = false;
  private monitoringSetup = false;

  constructor() {
    // Minimal initialization - only check emergency mode and load persisted logs
    this.checkEmergencyMode();
    this.loadPersistedLogs();
    this.initialized = true;
  }

  private lazyInit() {
    if (this.monitoringSetup) return;
    
    // Only setup monitoring when actually needed
    this.setupGlobalErrorHandlers();
    this.monitoringSetup = true;
    
    this.log('SYSTEM', 'INFO', 'DebugLogger lazy initialized', {
      buildTimestamp: new Date().toISOString(),
      emergencyMode: this.isEmergencyMode,
      storedLogs: this.logs.length
    });
  }

  private checkEmergencyMode() {
    this.isEmergencyMode = window.location.search.includes('debug=emergency') || 
                          localStorage.getItem('emergency-debug') === 'true';
    if (this.isEmergencyMode) {
      console.warn('🚨 EMERGENCY DEBUG MODE ACTIVATED');
    }
  }

  private setupGlobalErrorHandlers() {
    window.addEventListener('error', (event) => {
      // Prevent infinite loops by checking for debug-related errors
      const isDebugError = event.filename?.includes('debugLogger') || 
                          event.error?.stack?.includes('debugLogger') ||
                          event.message?.includes('null (reading \'style\')') ||
                          event.message?.includes('EmergencyDebugOverlay');
      
      if (!isDebugError) {
        this.log('ERROR', 'CRITICAL', 'Unhandled error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack
        });
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      // Skip debug-related promise rejections
      const isDebugError = event.reason?.toString?.()?.includes('debugLogger') ||
                          event.reason?.stack?.includes('debugLogger') ||
                          event.reason?.toString?.()?.includes('EmergencyDebugOverlay');
      
      if (!isDebugError) {
        this.log('ERROR', 'CRITICAL', 'Unhandled promise rejection', {
          reason: event.reason,
          stack: event.reason?.stack
        });
      }
    });
  }

  markPerformance(name: string) {
    const timestamp = performance.now();
    this.performanceMarks.set(name, timestamp);
    if (this.isEmergencyMode) {
      this.log('PERFORMANCE', 'DEBUG', `Performance mark: ${name}`, { timestamp });
    }
  }

  measurePerformance(name: string, startMark: string) {
    const startTime = this.performanceMarks.get(startMark);
    if (startTime) {
      const duration = performance.now() - startTime;
      if (this.isEmergencyMode) {
        this.log('PERFORMANCE', 'INFO', `Performance measure: ${name}`, { 
          duration: `${duration.toFixed(2)}ms`,
          startMark,
          endTime: performance.now()
        });
      }
      return duration;
    }
    return null;
  }

  log(category: LogEntry['category'], level: LogEntry['level'], message: string, data?: unknown) {
    if (!this.initialized) return;
    
    // Initialize monitoring only when first log is made
    this.lazyInit();
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      category,
      level,
      message,
      data
    };

    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Simplified console output
    const emoji = this.getLogEmoji(category, level);
    console.log(`${emoji} [${category}:${level}] ${message}`, data || '');
    
    // Only persist critical logs immediately
    if (level === 'CRITICAL' || this.isEmergencyMode) {
      this.persistLogs();
    }
  }

  private getLogEmoji(category: string, level: string): string {
    if (level === 'CRITICAL' || level === 'ERROR') return '❌';
    if (level === 'WARN') return '⚠️';
    if (category === 'NETWORK') return '🌐';
    if (category === 'PERFORMANCE') return '⚡';
    if (category === 'AUTH') return '🔐';
    if (category === 'ANDROID') return '📱';
    return 'ℹ️';
  }

  private persistLogs() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to persist debug logs:', error);
    }
  }

  private loadPersistedLogs() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load persisted logs:', error);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByCategory(category: LogEntry['category']): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem(this.storageKey);
    this.log('SYSTEM', 'INFO', 'Debug logs cleared');
  }

  exportLogs(): string {
    return JSON.stringify({
      exported: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      logs: this.logs
    }, null, 2);
  }

  // Specific logging methods for common scenarios
  logAuth(level: LogEntry['level'], message: string, data?: unknown) {
    this.log('AUTH', level, message, data);
  }

  logSession(level: LogEntry['level'], message: string, data?: unknown) {
    this.log('SESSION', level, message, data);
  }

  logStorage(level: LogEntry['level'], message: string, data?: unknown) {
    this.log('STORAGE', level, message, data);
  }

  logVersion(level: LogEntry['level'], message: string, data?: unknown) {
    this.log('VERSION', level, message, data);
  }

  logTWA(level: LogEntry['level'], message: string, data?: unknown) {
    this.log('TWA', level, message, data);
    // Also log to Android logcat if available
    const androidBridge = (window as Window & { android?: AndroidBridge }).android;
    if (androidBridge?.log) {
      androidBridge.log(`TWA: ${message}`, JSON.stringify(data || {}));
    }
  }

  // Comprehensive TWA startup diagnostics
  logTWAStartup() {
    this.logTWA('INFO', '=== TWA STARTUP DIAGNOSTICS ===');
    this.logTWA('INFO', 'User Agent', navigator.userAgent);
    this.logTWA('INFO', 'URL', window.location.href);
    this.logTWA('INFO', 'Referrer', document.referrer);
    this.logTWA('INFO', 'Display Mode', window.matchMedia('(display-mode: standalone)').matches);
    this.logTWA('INFO', 'Service Worker Support', 'serviceWorker' in navigator);
    this.logTWA('INFO', 'Android Object', 'android' in window);
    this.logTWA('INFO', 'TWA Object', 'TWA' in window);
    this.logTWA('INFO', 'Viewport', `${window.innerWidth}x${window.innerHeight}`);
    this.logTWA('INFO', 'Screen', `${screen.width}x${screen.height}`);
    this.logTWA('INFO', 'Connection', this.getConnectionType());
    this.checkStorageQuota().then(quota => {
      this.logTWA('INFO', 'Storage Quota', quota);
    });
    this.logTWA('INFO', '=== END DIAGNOSTICS ===');
  }

  private getConnectionType(): string {
    const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
    return nav.connection?.effectiveType || 'unknown';
  }

  private async checkStorageQuota() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          available: (estimate.quota || 0) - (estimate.usage || 0)
        };
      }
    } catch (error) {
      return { error: (error as Error).message };
    }
    return 'not supported';
  }

  logAutofill(level: LogEntry['level'], message: string, data?: unknown) {
    this.log('AUTOFILL', level, message, data);
  }

  logLifecycle(level: LogEntry['level'], message: string, data?: unknown) {
    this.log('LIFECYCLE', level, message, data);
  }

  logNetwork(level: LogEntry['level'], message: string, data?: unknown) {
    this.log('NETWORK', level, message, data);
  }

  logPerformance(level: LogEntry['level'], message: string, data?: unknown) {
    this.log('PERFORMANCE', level, message, data);
  }

  logError(level: LogEntry['level'], message: string, data?: unknown) {
    this.log('ERROR', level, message, data);
  }

  logAndroid(level: LogEntry['level'], message: string, data?: unknown) {
    this.log('ANDROID', level, message, data);
  }

  logCache(level: LogEntry['level'], message: string, data?: unknown) {
    this.log('CACHE', level, message, data);
  }

  logRouting(level: LogEntry['level'], message: string, data?: unknown) {
    this.log('ROUTING', level, message, data);
  }

  // Emergency mode utilities
  enableEmergencyMode() {
    localStorage.setItem('emergency-debug', 'true');
    this.isEmergencyMode = true;
    this.log('SYSTEM', 'CRITICAL', 'Emergency debug mode enabled');
  }

  disableEmergencyMode() {
    localStorage.removeItem('emergency-debug');
    this.isEmergencyMode = false;
    this.log('SYSTEM', 'INFO', 'Emergency debug mode disabled');
  }

  isEmergencyModeActive(): boolean {
    return this.isEmergencyMode;
  }

  // Conditional network monitoring - only in emergency mode
  setupNetworkMonitoring() {
    if (this.monitoringSetup || !this.isEmergencyMode) return;
    
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      
      try {
        const response = await originalFetch(...args);
        if (response.status >= 400) {
          this.logNetwork('ERROR', `Network error: ${response.status} ${url}`, {
            status: response.status,
            url
          });
        }
        return response;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logNetwork('ERROR', `Network error: ${url}`, {
          error: message,
          url
        });
        throw error;
      }
    };
  }

  // Minimal storage monitoring - only in emergency mode
  setupStorageMonitoring() {
    if (!this.isEmergencyMode) return;
    
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key: string, value: string) => {
      if (key.includes('debug') || key.includes('error')) {
        this.logStorage('INFO', `localStorage.setItem: ${key}`);
      }
      return originalSetItem.call(localStorage, key, value);
    };
  }

  detectTWA(): boolean {
    const userAgent = navigator.userAgent;
    const isTWA = userAgent.includes('wv') || 
                  document.referrer.includes('android-app://') ||
                  window.matchMedia('(display-mode: standalone)').matches;
    return isTWA;
  }
}

export const debugLogger = new DebugLogger();
export type { LogEntry };
