/**
 * Startup Error Detection Utilities
 * 
 * Implements comprehensive startup error detection with categorized error types,
 * severity classification, and escalation logic for VibeTales app loading issues.
 * 
 * Requirements: 2.1, 2.2
 */

export enum ErrorCategory {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH', 
  CACHE = 'CACHE',
  TWA = 'TWA',
  SERVICE_WORKER = 'SERVICE_WORKER',
  JAVASCRIPT = 'JAVASCRIPT',
  STORAGE = 'STORAGE',
  CAPACITOR = 'CAPACITOR',
  MANIFEST = 'MANIFEST',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',           // Non-critical, app can continue
  MEDIUM = 'MEDIUM',     // Degraded functionality
  HIGH = 'HIGH',         // Major functionality affected
  CRITICAL = 'CRITICAL'  // App cannot function
}

export interface StartupError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  timestamp: number;
  context: ErrorContext;
  frequency: number;
  firstOccurrence: number;
  lastOccurrence: number;
  escalated: boolean;
}

export interface ErrorContext {
  phase: StartupPhase;
  userAgent: string;
  url: string;
  referrer: string;
  isTWA: boolean;
  networkStatus: string;
  storageAvailable: boolean;
  serviceWorkerSupported: boolean;
  additionalData?: Record<string, any>;
}

export enum StartupPhase {
  INITIAL_LOAD = 'INITIAL_LOAD',
  SCRIPT_LOADING = 'SCRIPT_LOADING',
  REACT_MOUNT = 'REACT_MOUNT',
  AUTH_INIT = 'AUTH_INIT',
  SERVICE_WORKER_INIT = 'SERVICE_WORKER_INIT',
  APP_READY = 'APP_READY'
}

class StartupErrorDetector {
  private errors: Map<string, StartupError> = new Map();
  private currentPhase: StartupPhase = StartupPhase.INITIAL_LOAD;
  private escalationThresholds = {
    [ErrorSeverity.LOW]: 10,
    [ErrorSeverity.MEDIUM]: 5,
    [ErrorSeverity.HIGH]: 3,
    [ErrorSeverity.CRITICAL]: 1
  };
  private patternAnalysisWindow = 60000; // 1 minute
  private initialized = false;

  constructor() {
    this.setupErrorHandlers();
    this.initialized = true;
  }

  private setupErrorHandlers() {
    // Global JavaScript error handler
    window.addEventListener('error', (event) => {
      this.detectError({
        category: this.categorizeJavaScriptError(event.error),
        message: event.message,
        originalError: event.error,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.detectError({
        category: this.categorizePromiseRejection(event.reason),
        message: `Unhandled promise rejection: ${event.reason}`,
        originalError: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        context: {
          reason: event.reason
        }
      });
    });

    // Network error detection
    this.setupNetworkErrorDetection();
  }

  private setupNetworkErrorDetection() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.detectError({
            category: ErrorCategory.NETWORK,
            message: `Network request failed: ${response.status} ${response.statusText}`,
            context: {
              url: typeof args[0] === 'string' ? args[0] : (args[0] as Request).url,
              status: response.status,
              statusText: response.statusText
            }
          });
        }
        
        return response;
      } catch (error) {
        this.detectError({
          category: ErrorCategory.NETWORK,
          message: `Network request error: ${error.message}`,
          originalError: error as Error,
          context: {
            url: typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
          }
        });
        throw error;
      }
    };
  }

  setCurrentPhase(phase: StartupPhase) {
    this.currentPhase = phase;
  }

  detectError(errorData: {
    category?: ErrorCategory;
    message: string;
    originalError?: Error;
    context?: Record<string, any>;
  }): StartupError {
    const category = errorData.category || this.categorizeError(errorData.message, errorData.originalError);
    const severity = this.classifySeverity(category, errorData.message, this.currentPhase);
    const errorId = this.generateErrorId(category, errorData.message);
    
    const existingError = this.errors.get(errorId);
    const now = Date.now();
    
    if (existingError) {
      // Update existing error
      existingError.frequency++;
      existingError.lastOccurrence = now;
      
      // Check for escalation
      if (!existingError.escalated && this.shouldEscalate(existingError)) {
        existingError.escalated = true;
        this.escalateError(existingError);
      }
      
      return existingError;
    }
    
    // Create new error
    const startupError: StartupError = {
      id: errorId,
      category,
      severity,
      message: errorData.message,
      originalError: errorData.originalError,
      timestamp: now,
      context: this.buildErrorContext(errorData.context),
      frequency: 1,
      firstOccurrence: now,
      lastOccurrence: now,
      escalated: false
    };
    
    this.errors.set(errorId, startupError);
    
    // Immediate escalation for critical errors
    if (severity === ErrorSeverity.CRITICAL) {
      startupError.escalated = true;
      this.escalateError(startupError);
    }
    
    return startupError;
  }

  private categorizeError(message: string, error?: Error): ErrorCategory {
    const lowerMessage = message.toLowerCase();
    const stack = error?.stack?.toLowerCase() || '';
    
    // Network errors
    if (lowerMessage.includes('fetch') || lowerMessage.includes('network') || 
        lowerMessage.includes('timeout') || lowerMessage.includes('cors')) {
      return ErrorCategory.NETWORK;
    }
    
    // Authentication errors
    if (lowerMessage.includes('auth') || lowerMessage.includes('supabase') ||
        lowerMessage.includes('session') || lowerMessage.includes('token')) {
      return ErrorCategory.AUTH;
    }
    
    // Cache errors
    if (lowerMessage.includes('cache') || lowerMessage.includes('storage quota') ||
        lowerMessage.includes('indexeddb')) {
      return ErrorCategory.CACHE;
    }
    
    // TWA/Capacitor errors
    if (lowerMessage.includes('capacitor') || lowerMessage.includes('android') ||
        lowerMessage.includes('twa') || stack.includes('capacitor')) {
      return ErrorCategory.TWA;
    }
    
    // Service Worker errors
    if (lowerMessage.includes('service worker') || lowerMessage.includes('sw.js') ||
        lowerMessage.includes('workbox')) {
      return ErrorCategory.SERVICE_WORKER;
    }
    
    // Storage errors
    if (lowerMessage.includes('localstorage') || lowerMessage.includes('sessionstorage') ||
        lowerMessage.includes('quota exceeded')) {
      return ErrorCategory.STORAGE;
    }
    
    // Manifest errors
    if (lowerMessage.includes('manifest') || lowerMessage.includes('pwa')) {
      return ErrorCategory.MANIFEST;
    }
    
    return ErrorCategory.JAVASCRIPT;
  }

  private categorizeJavaScriptError(error: Error): ErrorCategory {
    if (!error) return ErrorCategory.JAVASCRIPT;
    
    const stack = error.stack?.toLowerCase() || '';
    const message = error.message?.toLowerCase() || '';
    
    if (stack.includes('capacitor') || message.includes('capacitor')) {
      return ErrorCategory.CAPACITOR;
    }
    
    if (stack.includes('supabase') || message.includes('auth')) {
      return ErrorCategory.AUTH;
    }
    
    return ErrorCategory.JAVASCRIPT;
  }

  private categorizePromiseRejection(reason: any): ErrorCategory {
    if (typeof reason === 'string') {
      return this.categorizeError(reason);
    }
    
    if (reason instanceof Error) {
      return this.categorizeJavaScriptError(reason);
    }
    
    return ErrorCategory.UNKNOWN;
  }

  private classifySeverity(category: ErrorCategory, message: string, phase: StartupPhase): ErrorSeverity {
    const lowerMessage = message.toLowerCase();
    
    // Critical errors that prevent app from functioning
    if (lowerMessage.includes('critical') || 
        lowerMessage.includes('cannot read properties of null') ||
        lowerMessage.includes('root element not found') ||
        (category === ErrorCategory.JAVASCRIPT && phase === StartupPhase.REACT_MOUNT)) {
      return ErrorSeverity.CRITICAL;
    }
    
    // High severity errors
    if (category === ErrorCategory.AUTH && phase === StartupPhase.AUTH_INIT ||
        category === ErrorCategory.TWA && phase === StartupPhase.INITIAL_LOAD ||
        lowerMessage.includes('failed to fetch') ||
        lowerMessage.includes('network error')) {
      return ErrorSeverity.HIGH;
    }
    
    // Medium severity errors
    if (category === ErrorCategory.SERVICE_WORKER ||
        category === ErrorCategory.CACHE ||
        category === ErrorCategory.STORAGE) {
      return ErrorSeverity.MEDIUM;
    }
    
    // Default to low severity
    return ErrorSeverity.LOW;
  }

  private generateErrorId(category: ErrorCategory, message: string): string {
    // Create a consistent ID based on category and normalized message
    const normalizedMessage = message.replace(/\d+/g, 'N').substring(0, 50);
    return `${category}_${btoa(normalizedMessage).substring(0, 10)}`;
  }

  private buildErrorContext(additionalContext?: Record<string, any>): ErrorContext {
    return {
      phase: this.currentPhase,
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      isTWA: this.detectTWAEnvironment(),
      networkStatus: this.getNetworkStatus(),
      storageAvailable: this.checkStorageAvailability(),
      serviceWorkerSupported: 'serviceWorker' in navigator,
      additionalData: additionalContext
    };
  }

  private detectTWAEnvironment(): boolean {
    return navigator.userAgent.includes('wv') || 
           document.referrer.includes('android-app://') ||
           window.matchMedia('(display-mode: standalone)').matches ||
           'android' in window;
  }

  private getNetworkStatus(): string {
    const connection = (navigator as any).connection;
    if (connection) {
      return `${connection.effectiveType || 'unknown'} (${connection.downlink || 'unknown'}Mbps)`;
    }
    return navigator.onLine ? 'online' : 'offline';
  }

  private checkStorageAvailability(): boolean {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  }

  private shouldEscalate(error: StartupError): boolean {
    const threshold = this.escalationThresholds[error.severity];
    return error.frequency >= threshold;
  }

  private escalateError(error: StartupError) {
    // Emit custom event for error escalation
    window.dispatchEvent(new CustomEvent('startup-error-escalated', {
      detail: error
    }));
    
    console.error(`🚨 ESCALATED ERROR [${error.category}:${error.severity}]:`, error.message, error);
  }

  // Pattern analysis methods
  analyzeErrorPatterns(): ErrorPattern[] {
    const patterns: ErrorPattern[] = [];
    const now = Date.now();
    const windowStart = now - this.patternAnalysisWindow;
    
    // Group errors by category within time window
    const categoryGroups = new Map<ErrorCategory, StartupError[]>();
    
    for (const error of this.errors.values()) {
      if (error.lastOccurrence >= windowStart) {
        if (!categoryGroups.has(error.category)) {
          categoryGroups.set(error.category, []);
        }
        categoryGroups.get(error.category)!.push(error);
      }
    }
    
    // Analyze patterns
    for (const [category, errors] of categoryGroups) {
      const totalFrequency = errors.reduce((sum, error) => sum + error.frequency, 0);
      const avgFrequency = totalFrequency / errors.length;
      
      if (avgFrequency > 2) { // Pattern threshold
        patterns.push({
          category,
          errorCount: errors.length,
          totalFrequency,
          avgFrequency,
          timeWindow: this.patternAnalysisWindow,
          severity: this.calculatePatternSeverity(errors)
        });
      }
    }
    
    return patterns;
  }

  private calculatePatternSeverity(errors: StartupError[]): ErrorSeverity {
    const severityScores = {
      [ErrorSeverity.LOW]: 1,
      [ErrorSeverity.MEDIUM]: 2,
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.CRITICAL]: 4
    };
    
    const avgScore = errors.reduce((sum, error) => sum + severityScores[error.severity], 0) / errors.length;
    
    if (avgScore >= 3.5) return ErrorSeverity.CRITICAL;
    if (avgScore >= 2.5) return ErrorSeverity.HIGH;
    if (avgScore >= 1.5) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  // Public API methods
  getErrors(): StartupError[] {
    return Array.from(this.errors.values());
  }

  getErrorsByCategory(category: ErrorCategory): StartupError[] {
    return this.getErrors().filter(error => error.category === category);
  }

  getErrorsBySeverity(severity: ErrorSeverity): StartupError[] {
    return this.getErrors().filter(error => error.severity === severity);
  }

  getCriticalErrors(): StartupError[] {
    return this.getErrorsBySeverity(ErrorSeverity.CRITICAL);
  }

  clearErrors() {
    this.errors.clear();
  }

  getErrorSummary(): ErrorSummary {
    const errors = this.getErrors();
    const summary: ErrorSummary = {
      total: errors.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      escalated: errors.filter(e => e.escalated).length,
      patterns: this.analyzeErrorPatterns()
    };
    
    // Count by category
    for (const category of Object.values(ErrorCategory)) {
      summary.byCategory[category] = errors.filter(e => e.category === category).length;
    }
    
    // Count by severity
    for (const severity of Object.values(ErrorSeverity)) {
      summary.bySeverity[severity] = errors.filter(e => e.severity === severity).length;
    }
    
    return summary;
  }
}

export interface ErrorPattern {
  category: ErrorCategory;
  errorCount: number;
  totalFrequency: number;
  avgFrequency: number;
  timeWindow: number;
  severity: ErrorSeverity;
}

export interface ErrorSummary {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  escalated: number;
  patterns: ErrorPattern[];
}

// Singleton instance
export const startupErrorDetector = new StartupErrorDetector();