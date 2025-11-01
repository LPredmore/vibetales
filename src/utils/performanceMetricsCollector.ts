/**
 * Performance Metrics Collection System
 * 
 * Implements comprehensive performance data collection,
 * metrics analysis and trend identification, and performance
 * regression detection and alerting.
 * 
 * Requirements: 1.1, 4.1, 4.2, 4.3
 */

import { StartupPhase } from './startupErrorDetection';
import { debugLogger } from './debugLogger';

export interface PerformanceMetric {
  id: string;
  name: string;
  category: MetricCategory;
  value: number;
  unit: string;
  timestamp: number;
  context: MetricContext;
  tags: Record<string, string>;
}

export enum MetricCategory {
  STARTUP = 'STARTUP',
  RUNTIME = 'RUNTIME',
  NETWORK = 'NETWORK',
  MEMORY = 'MEMORY',
  USER_INTERACTION = 'USER_INTERACTION',
  ERROR = 'ERROR',
  BUSINESS = 'BUSINESS'
}

export interface MetricContext {
  phase?: StartupPhase;
  component?: string;
  operation?: string;
  userAgent?: string;
  networkType?: string;
  deviceType?: string;
  sessionId: string;
}

export interface MetricTrend {
  metricId: string;
  timeRange: { start: number; end: number };
  dataPoints: TrendDataPoint[];
  trend: TrendDirection;
  changeRate: number; // Percentage change per time unit
  confidence: number; // 0-1, confidence in trend analysis
  anomalies: TrendAnomaly[];
}

export interface TrendDataPoint {
  timestamp: number;
  value: number;
  smoothedValue?: number;
  metadata?: Record<string, any>;
}

export enum TrendDirection {
  IMPROVING = 'IMPROVING',
  DEGRADING = 'DEGRADING',
  STABLE = 'STABLE',
  VOLATILE = 'VOLATILE'
}

export interface TrendAnomaly {
  timestamp: number;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface PerformanceRegression {
  id: string;
  metricId: string;
  detectedAt: number;
  severity: RegressionSeverity;
  description: string;
  baselineValue: number;
  currentValue: number;
  degradation: number; // Percentage degradation
  affectedSessions: number;
  possibleCauses: string[];
  recommendations: string[];
}

export enum RegressionSeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL'
}

export interface MetricAnalysis {
  metricId: string;
  summary: MetricSummary;
  trends: MetricTrend[];
  regressions: PerformanceRegression[];
  insights: MetricInsight[];
  recommendations: MetricRecommendation[];
}

export interface MetricSummary {
  totalDataPoints: number;
  timeRange: { start: number; end: number };
  currentValue: number;
  averageValue: number;
  minValue: number;
  maxValue: number;
  percentiles: Record<string, number>; // P50, P75, P90, P95, P99
  standardDeviation: number;
  coefficient: number; // Coefficient of variation
}

export interface MetricInsight {
  type: 'pattern' | 'correlation' | 'seasonality' | 'threshold';
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  data: Record<string, any>;
}

export interface MetricRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImprovement: number;
  implementation: string;
  effort: 'low' | 'medium' | 'high';
}

export interface MetricCollectionConfig {
  enabledCategories: MetricCategory[];
  samplingRate: number; // 0-1, percentage of events to collect
  batchSize: number;
  flushInterval: number; // milliseconds
  retentionPeriod: number; // milliseconds
  compressionEnabled: boolean;
  anomalyDetectionEnabled: boolean;
  regressionDetectionEnabled: boolean;
}

class PerformanceMetricsCollector {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private config: MetricCollectionConfig;
  private sessionId: string;
  private collectionBuffer: PerformanceMetric[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private observers: Map<string, PerformanceObserver> = new Map();
  private customMetrics: Map<string, (context: MetricContext) => number> = new Map();
  private isCollecting = false;

  constructor(config?: Partial<MetricCollectionConfig>) {
    this.config = {
      enabledCategories: Object.values(MetricCategory),
      samplingRate: 1.0,
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      retentionPeriod: 86400000 * 7, // 7 days
      compressionEnabled: true,
      anomalyDetectionEnabled: true,
      regressionDetectionEnabled: true,
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    this.setupPerformanceObservers();
    this.setupCustomMetrics();
    this.loadStoredMetrics();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupPerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) {
      debugLogger.logError('WARN', 'PerformanceObserver not supported');
      return;
    }

    // Navigation timing
    this.setupNavigationObserver();
    
    // Resource timing
    this.setupResourceObserver();
    
    // Paint timing
    this.setupPaintObserver();
    
    // Layout shift
    this.setupLayoutShiftObserver();
    
    // Long tasks
    this.setupLongTaskObserver();
    
    // User timing
    this.setupUserTimingObserver();
  }

  private setupNavigationObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.collectNavigationMetrics(entry as PerformanceNavigationTiming);
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', observer);
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to setup navigation observer', error);
    }
  }

  private setupResourceObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.collectResourceMetrics(entry as PerformanceResourceTiming);
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to setup resource observer', error);
    }
  }

  private setupPaintObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.collectPaintMetrics(entry);
        }
      });
      
      observer.observe({ entryTypes: ['paint'] });
      this.observers.set('paint', observer);
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to setup paint observer', error);
    }
  }

  private setupLayoutShiftObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.collectLayoutShiftMetrics(entry as any);
        }
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout-shift', observer);
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to setup layout shift observer', error);
    }
  }

  private setupLongTaskObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.collectLongTaskMetrics(entry);
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to setup long task observer', error);
    }
  }

  private setupUserTimingObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.collectUserTimingMetrics(entry);
        }
      });
      
      observer.observe({ entryTypes: ['measure', 'mark'] });
      this.observers.set('user-timing', observer);
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to setup user timing observer', error);
    }
  }

  private setupCustomMetrics(): void {
    // Memory usage metric
    this.customMetrics.set('memory-usage', (context: MetricContext) => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      }
      return 0;
    });

    // DOM complexity metric
    this.customMetrics.set('dom-complexity', (context: MetricContext) => {
      return document.querySelectorAll('*').length;
    });

    // Network quality metric
    this.customMetrics.set('network-quality', (context: MetricContext) => {
      const connection = (navigator as any).connection;
      if (connection) {
        // Convert effective type to numeric score
        const typeScores = { 'slow-2g': 1, '2g': 2, '3g': 3, '4g': 4 };
        return typeScores[connection.effectiveType as keyof typeof typeScores] || 0;
      }
      return navigator.onLine ? 3 : 0;
    });

    // Error rate metric
    this.customMetrics.set('error-rate', (context: MetricContext) => {
      // This would be calculated based on error tracking
      return 0; // Placeholder
    });
  }

  // Metric Collection Methods
  startCollection(): void {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    this.startPeriodicCollection();
    
    debugLogger.logLifecycle('INFO', 'Performance metrics collection started', {
      sessionId: this.sessionId,
      config: this.config
    });
  }

  stopCollection(): void {
    if (!this.isCollecting) return;
    
    this.isCollecting = false;
    this.stopPeriodicCollection();
    this.flushMetrics();
    
    // Disconnect observers
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    
    debugLogger.logLifecycle('INFO', 'Performance metrics collection stopped');
  }

  private startPeriodicCollection(): void {
    this.flushTimer = setInterval(() => {
      this.collectCustomMetrics();
      this.flushMetrics();
      this.cleanupOldMetrics();
    }, this.config.flushInterval);
  }

  private stopPeriodicCollection(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  collectMetric(
    id: string,
    name: string,
    category: MetricCategory,
    value: number,
    unit: string,
    context?: Partial<MetricContext>,
    tags?: Record<string, string>
  ): void {
    if (!this.shouldCollectMetric(category)) return;

    const metric: PerformanceMetric = {
      id,
      name,
      category,
      value,
      unit,
      timestamp: Date.now(),
      context: {
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        networkType: this.getNetworkType(),
        deviceType: this.getDeviceType(),
        ...context
      },
      tags: tags || {}
    };

    this.addMetricToBuffer(metric);
  }

  private shouldCollectMetric(category: MetricCategory): boolean {
    return this.config.enabledCategories.includes(category) &&
           Math.random() < this.config.samplingRate;
  }

  private addMetricToBuffer(metric: PerformanceMetric): void {
    this.collectionBuffer.push(metric);
    
    if (this.collectionBuffer.length >= this.config.batchSize) {
      this.flushMetrics();
    }
  }

  private flushMetrics(): void {
    if (this.collectionBuffer.length === 0) return;
    
    const metricsToFlush = [...this.collectionBuffer];
    this.collectionBuffer = [];
    
    // Group metrics by ID
    for (const metric of metricsToFlush) {
      if (!this.metrics.has(metric.id)) {
        this.metrics.set(metric.id, []);
      }
      this.metrics.get(metric.id)!.push(metric);
    }
    
    // Persist to storage
    this.persistMetrics(metricsToFlush);
    
    debugLogger.logLifecycle('DEBUG', `Flushed ${metricsToFlush.length} metrics`);
  }

  // Specific metric collection methods
  private collectNavigationMetrics(navigation: PerformanceNavigationTiming): void {
    const baseContext = { component: 'navigation' };
    
    this.collectMetric(
      'navigation-dns-lookup',
      'DNS Lookup Time',
      MetricCategory.NETWORK,
      navigation.domainLookupEnd - navigation.domainLookupStart,
      'ms',
      baseContext
    );
    
    this.collectMetric(
      'navigation-tcp-connect',
      'TCP Connection Time',
      MetricCategory.NETWORK,
      navigation.connectEnd - navigation.connectStart,
      'ms',
      baseContext
    );
    
    this.collectMetric(
      'navigation-request-response',
      'Request Response Time',
      MetricCategory.NETWORK,
      navigation.responseEnd - navigation.requestStart,
      'ms',
      baseContext
    );
    
    this.collectMetric(
      'navigation-dom-loading',
      'DOM Loading Time',
      MetricCategory.STARTUP,
      navigation.domContentLoadedEventEnd - navigation.responseEnd,
      'ms',
      baseContext
    );
    
    this.collectMetric(
      'navigation-total-load',
      'Total Load Time',
      MetricCategory.STARTUP,
      navigation.loadEventEnd - navigation.fetchStart,
      'ms',
      baseContext
    );
  }

  private collectResourceMetrics(resource: PerformanceResourceTiming): void {
    const url = new URL(resource.name);
    const resourceType = this.getResourceType(url.pathname);
    
    const context = {
      component: 'resource-loading',
      operation: resourceType
    };
    
    const tags = {
      resourceType,
      domain: url.hostname,
      protocol: url.protocol
    };
    
    this.collectMetric(
      `resource-load-${resourceType}`,
      `${resourceType} Load Time`,
      MetricCategory.NETWORK,
      resource.responseEnd - resource.requestStart,
      'ms',
      context,
      tags
    );
    
    if (resource.transferSize) {
      this.collectMetric(
        `resource-size-${resourceType}`,
        `${resourceType} Transfer Size`,
        MetricCategory.NETWORK,
        resource.transferSize,
        'bytes',
        context,
        tags
      );
    }
  }

  private collectPaintMetrics(paint: PerformanceEntry): void {
    const context = { component: 'rendering' };
    
    this.collectMetric(
      `paint-${paint.name}`,
      paint.name,
      MetricCategory.STARTUP,
      paint.startTime,
      'ms',
      context
    );
  }

  private collectLayoutShiftMetrics(shift: any): void {
    if (!shift.hadRecentInput) {
      this.collectMetric(
        'layout-shift',
        'Cumulative Layout Shift',
        MetricCategory.USER_INTERACTION,
        shift.value,
        'score',
        { component: 'rendering' }
      );
    }
  }

  private collectLongTaskMetrics(task: PerformanceEntry): void {
    this.collectMetric(
      'long-task',
      'Long Task Duration',
      MetricCategory.RUNTIME,
      task.duration,
      'ms',
      { component: 'javascript' }
    );
  }

  private collectUserTimingMetrics(timing: PerformanceEntry): void {
    const category = timing.name.includes('startup') ? 
      MetricCategory.STARTUP : MetricCategory.RUNTIME;
    
    this.collectMetric(
      `user-timing-${timing.name}`,
      timing.name,
      category,
      timing.duration || timing.startTime,
      'ms',
      { component: 'user-timing' }
    );
  }

  private collectCustomMetrics(): void {
    const context: MetricContext = { 
      component: 'custom',
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      networkType: this.getNetworkType(),
      deviceType: this.getDeviceType()
    };
    
    for (const [metricId, collector] of this.customMetrics) {
      try {
        const value = collector(context);
        this.collectMetric(
          metricId,
          metricId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          MetricCategory.RUNTIME,
          value,
          this.getMetricUnit(metricId),
          context
        );
      } catch (error) {
        debugLogger.logError('WARN', `Failed to collect custom metric: ${metricId}`, error);
      }
    }
  }

  // Analysis Methods
  analyzeMetric(metricId: string, timeRange?: { start: number; end: number }): MetricAnalysis {
    const metricData = this.getMetricData(metricId, timeRange);
    
    if (metricData.length === 0) {
      throw new Error(`No data found for metric: ${metricId}`);
    }
    
    const summary = this.calculateMetricSummary(metricData);
    const trends = this.analyzeTrends(metricId, metricData);
    const regressions = this.detectRegressions(metricId, metricData);
    const insights = this.generateInsights(metricId, metricData, trends);
    const recommendations = this.generateRecommendations(metricId, summary, trends, regressions);
    
    return {
      metricId,
      summary,
      trends,
      regressions,
      insights,
      recommendations
    };
  }

  private getMetricData(metricId: string, timeRange?: { start: number; end: number }): PerformanceMetric[] {
    const allData = this.metrics.get(metricId) || [];
    
    if (!timeRange) {
      return allData;
    }
    
    return allData.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  private calculateMetricSummary(data: PerformanceMetric[]): MetricSummary {
    const values = data.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    
    // Calculate standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate percentiles
    const percentiles = {
      P50: this.calculatePercentile(values, 0.5),
      P75: this.calculatePercentile(values, 0.75),
      P90: this.calculatePercentile(values, 0.9),
      P95: this.calculatePercentile(values, 0.95),
      P99: this.calculatePercentile(values, 0.99)
    };
    
    return {
      totalDataPoints: data.length,
      timeRange: {
        start: Math.min(...data.map(m => m.timestamp)),
        end: Math.max(...data.map(m => m.timestamp))
      },
      currentValue: values[values.length - 1],
      averageValue: mean,
      minValue: values[0],
      maxValue: values[values.length - 1],
      percentiles,
      standardDeviation,
      coefficient: standardDeviation / mean
    };
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private analyzeTrends(metricId: string, data: PerformanceMetric[]): MetricTrend[] {
    if (data.length < 10) {
      return []; // Not enough data for trend analysis
    }
    
    // Group data into time windows for trend analysis
    const timeWindows = this.groupDataIntoTimeWindows(data, 3600000); // 1 hour windows
    const trends: MetricTrend[] = [];
    
    for (const window of timeWindows) {
      const trend = this.calculateTrendForWindow(metricId, window);
      if (trend) {
        trends.push(trend);
      }
    }
    
    return trends;
  }

  private groupDataIntoTimeWindows(data: PerformanceMetric[], windowSize: number): PerformanceMetric[][] {
    const windows: PerformanceMetric[][] = [];
    const sortedData = data.sort((a, b) => a.timestamp - b.timestamp);
    
    let currentWindow: PerformanceMetric[] = [];
    let windowStart = sortedData[0].timestamp;
    
    for (const metric of sortedData) {
      if (metric.timestamp - windowStart > windowSize) {
        if (currentWindow.length > 0) {
          windows.push(currentWindow);
        }
        currentWindow = [metric];
        windowStart = metric.timestamp;
      } else {
        currentWindow.push(metric);
      }
    }
    
    if (currentWindow.length > 0) {
      windows.push(currentWindow);
    }
    
    return windows;
  }

  private calculateTrendForWindow(metricId: string, windowData: PerformanceMetric[]): MetricTrend | null {
    if (windowData.length < 5) return null;
    
    const dataPoints: TrendDataPoint[] = windowData.map(metric => ({
      timestamp: metric.timestamp,
      value: metric.value
    }));
    
    // Apply smoothing
    const smoothedPoints = this.applySmoothingFilter(dataPoints);
    
    // Calculate trend direction and rate
    const { direction, changeRate, confidence } = this.calculateTrendDirection(smoothedPoints);
    
    // Detect anomalies
    const anomalies = this.detectAnomalies(dataPoints, smoothedPoints);
    
    return {
      metricId,
      timeRange: {
        start: windowData[0].timestamp,
        end: windowData[windowData.length - 1].timestamp
      },
      dataPoints: smoothedPoints,
      trend: direction,
      changeRate,
      confidence,
      anomalies
    };
  }

  private applySmoothingFilter(dataPoints: TrendDataPoint[]): TrendDataPoint[] {
    // Simple moving average smoothing
    const windowSize = Math.min(5, Math.floor(dataPoints.length / 3));
    const smoothed: TrendDataPoint[] = [];
    
    for (let i = 0; i < dataPoints.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(dataPoints.length, i + Math.floor(windowSize / 2) + 1);
      const window = dataPoints.slice(start, end);
      
      const smoothedValue = window.reduce((sum, point) => sum + point.value, 0) / window.length;
      
      smoothed.push({
        ...dataPoints[i],
        smoothedValue
      });
    }
    
    return smoothed;
  }

  private calculateTrendDirection(dataPoints: TrendDataPoint[]): {
    direction: TrendDirection;
    changeRate: number;
    confidence: number;
  } {
    if (dataPoints.length < 2) {
      return { direction: TrendDirection.STABLE, changeRate: 0, confidence: 0 };
    }
    
    // Linear regression to determine trend
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, point, index) => sum + index, 0);
    const sumY = dataPoints.reduce((sum, point) => sum + (point.smoothedValue || point.value), 0);
    const sumXY = dataPoints.reduce((sum, point, index) => sum + index * (point.smoothedValue || point.value), 0);
    const sumXX = dataPoints.reduce((sum, point, index) => sum + index * index, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared for confidence
    const meanY = sumY / n;
    const ssRes = dataPoints.reduce((sum, point, index) => {
      const predicted = slope * index + intercept;
      const actual = point.smoothedValue || point.value;
      return sum + Math.pow(actual - predicted, 2);
    }, 0);
    const ssTot = dataPoints.reduce((sum, point) => {
      const actual = point.smoothedValue || point.value;
      return sum + Math.pow(actual - meanY, 2);
    }, 0);
    
    const rSquared = 1 - (ssRes / ssTot);
    const confidence = Math.max(0, Math.min(1, rSquared));
    
    // Determine trend direction
    const changeRate = (slope / meanY) * 100; // Percentage change per time unit
    
    let direction: TrendDirection;
    if (Math.abs(changeRate) < 1) {
      direction = TrendDirection.STABLE;
    } else if (changeRate > 0) {
      direction = TrendDirection.IMPROVING;
    } else {
      direction = TrendDirection.DEGRADING;
    }
    
    // Check for volatility
    const volatility = dataPoints.reduce((sum, point, index) => {
      if (index === 0) return 0;
      const change = Math.abs(point.value - dataPoints[index - 1].value);
      return sum + change;
    }, 0) / (dataPoints.length - 1);
    
    if (volatility > meanY * 0.2) { // High volatility threshold
      direction = TrendDirection.VOLATILE;
    }
    
    return { direction, changeRate, confidence };
  }

  private detectAnomalies(original: TrendDataPoint[], smoothed: TrendDataPoint[]): TrendAnomaly[] {
    const anomalies: TrendAnomaly[] = [];
    
    for (let i = 0; i < original.length; i++) {
      const actual = original[i].value;
      const expected = smoothed[i].smoothedValue || smoothed[i].value;
      const deviation = Math.abs(actual - expected);
      const relativeDeviation = deviation / expected;
      
      if (relativeDeviation > 0.5) { // 50% deviation threshold
        let severity: TrendAnomaly['severity'];
        if (relativeDeviation > 2) severity = 'critical';
        else if (relativeDeviation > 1) severity = 'high';
        else if (relativeDeviation > 0.75) severity = 'medium';
        else severity = 'low';
        
        anomalies.push({
          timestamp: original[i].timestamp,
          value: actual,
          expectedValue: expected,
          deviation: relativeDeviation * 100,
          severity,
          description: `Value ${actual.toFixed(2)} deviates ${(relativeDeviation * 100).toFixed(1)}% from expected ${expected.toFixed(2)}`
        });
      }
    }
    
    return anomalies;
  }

  private detectRegressions(metricId: string, data: PerformanceMetric[]): PerformanceRegression[] {
    if (!this.config.regressionDetectionEnabled || data.length < 20) {
      return [];
    }
    
    const regressions: PerformanceRegression[] = [];
    
    // Split data into baseline and current periods
    const splitPoint = Math.floor(data.length * 0.7); // 70% baseline, 30% current
    const baseline = data.slice(0, splitPoint);
    const current = data.slice(splitPoint);
    
    const baselineAvg = baseline.reduce((sum, m) => sum + m.value, 0) / baseline.length;
    const currentAvg = current.reduce((sum, m) => sum + m.value, 0) / current.length;
    
    // Determine if this is a performance metric (lower is better) or business metric (higher is better)
    const isPerformanceMetric = this.isPerformanceMetric(metricId);
    const degradation = isPerformanceMetric ? 
      ((currentAvg - baselineAvg) / baselineAvg) * 100 :
      ((baselineAvg - currentAvg) / baselineAvg) * 100;
    
    if (degradation > 10) { // 10% degradation threshold
      let severity: RegressionSeverity;
      if (degradation > 50) severity = RegressionSeverity.CRITICAL;
      else if (degradation > 30) severity = RegressionSeverity.MAJOR;
      else if (degradation > 20) severity = RegressionSeverity.MODERATE;
      else severity = RegressionSeverity.MINOR;
      
      regressions.push({
        id: `regression-${metricId}-${Date.now()}`,
        metricId,
        detectedAt: Date.now(),
        severity,
        description: `${metricId} has degraded by ${degradation.toFixed(1)}%`,
        baselineValue: baselineAvg,
        currentValue: currentAvg,
        degradation,
        affectedSessions: current.length,
        possibleCauses: this.identifyPossibleCauses(metricId, degradation),
        recommendations: this.generateRegressionRecommendations(metricId, severity, degradation)
      });
    }
    
    return regressions;
  }

  private isPerformanceMetric(metricId: string): boolean {
    const performanceMetrics = [
      'navigation-', 'resource-load-', 'paint-', 'long-task', 'memory-usage'
    ];
    return performanceMetrics.some(prefix => metricId.startsWith(prefix));
  }

  private identifyPossibleCauses(metricId: string, degradation: number): string[] {
    const causes: string[] = [];
    
    if (metricId.includes('navigation') || metricId.includes('resource')) {
      causes.push('Network connectivity issues');
      causes.push('Server performance degradation');
      causes.push('CDN issues');
    }
    
    if (metricId.includes('memory')) {
      causes.push('Memory leaks');
      causes.push('Increased data processing');
      causes.push('Inefficient algorithms');
    }
    
    if (metricId.includes('paint') || metricId.includes('layout')) {
      causes.push('DOM complexity increase');
      causes.push('CSS performance issues');
      causes.push('JavaScript blocking rendering');
    }
    
    if (degradation > 30) {
      causes.push('Recent code deployment');
      causes.push('Configuration changes');
      causes.push('Third-party service issues');
    }
    
    return causes;
  }

  private generateRegressionRecommendations(
    metricId: string, 
    severity: RegressionSeverity, 
    degradation: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (severity === RegressionSeverity.CRITICAL) {
      recommendations.push('Immediate investigation required');
      recommendations.push('Consider rollback if recent deployment');
    }
    
    if (metricId.includes('memory')) {
      recommendations.push('Profile memory usage');
      recommendations.push('Check for memory leaks');
      recommendations.push('Optimize data structures');
    }
    
    if (metricId.includes('network') || metricId.includes('resource')) {
      recommendations.push('Check network conditions');
      recommendations.push('Optimize resource loading');
      recommendations.push('Implement better caching');
    }
    
    recommendations.push('Monitor trend closely');
    recommendations.push('Set up alerts for further degradation');
    
    return recommendations;
  }

  private generateInsights(
    metricId: string, 
    data: PerformanceMetric[], 
    trends: MetricTrend[]
  ): MetricInsight[] {
    const insights: MetricInsight[] = [];
    
    // Pattern insights
    const patterns = this.detectPatterns(data);
    insights.push(...patterns);
    
    // Correlation insights
    const correlations = this.detectCorrelations(metricId, data);
    insights.push(...correlations);
    
    // Seasonality insights
    const seasonality = this.detectSeasonality(data);
    if (seasonality) {
      insights.push(seasonality);
    }
    
    return insights;
  }

  private detectPatterns(data: PerformanceMetric[]): MetricInsight[] {
    const insights: MetricInsight[] = [];
    
    // Check for periodic spikes
    const spikes = this.detectPeriodicSpikes(data);
    if (spikes.confidence > 0.7) {
      insights.push({
        type: 'pattern',
        description: `Periodic spikes detected every ${spikes.period} minutes`,
        confidence: spikes.confidence,
        impact: spikes.impact,
        data: spikes
      });
    }
    
    return insights;
  }

  private detectPeriodicSpikes(data: PerformanceMetric[]): any {
    // Simplified spike detection
    const values = data.map(m => m.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const threshold = mean * 1.5;
    
    const spikes = data.filter(m => m.value > threshold);
    const spikeRate = spikes.length / data.length;
    
    return {
      period: 60, // Placeholder
      confidence: spikeRate > 0.1 ? 0.8 : 0.3,
      impact: spikeRate > 0.2 ? 'high' : 'medium',
      spikes: spikes.length
    };
  }

  private detectCorrelations(metricId: string, data: PerformanceMetric[]): MetricInsight[] {
    // This would analyze correlations with other metrics
    // Simplified implementation
    return [];
  }

  private detectSeasonality(data: PerformanceMetric[]): MetricInsight | null {
    // Simplified seasonality detection
    if (data.length < 100) return null;
    
    // Check for daily patterns
    const hourlyAverages = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);
    
    for (const metric of data) {
      const hour = new Date(metric.timestamp).getHours();
      hourlyAverages[hour] += metric.value;
      hourlyCounts[hour]++;
    }
    
    for (let i = 0; i < 24; i++) {
      if (hourlyCounts[i] > 0) {
        hourlyAverages[i] /= hourlyCounts[i];
      }
    }
    
    const maxHourlyAvg = Math.max(...hourlyAverages);
    const minHourlyAvg = Math.min(...hourlyAverages.filter(avg => avg > 0));
    const variation = (maxHourlyAvg - minHourlyAvg) / minHourlyAvg;
    
    if (variation > 0.3) { // 30% variation threshold
      return {
        type: 'seasonality',
        description: `Daily pattern detected with ${(variation * 100).toFixed(1)}% variation`,
        confidence: Math.min(0.9, variation),
        impact: variation > 0.5 ? 'high' : 'medium',
        data: { hourlyAverages, variation }
      };
    }
    
    return null;
  }

  private generateRecommendations(
    metricId: string,
    summary: MetricSummary,
    trends: MetricTrend[],
    regressions: PerformanceRegression[]
  ): MetricRecommendation[] {
    const recommendations: MetricRecommendation[] = [];
    
    // High variability recommendation
    if (summary.coefficient > 0.5) {
      recommendations.push({
        priority: 'medium',
        title: 'Reduce Metric Variability',
        description: `${metricId} shows high variability (CV: ${summary.coefficient.toFixed(2)})`,
        expectedImprovement: 20,
        implementation: 'Investigate and stabilize the underlying processes',
        effort: 'medium'
      });
    }
    
    // Regression recommendations
    for (const regression of regressions) {
      recommendations.push({
        priority: regression.severity === RegressionSeverity.CRITICAL ? 'critical' : 'high',
        title: 'Address Performance Regression',
        description: regression.description,
        expectedImprovement: regression.degradation,
        implementation: regression.recommendations.join('; '),
        effort: 'high'
      });
    }
    
    // Trend-based recommendations
    for (const trend of trends) {
      if (trend.trend === TrendDirection.DEGRADING && trend.confidence > 0.7) {
        recommendations.push({
          priority: 'medium',
          title: 'Address Degrading Trend',
          description: `${metricId} is degrading at ${trend.changeRate.toFixed(1)}% per time unit`,
          expectedImprovement: Math.abs(trend.changeRate),
          implementation: 'Investigate root cause and implement corrective measures',
          effort: 'medium'
        });
      }
    }
    
    return recommendations;
  }

  // Helper methods
  private getResourceType(pathname: string): string {
    const extension = pathname.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js': return 'script';
      case 'css': return 'stylesheet';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg': return 'image';
      case 'woff':
      case 'woff2':
      case 'ttf': return 'font';
      default: return 'other';
    }
  }

  private getNetworkType(): string {
    const connection = (navigator as any).connection;
    return connection?.effectiveType || 'unknown';
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      return /iPad|Android(?!.*Mobile)/i.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }

  private getMetricUnit(metricId: string): string {
    if (metricId.includes('time') || metricId.includes('duration')) return 'ms';
    if (metricId.includes('size') || metricId.includes('memory')) return 'bytes';
    if (metricId.includes('rate') || metricId.includes('percentage')) return '%';
    if (metricId.includes('count') || metricId.includes('complexity')) return 'count';
    return 'value';
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    
    for (const [metricId, metrics] of this.metrics) {
      const filteredMetrics = metrics.filter(metric => metric.timestamp > cutoff);
      
      if (filteredMetrics.length !== metrics.length) {
        this.metrics.set(metricId, filteredMetrics);
        debugLogger.logLifecycle('DEBUG', `Cleaned up ${metrics.length - filteredMetrics.length} old metrics for ${metricId}`);
      }
    }
  }

  // Data persistence
  private loadStoredMetrics(): void {
    try {
      const stored = localStorage.getItem('performance-metrics-data');
      if (stored) {
        const data = JSON.parse(stored);
        
        for (const [metricId, metrics] of Object.entries(data.metrics || {})) {
          this.metrics.set(metricId, metrics as PerformanceMetric[]);
        }
        
        debugLogger.logLifecycle('INFO', 'Loaded stored performance metrics', {
          metricsCount: Object.keys(data.metrics || {}).length
        });
      }
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to load stored metrics', error);
    }
  }

  private persistMetrics(newMetrics: PerformanceMetric[]): void {
    try {
      const dataToStore = {
        metrics: Object.fromEntries(this.metrics),
        lastUpdated: Date.now(),
        sessionId: this.sessionId
      };
      
      if (this.config.compressionEnabled) {
        // Simple compression: only store recent metrics
        const recentCutoff = Date.now() - 86400000; // Last 24 hours
        const compressedMetrics: Record<string, PerformanceMetric[]> = {};
        
        for (const [metricId, metrics] of this.metrics) {
          compressedMetrics[metricId] = metrics.filter(m => m.timestamp > recentCutoff);
        }
        
        dataToStore.metrics = compressedMetrics;
      }
      
      localStorage.setItem('performance-metrics-data', JSON.stringify(dataToStore));
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to persist metrics', error);
    }
  }

  // Public API methods
  getMetricSummary(metricId: string): MetricSummary | null {
    const data = this.metrics.get(metricId);
    if (!data || data.length === 0) return null;
    
    return this.calculateMetricSummary(data);
  }

  getAllMetrics(): string[] {
    return Array.from(this.metrics.keys());
  }

  getMetricsByCategory(category: MetricCategory): string[] {
    const result: string[] = [];
    
    for (const [metricId, metrics] of this.metrics) {
      if (metrics.length > 0 && metrics[0].category === category) {
        result.push(metricId);
      }
    }
    
    return result;
  }

  exportMetricsData(metricIds?: string[]): Record<string, PerformanceMetric[]> {
    const result: Record<string, PerformanceMetric[]> = {};
    const targetIds = metricIds || Array.from(this.metrics.keys());
    
    for (const metricId of targetIds) {
      const data = this.metrics.get(metricId);
      if (data) {
        result[metricId] = [...data];
      }
    }
    
    return result;
  }

  generateComprehensiveReport(): {
    overview: any;
    metrics: Record<string, MetricAnalysis>;
    globalInsights: MetricInsight[];
    recommendations: MetricRecommendation[];
  } {
    const allMetricIds = this.getAllMetrics();
    const analyses: Record<string, MetricAnalysis> = {};
    
    // Analyze each metric
    for (const metricId of allMetricIds) {
      try {
        analyses[metricId] = this.analyzeMetric(metricId);
      } catch (error) {
        debugLogger.logError('WARN', `Failed to analyze metric: ${metricId}`, error);
      }
    }
    
    // Generate global insights and recommendations
    const globalInsights = this.generateGlobalInsights(analyses);
    const recommendations = this.generateGlobalRecommendations(analyses);
    
    return {
      overview: {
        totalMetrics: allMetricIds.length,
        dataPoints: Array.from(this.metrics.values()).reduce((sum, metrics) => sum + metrics.length, 0),
        timeRange: this.getGlobalTimeRange(),
        generatedAt: Date.now()
      },
      metrics: analyses,
      globalInsights,
      recommendations
    };
  }

  private generateGlobalInsights(analyses: Record<string, MetricAnalysis>): MetricInsight[] {
    const insights: MetricInsight[] = [];
    
    // Count regressions across all metrics
    const totalRegressions = Object.values(analyses).reduce(
      (sum, analysis) => sum + analysis.regressions.length, 0
    );
    
    if (totalRegressions > 0) {
      insights.push({
        type: 'pattern',
        description: `${totalRegressions} performance regressions detected across all metrics`,
        confidence: 0.9,
        impact: totalRegressions > 5 ? 'high' : 'medium',
        data: { totalRegressions }
      });
    }
    
    return insights;
  }

  private generateGlobalRecommendations(analyses: Record<string, MetricAnalysis>): MetricRecommendation[] {
    const recommendations: MetricRecommendation[] = [];
    
    // Aggregate recommendations by priority
    const allRecommendations = Object.values(analyses).flatMap(analysis => analysis.recommendations);
    const criticalCount = allRecommendations.filter(r => r.priority === 'critical').length;
    
    if (criticalCount > 0) {
      recommendations.push({
        priority: 'critical',
        title: 'Address Critical Performance Issues',
        description: `${criticalCount} critical performance issues require immediate attention`,
        expectedImprovement: 50,
        implementation: 'Review and address all critical recommendations',
        effort: 'high'
      });
    }
    
    return recommendations;
  }

  private getGlobalTimeRange(): { start: number; end: number } {
    let start = Date.now();
    let end = 0;
    
    for (const metrics of this.metrics.values()) {
      if (metrics.length > 0) {
        start = Math.min(start, metrics[0].timestamp);
        end = Math.max(end, metrics[metrics.length - 1].timestamp);
      }
    }
    
    return { start, end };
  }
}

export const performanceMetricsCollector = new PerformanceMetricsCollector();