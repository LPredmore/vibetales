/**
 * Comprehensive Diagnostic Data Collector
 * 
 * Implements TWA environment detection with multiple validation methods,
 * system information gathering, and diagnostic report generation.
 * 
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

import { startupErrorDetector, ErrorSummary } from './startupErrorDetection';
import { healthMonitor, ComponentStatus } from './healthMonitoring';

export interface TWAEnvironmentInfo {
  isTWA: boolean;
  detectionMethods: TWADetectionResult[];
  playStoreOrigin: boolean;
  androidWebViewCapabilities: WebViewCapabilities;
  capacitorBridgeStatus: CapacitorBridgeStatus;
}

export interface TWADetectionResult {
  method: string;
  detected: boolean;
  confidence: number;
  details: Record<string, any>;
}

export interface WebViewCapabilities {
  version: string | null;
  features: string[];
  limitations: string[];
  performance: WebViewPerformance;
}

export interface WebViewPerformance {
  jsExecutionTime: number;
  domRenderTime: number;
  memoryUsage: number | null;
}

export interface CapacitorBridgeStatus {
  available: boolean;
  version: string | null;
  plugins: string[];
  nativePlatform: boolean;
  bridgeHealth: 'healthy' | 'degraded' | 'failed';
}

export interface SystemInformation {
  userAgent: string;
  referrer: string;
  displayMode: string;
  viewport: ViewportInfo;
  screen: ScreenInfo;
  network: NetworkInfo;
  storage: StorageInfo;
  browser: BrowserInfo;
  device: DeviceInfo;
  performance: SystemPerformance;
}

export interface ViewportInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  orientation: string;
}

export interface ScreenInfo {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
}

export interface NetworkInfo {
  online: boolean;
  effectiveType: string;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
}

export interface StorageInfo {
  localStorage: StorageStatus;
  sessionStorage: StorageStatus;
  indexedDB: StorageStatus;
  quota: StorageQuota | null;
}

export interface StorageStatus {
  available: boolean;
  size: number;
  error: string | null;
}

export interface StorageQuota {
  usage: number;
  quota: number;
  usagePercentage: number;
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  features: BrowserFeatures;
}

export interface BrowserFeatures {
  serviceWorker: boolean;
  webAssembly: boolean;
  webGL: boolean;
  webRTC: boolean;
  geolocation: boolean;
  notifications: boolean;
  camera: boolean;
  microphone: boolean;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  os: string;
  architecture: string | null;
  memory: number | null;
  cores: number | null;
  touchSupport: boolean;
}

export interface SystemPerformance {
  timing: PerformanceTiming;
  memory: any | null;
  connection: ConnectionInfo | null;
}

export interface PerformanceTiming {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number | null;
  firstContentfulPaint: number | null;
}

export interface ConnectionInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
}

export interface DiagnosticReport {
  metadata: ReportMetadata;
  twaEnvironment: TWAEnvironmentInfo;
  systemInfo: SystemInformation;
  healthStatus: any;
  errorSummary: ErrorSummary;
  troubleshooting: TroubleshootingInfo;
  recommendations: string[];
}

export interface ReportMetadata {
  version: string;
  timestamp: string;
  reportId: string;
  userAgent: string;
  url: string;
  sessionDuration: number;
}

export interface TroubleshootingInfo {
  likelyIssues: string[];
  suggestedActions: string[];
  criticalFindings: string[];
  environmentWarnings: string[];
}

class DiagnosticDataCollector {
  private reportVersion = '1.0.0';
  private sessionStart = Date.now();

  constructor() {
    // Initialize any required setup
  }

  // TWA Environment Detection with Multiple Methods
  async detectTWAEnvironment(): Promise<TWAEnvironmentInfo> {
    const detectionMethods: TWADetectionResult[] = [];
    
    // Method 1: User Agent Analysis
    detectionMethods.push(this.detectTWAByUserAgent());
    
    // Method 2: Referrer Analysis
    detectionMethods.push(this.detectTWAByReferrer());
    
    // Method 3: Display Mode Analysis
    detectionMethods.push(this.detectTWAByDisplayMode());
    
    // Method 4: Android Interface Detection
    detectionMethods.push(this.detectTWAByAndroidInterface());
    
    // Method 5: Capacitor Detection
    detectionMethods.push(this.detectTWAByCapacitor());
    
    // Method 6: URL Pattern Analysis
    detectionMethods.push(this.detectTWAByURLPattern());
    
    // Calculate overall TWA detection
    const twaScore = detectionMethods.reduce((sum, method) => 
      sum + (method.detected ? method.confidence : 0), 0) / detectionMethods.length;
    
    const isTWA = twaScore > 0.5;
    
    return {
      isTWA,
      detectionMethods,
      playStoreOrigin: await this.validatePlayStoreOrigin(),
      androidWebViewCapabilities: await this.analyzeWebViewCapabilities(),
      capacitorBridgeStatus: await this.analyzeCapacitorBridge()
    };
  }

  private detectTWAByUserAgent(): TWADetectionResult {
    const userAgent = navigator.userAgent;
    const hasWebView = userAgent.includes('wv');
    const hasAndroidApp = userAgent.includes('Android') && userAgent.includes('Mobile');
    
    return {
      method: 'User Agent Analysis',
      detected: hasWebView,
      confidence: hasWebView ? 0.8 : 0.1,
      details: {
        userAgent,
        hasWebView,
        hasAndroidApp,
        patterns: {
          webView: userAgent.match(/wv/g),
          android: userAgent.match(/Android/g),
          chrome: userAgent.match(/Chrome\/[\d.]+/g)
        }
      }
    };
  }

  private detectTWAByReferrer(): TWADetectionResult {
    const referrer = document.referrer;
    const isAndroidApp = referrer.includes('android-app://');
    
    return {
      method: 'Referrer Analysis',
      detected: isAndroidApp,
      confidence: isAndroidApp ? 0.9 : 0.0,
      details: {
        referrer,
        isAndroidApp,
        packageName: isAndroidApp ? referrer.split('android-app://')[1]?.split('/')[0] : null
      }
    };
  }

  private detectTWAByDisplayMode(): TWADetectionResult {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
    
    return {
      method: 'Display Mode Analysis',
      detected: isStandalone || isFullscreen,
      confidence: isStandalone ? 0.7 : (isFullscreen ? 0.6 : 0.1),
      details: {
        standalone: isStandalone,
        fullscreen: isFullscreen,
        minimalUI: isMinimalUI,
        browser: !isStandalone && !isFullscreen && !isMinimalUI
      }
    };
  }

  private detectTWAByAndroidInterface(): TWADetectionResult {
    const hasAndroid = 'android' in window;
    const hasTWA = 'TWA' in window;
    
    return {
      method: 'Android Interface Detection',
      detected: hasAndroid || hasTWA,
      confidence: hasTWA ? 0.95 : (hasAndroid ? 0.8 : 0.0),
      details: {
        hasAndroid,
        hasTWA,
        androidMethods: hasAndroid ? Object.keys((window as any).android || {}) : [],
        twaMethods: hasTWA ? Object.keys((window as any).TWA || {}) : []
      }
    };
  }

  private detectTWAByCapacitor(): TWADetectionResult {
    const hasCapacitor = 'Capacitor' in window;
    const isNative = hasCapacitor && (window as any).Capacitor?.isNativePlatform?.();
    
    return {
      method: 'Capacitor Detection',
      detected: hasCapacitor && isNative,
      confidence: hasCapacitor && isNative ? 0.85 : 0.0,
      details: {
        hasCapacitor,
        isNative,
        platform: hasCapacitor ? (window as any).Capacitor?.getPlatform?.() : null,
        plugins: hasCapacitor ? (window as any).Capacitor?.Plugins ? Object.keys((window as any).Capacitor.Plugins) : [] : []
      }
    };
  }

  private detectTWAByURLPattern(): TWADetectionResult {
    const url = window.location.href;
    const hasAppScheme = url.startsWith('app://') || url.startsWith('android-app://');
    const hasLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
    
    return {
      method: 'URL Pattern Analysis',
      detected: hasAppScheme,
      confidence: hasAppScheme ? 0.9 : 0.0,
      details: {
        url,
        hasAppScheme,
        hasLocalhost,
        protocol: window.location.protocol,
        host: window.location.host
      }
    };
  }

  private async validatePlayStoreOrigin(): Promise<boolean> {
    try {
      // Check for Play Store specific indicators
      const referrer = document.referrer;
      const userAgent = navigator.userAgent;
      
      // Play Store referrer patterns
      const playStoreReferrer = referrer.includes('play.google.com') || 
                               referrer.includes('android-app://com.android.vending');
      
      // Check for Play Store installation markers
      const hasPlayStoreMarkers = localStorage.getItem('play-store-install') === 'true' ||
                                 sessionStorage.getItem('play-store-install') === 'true';
      
      return playStoreReferrer || hasPlayStoreMarkers;
    } catch (error) {
      console.warn('Failed to validate Play Store origin:', error);
      return false;
    }
  }

  private async analyzeWebViewCapabilities(): Promise<WebViewCapabilities> {
    const startTime = performance.now();
    
    // Test JavaScript execution performance
    const jsStart = performance.now();
    for (let i = 0; i < 10000; i++) {
      Math.random();
    }
    const jsExecutionTime = performance.now() - jsStart;
    
    // Test DOM rendering performance
    const domStart = performance.now();
    const testDiv = document.createElement('div');
    testDiv.innerHTML = '<span>Test</span>'.repeat(100);
    document.body.appendChild(testDiv);
    document.body.removeChild(testDiv);
    const domRenderTime = performance.now() - domStart;
    
    // Extract WebView version from user agent
    const userAgent = navigator.userAgent;
    const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
    const webViewVersion = chromeMatch ? chromeMatch[1] : null;
    
    // Detect available features
    const features: string[] = [];
    const limitations: string[] = [];
    
    if ('serviceWorker' in navigator) features.push('Service Worker');
    if ('WebAssembly' in window) features.push('WebAssembly');
    if ('geolocation' in navigator) features.push('Geolocation');
    if ('Notification' in window) features.push('Notifications');
    if ('mediaDevices' in navigator) features.push('Media Devices');
    
    // Check for common limitations
    if (!('localStorage' in window)) limitations.push('No localStorage');
    if (!('sessionStorage' in window)) limitations.push('No sessionStorage');
    if (!('indexedDB' in window)) limitations.push('No IndexedDB');
    
    return {
      version: webViewVersion,
      features,
      limitations,
      performance: {
        jsExecutionTime,
        domRenderTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || null
      }
    };
  }

  private async analyzeCapacitorBridge(): Promise<CapacitorBridgeStatus> {
    try {
      const hasCapacitor = 'Capacitor' in window;
      
      if (!hasCapacitor) {
        return {
          available: false,
          version: null,
          plugins: [],
          nativePlatform: false,
          bridgeHealth: 'failed'
        };
      }
      
      const capacitor = (window as any).Capacitor;
      const version = capacitor.version || null;
      const plugins = capacitor.Plugins ? Object.keys(capacitor.Plugins) : [];
      const nativePlatform = capacitor.isNativePlatform?.() || false;
      
      // Test bridge health with a simple call
      let bridgeHealth: 'healthy' | 'degraded' | 'failed' = 'healthy';
      try {
        const platform = capacitor.getPlatform?.();
        if (!platform) bridgeHealth = 'degraded';
      } catch (error) {
        bridgeHealth = 'failed';
      }
      
      return {
        available: true,
        version,
        plugins,
        nativePlatform,
        bridgeHealth
      };
    } catch (error) {
      return {
        available: false,
        version: null,
        plugins: [],
        nativePlatform: false,
        bridgeHealth: 'failed'
      };
    }
  }

  // System Information Gathering
  gatherSystemInformation(): SystemInformation {
    return {
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      displayMode: this.getDisplayMode(),
      viewport: this.getViewportInfo(),
      screen: this.getScreenInfo(),
      network: this.getNetworkInfo(),
      storage: this.getStorageInfo(),
      browser: this.getBrowserInfo(),
      device: this.getDeviceInfo(),
      performance: this.getSystemPerformance()
    };
  }

  private getDisplayMode(): string {
    if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
    if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
    return 'browser';
  }

  private getViewportInfo(): ViewportInfo {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      orientation: screen.orientation?.type || 'unknown'
    };
  }

  private getScreenInfo(): ScreenInfo {
    return {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth
    };
  }

  private getNetworkInfo(): NetworkInfo {
    const connection = (navigator as any).connection;
    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
      saveData: connection?.saveData || false
    };
  }

  private getStorageInfo(): StorageInfo {
    return {
      localStorage: this.getStorageStatus('localStorage'),
      sessionStorage: this.getStorageStatus('sessionStorage'),
      indexedDB: this.getIndexedDBStatus(),
      quota: null // Will be populated asynchronously
    };
  }

  private getStorageStatus(type: 'localStorage' | 'sessionStorage'): StorageStatus {
    try {
      const storage = window[type];
      let size = 0;
      
      for (const key in storage) {
        if (storage.hasOwnProperty(key)) {
          size += storage[key].length + key.length;
        }
      }
      
      return {
        available: true,
        size,
        error: null
      };
    } catch (error) {
      return {
        available: false,
        size: 0,
        error: (error as Error).message
      };
    }
  }

  private getIndexedDBStatus(): StorageStatus {
    try {
      const available = 'indexedDB' in window;
      return {
        available,
        size: 0, // Would need async operation to calculate
        error: available ? null : 'IndexedDB not supported'
      };
    } catch (error) {
      return {
        available: false,
        size: 0,
        error: (error as Error).message
      };
    }
  }

  private getBrowserInfo(): BrowserInfo {
    const userAgent = navigator.userAgent;
    
    // Simple browser detection
    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';
    
    if (userAgent.includes('Chrome')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/([\d.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/([\d.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Gecko';
    } else if (userAgent.includes('Safari')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/([\d.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'WebKit';
    }
    
    return {
      name,
      version,
      engine,
      features: this.getBrowserFeatures()
    };
  }

  private getBrowserFeatures(): BrowserFeatures {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      webAssembly: 'WebAssembly' in window,
      webGL: this.hasWebGL(),
      webRTC: 'RTCPeerConnection' in window,
      geolocation: 'geolocation' in navigator,
      notifications: 'Notification' in window,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
    };
  }

  private hasWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  private getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    
    // Device type detection
    let type: 'mobile' | 'tablet' | 'desktop' | 'unknown' = 'unknown';
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      type = /iPad|Android(?!.*Mobile)/i.test(userAgent) ? 'tablet' : 'mobile';
    } else {
      type = 'desktop';
    }
    
    // OS detection
    let os = 'Unknown';
    if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    else if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    
    return {
      type,
      os,
      architecture: (navigator as any).platform || null,
      memory: (navigator as any).deviceMemory || null,
      cores: navigator.hardwareConcurrency || null,
      touchSupport: 'ontouchstart' in window
    };
  }

  private getSystemPerformance(): SystemPerformance {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');
    
    return {
      timing: {
        navigationStart: navigation?.fetchStart || 0,
        domContentLoaded: navigation?.domContentLoadedEventEnd || 0,
        loadComplete: navigation?.loadEventEnd || 0,
        firstPaint: paintEntries.find(e => e.name === 'first-paint')?.startTime || null,
        firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || null
      },
      memory: (performance as any).memory || null,
      connection: this.getConnectionInfo()
    };
  }

  private getConnectionInfo(): ConnectionInfo | null {
    const connection = (navigator as any).connection;
    if (!connection) return null;
    
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    };
  }

  // Diagnostic Report Generation
  async generateDiagnosticReport(): Promise<DiagnosticReport> {
    const reportId = this.generateReportId();
    
    const [twaEnvironment, systemInfo, healthStatus, errorSummary] = await Promise.all([
      this.detectTWAEnvironment(),
      Promise.resolve(this.gatherSystemInformation()),
      Promise.resolve(healthMonitor.exportHealthData()),
      Promise.resolve(startupErrorDetector.getErrorSummary())
    ]);
    
    const troubleshooting = this.analyzeTroubleshooting(twaEnvironment, systemInfo, healthStatus, errorSummary);
    const recommendations = this.generateRecommendations(troubleshooting);
    
    return {
      metadata: {
        version: this.reportVersion,
        timestamp: new Date().toISOString(),
        reportId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionDuration: Date.now() - this.sessionStart
      },
      twaEnvironment,
      systemInfo,
      healthStatus,
      errorSummary,
      troubleshooting,
      recommendations
    };
  }

  private generateReportId(): string {
    return `diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private analyzeTroubleshooting(
    twaEnv: TWAEnvironmentInfo,
    systemInfo: SystemInformation,
    healthStatus: any,
    errorSummary: ErrorSummary
  ): TroubleshootingInfo {
    const likelyIssues: string[] = [];
    const suggestedActions: string[] = [];
    const criticalFindings: string[] = [];
    const environmentWarnings: string[] = [];
    
    // Analyze TWA environment issues
    if (twaEnv.isTWA && !twaEnv.playStoreOrigin) {
      likelyIssues.push('TWA detected but not from Play Store origin');
      suggestedActions.push('Verify app was installed from Google Play Store');
    }
    
    if (twaEnv.capacitorBridgeStatus.bridgeHealth === 'failed') {
      criticalFindings.push('Capacitor bridge is not functioning');
      suggestedActions.push('Check Capacitor configuration and native bridge');
    }
    
    // Analyze system issues
    if (!systemInfo.network.online) {
      criticalFindings.push('Device is offline');
      suggestedActions.push('Check internet connection');
    }
    
    if (!systemInfo.storage.localStorage.available) {
      criticalFindings.push('Local storage is not available');
      suggestedActions.push('Clear browser data or check storage permissions');
    }
    
    // Analyze health status
    if (healthStatus.overall === ComponentStatus.UNHEALTHY) {
      criticalFindings.push('Multiple app components are unhealthy');
      suggestedActions.push('Restart the app or clear cache');
    }
    
    // Analyze error patterns
    if (errorSummary.escalated > 0) {
      criticalFindings.push(`${errorSummary.escalated} errors have escalated`);
      suggestedActions.push('Review error logs and consider emergency recovery');
    }
    
    // Environment warnings
    if (systemInfo.device.type === 'desktop' && twaEnv.isTWA) {
      environmentWarnings.push('TWA detected on desktop environment (unusual)');
    }
    
    if (systemInfo.browser.name === 'Unknown') {
      environmentWarnings.push('Unknown browser detected');
    }
    
    return {
      likelyIssues,
      suggestedActions,
      criticalFindings,
      environmentWarnings
    };
  }

  private generateRecommendations(troubleshooting: TroubleshootingInfo): string[] {
    const recommendations: string[] = [];
    
    if (troubleshooting.criticalFindings.length > 0) {
      recommendations.push('Immediate action required: Critical issues detected');
      recommendations.push('Consider activating emergency recovery mode');
    }
    
    if (troubleshooting.likelyIssues.some(issue => issue.includes('Play Store'))) {
      recommendations.push('Reinstall app from Google Play Store');
    }
    
    if (troubleshooting.likelyIssues.some(issue => issue.includes('storage'))) {
      recommendations.push('Clear app cache and data');
    }
    
    if (troubleshooting.likelyIssues.some(issue => issue.includes('network'))) {
      recommendations.push('Check network connectivity and try again');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('No critical issues detected');
      recommendations.push('Monitor app performance and report any issues');
    }
    
    return recommendations;
  }

  // Export functionality
  exportDiagnosticReport(report: DiagnosticReport, format: 'json' | 'text' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    }
    
    // Text format for easier reading
    return this.formatReportAsText(report);
  }

  private formatReportAsText(report: DiagnosticReport): string {
    const lines: string[] = [];
    
    lines.push('=== VibeTales Diagnostic Report ===');
    lines.push(`Report ID: ${report.metadata.reportId}`);
    lines.push(`Generated: ${report.metadata.timestamp}`);
    lines.push(`Session Duration: ${Math.round(report.metadata.sessionDuration / 1000)}s`);
    lines.push('');
    
    lines.push('=== TWA Environment ===');
    lines.push(`Is TWA: ${report.twaEnvironment.isTWA}`);
    lines.push(`Play Store Origin: ${report.twaEnvironment.playStoreOrigin}`);
    lines.push(`Capacitor Bridge: ${report.twaEnvironment.capacitorBridgeStatus.bridgeHealth}`);
    lines.push('');
    
    lines.push('=== System Information ===');
    lines.push(`Device: ${report.systemInfo.device.type} (${report.systemInfo.device.os})`);
    lines.push(`Browser: ${report.systemInfo.browser.name} ${report.systemInfo.browser.version}`);
    lines.push(`Network: ${report.systemInfo.network.effectiveType} (${report.systemInfo.network.online ? 'online' : 'offline'})`);
    lines.push(`Display: ${report.systemInfo.viewport.width}x${report.systemInfo.viewport.height}`);
    lines.push('');
    
    lines.push('=== Health Status ===');
    lines.push(`Overall: ${report.healthStatus.overall}`);
    lines.push(`Components: ${report.healthStatus.summary?.healthy || 0} healthy, ${report.healthStatus.summary?.unhealthy || 0} unhealthy`);
    lines.push('');
    
    lines.push('=== Error Summary ===');
    lines.push(`Total Errors: ${report.errorSummary.total}`);
    lines.push(`Escalated: ${report.errorSummary.escalated}`);
    lines.push('');
    
    if (report.troubleshooting.criticalFindings.length > 0) {
      lines.push('=== Critical Findings ===');
      report.troubleshooting.criticalFindings.forEach(finding => {
        lines.push(`- ${finding}`);
      });
      lines.push('');
    }
    
    if (report.recommendations.length > 0) {
      lines.push('=== Recommendations ===');
      report.recommendations.forEach(rec => {
        lines.push(`- ${rec}`);
      });
    }
    
    return lines.join('\n');
  }
}

// Singleton instance
export const diagnosticCollector = new DiagnosticDataCollector();