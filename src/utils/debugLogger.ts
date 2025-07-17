interface LogEntry {
  timestamp: string;
  category: 'AUTH' | 'SESSION' | 'STORAGE' | 'VERSION' | 'TWA' | 'AUTOFILL' | 'LIFECYCLE' | 'NETWORK' | 'PERFORMANCE' | 'ERROR' | 'ANDROID' | 'CACHE' | 'ROUTING';
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'CRITICAL';
  message: string;
  data?: any;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Increased for comprehensive debugging
  private storageKey = 'storybridge-debug-logs';
  private performanceMarks: Map<string, number> = new Map();
  private isEmergencyMode: boolean = false;

  constructor() {
    this.checkEmergencyMode();
    this.setupGlobalErrorHandlers();
    this.loadPersistedLogs();
    this.logSystemInfo();
    this.logAndroidSpecificInfo();
    this.startPerformanceMonitoring();
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
      this.log('ERROR', 'CRITICAL', 'Unhandled error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.log('ERROR', 'CRITICAL', 'Unhandled promise rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });
  }

  private startPerformanceMonitoring() {
    // Monitor performance
    if ('performance' in window) {
      this.markPerformance('app-init');
      this.log('PERFORMANCE', 'INFO', 'Performance monitoring started', {
        memory: (performance as any).memory,
        timing: performance.timing
      });
    }
  }

  private logSystemInfo() {
    this.log('VERSION', 'INFO', 'App starting', {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      isTWA: this.detectTWA(),
      storage: {
        localStorage: typeof Storage !== 'undefined',
        sessionStorage: typeof Storage !== 'undefined',
        persistentStorage: 'storage' in navigator && 'persist' in navigator.storage
      }
    });
  }

  private detectTWA(): boolean {
    const userAgent = navigator.userAgent;
    const isTWA = userAgent.includes('wv') || 
                  document.referrer.includes('android-app://') ||
                  window.matchMedia('(display-mode: standalone)').matches;
    return isTWA;
  }

  private logAndroidSpecificInfo() {
    const userAgent = navigator.userAgent;
    const isAndroid = /Android/i.test(userAgent);
    
    this.log('ANDROID', 'INFO', 'Android device detection', {
      isAndroid,
      userAgent,
      isTWA: this.detectTWA(),
      webView: userAgent.includes('wv'),
      chrome: userAgent.includes('Chrome'),
      version: userAgent.match(/Android (\d+\.?\d*)/)?.[1],
      displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
      orientation: screen.orientation?.type,
      screenSize: { width: screen.width, height: screen.height },
      viewportSize: { width: window.innerWidth, height: window.innerHeight }
    });
  }

  markPerformance(name: string) {
    const timestamp = performance.now();
    this.performanceMarks.set(name, timestamp);
    this.log('PERFORMANCE', 'DEBUG', `Performance mark: ${name}`, { timestamp });
  }

  measurePerformance(name: string, startMark: string) {
    const startTime = this.performanceMarks.get(startMark);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.log('PERFORMANCE', 'INFO', `Performance measure: ${name}`, { 
        duration: `${duration.toFixed(2)}ms`,
        startMark,
        endTime: performance.now()
      });
      return duration;
    }
    return null;
  }

  log(category: LogEntry['category'], level: LogEntry['level'], message: string, data?: any) {
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

    // Console output with color coding
    const color = this.getConsoleColor(level);
    console.log(
      `%c[${category}] ${message}`,
      `color: ${color}; font-weight: bold;`,
      data || ''
    );

    // Persist logs
    this.persistLogs();
  }

  private getConsoleColor(level: LogEntry['level']): string {
    switch (level) {
      case 'ERROR': return '#ff4444';
      case 'WARN': return '#ffaa00';
      case 'INFO': return '#4444ff';
      case 'DEBUG': return '#888888';
      default: return '#000000';
    }
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
    this.log('VERSION', 'INFO', 'Debug logs cleared');
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
  logAuth(level: LogEntry['level'], message: string, data?: any) {
    this.log('AUTH', level, message, data);
  }

  logSession(level: LogEntry['level'], message: string, data?: any) {
    this.log('SESSION', level, message, data);
  }

  logStorage(level: LogEntry['level'], message: string, data?: any) {
    this.log('STORAGE', level, message, data);
  }

  logVersion(level: LogEntry['level'], message: string, data?: any) {
    this.log('VERSION', level, message, data);
  }

  logTWA(level: LogEntry['level'], message: string, data?: any) {
    this.log('TWA', level, message, data);
  }

  logAutofill(level: LogEntry['level'], message: string, data?: any) {
    this.log('AUTOFILL', level, message, data);
  }

  logLifecycle(level: LogEntry['level'], message: string, data?: any) {
    this.log('LIFECYCLE', level, message, data);
  }

  logNetwork(level: LogEntry['level'], message: string, data?: any) {
    this.log('NETWORK', level, message, data);
  }

  logPerformance(level: LogEntry['level'], message: string, data?: any) {
    this.log('PERFORMANCE', level, message, data);
  }

  logError(level: LogEntry['level'], message: string, data?: any) {
    this.log('ERROR', level, message, data);
  }

  logAndroid(level: LogEntry['level'], message: string, data?: any) {
    this.log('ANDROID', level, message, data);
  }

  logCache(level: LogEntry['level'], message: string, data?: any) {
    this.log('CACHE', level, message, data);
  }

  logRouting(level: LogEntry['level'], message: string, data?: any) {
    this.log('ROUTING', level, message, data);
  }

  // Emergency mode utilities
  enableEmergencyMode() {
    localStorage.setItem('emergency-debug', 'true');
    this.isEmergencyMode = true;
    this.log('VERSION', 'CRITICAL', 'Emergency debug mode enabled');
  }

  disableEmergencyMode() {
    localStorage.removeItem('emergency-debug');
    this.isEmergencyMode = false;
    this.log('VERSION', 'INFO', 'Emergency debug mode disabled');
  }

  isEmergencyModeActive(): boolean {
    return this.isEmergencyMode;
  }

  // Network monitoring
  setupNetworkMonitoring() {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      
      this.logNetwork('INFO', 'Network request started', { url, args });
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        
        this.logNetwork('INFO', 'Network request completed', {
          url,
          status: response.status,
          statusText: response.statusText,
          duration: `${duration.toFixed(2)}ms`,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - start;
        this.logNetwork('ERROR', 'Network request failed', {
          url,
          error: error.message,
          duration: `${duration.toFixed(2)}ms`
        });
        throw error;
      }
    };
  }

  // Storage monitoring
  setupStorageMonitoring() {
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    const originalRemoveItem = localStorage.removeItem;

    localStorage.setItem = (key: string, value: string) => {
      this.logStorage('DEBUG', 'localStorage.setItem', { key, valueLength: value.length });
      return originalSetItem.call(localStorage, key, value);
    };

    localStorage.getItem = (key: string) => {
      const result = originalGetItem.call(localStorage, key);
      this.logStorage('DEBUG', 'localStorage.getItem', { key, found: !!result });
      return result;
    };

    localStorage.removeItem = (key: string) => {
      this.logStorage('DEBUG', 'localStorage.removeItem', { key });
      return originalRemoveItem.call(localStorage, key);
    };
  }
}

export const debugLogger = new DebugLogger();
export type { LogEntry };
