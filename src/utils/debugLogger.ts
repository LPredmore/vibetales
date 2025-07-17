interface LogEntry {
  timestamp: string;
  category: 'AUTH' | 'SESSION' | 'STORAGE' | 'VERSION' | 'TWA' | 'AUTOFILL';
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  data?: any;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 500; // Keep last 500 logs
  private storageKey = 'storybridge-debug-logs';

  constructor() {
    this.loadPersistedLogs();
    this.logSystemInfo();
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
}

export const debugLogger = new DebugLogger();
export type { LogEntry };
