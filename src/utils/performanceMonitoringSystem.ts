/**
 * Performance Monitoring and Alerting System
 * 
 * Implements real-time monitoring for initialization success rates,
 * alerting system for critical failure patterns, and performance
 * metrics dashboard and reporting.
 * 
 * Requirements: 1.1, 4.1, 4.3
 */

import { StartupPhase, ErrorSeverity } from './startupErrorDetection';
import { ComponentStatus } from './healthMonitoring';
import { debugLogger } from './debugLogger';

export interface InitializationMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  averageInitTime: number;
  medianInitTime: number;
  p95InitTime: number;
  failuresByPhase: Record<StartupPhase, number>;
  failuresByReason: Record<string, number>;
}

export interface PerformanceAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: number;
  data: Record<string, any>;
  threshold: AlertThreshold;
  acknowledged: boolean;
  resolved: boolean;
}

export enum AlertType {
  SUCCESS_RATE_DROP = 'SUCCESS_RATE_DROP',
  PERFORMANCE_DEGRADATION = 'PERFORMANCE_DEGRADATION',
  CRITICAL_ERROR_SPIKE = 'CRITICAL_ERROR_SPIKE',
  MEMORY_LEAK = 'MEMORY_LEAK',
  NETWORK_ISSUES = 'NETWORK_ISSUES',
  COMPONENT_FAILURE = 'COMPONENT_FAILURE',
  RESOURCE_LOADING_FAILURE = 'RESOURCE_LOADING_FAILURE'
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  timeWindow: number; // milliseconds
  minSamples: number;
}

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  severity: AlertSeverity;
  threshold: AlertThreshold;
  enabled: boolean;
  description: string;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'log' | 'emit_event' | 'store_local' | 'trigger_recovery';
  config: Record<string, any>;
}

export interface PerformanceDashboard {
  overview: DashboardOverview;
  realTimeMetrics: RealTimeMetrics;
  trends: PerformanceTrends;
  alerts: PerformanceAlert[];
  recommendations: DashboardRecommendation[];
}

export interface DashboardOverview {
  currentSuccessRate: number;
  averageInitTime: number;
  activeAlerts: number;
  totalSessions: number;
  healthScore: number;
  lastUpdated: number;
}

export interface RealTimeMetrics {
  initializationsPerMinute: number;
  currentMemoryUsage: number;
  networkLatency: number;
  errorRate: number;
  componentHealth: Record<string, ComponentStatus>;
}

export interface PerformanceTrends {
  successRateTrend: TrendData[];
  initTimeTrend: TrendData[];
  errorRateTrend: TrendData[];
  memoryUsageTrend: TrendData[];
}

export interface TrendData {
  timestamp: number;
  value: number;
  label?: string;
}

export interface DashboardRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: number;
}

export interface MonitoringReport {
  reportId: string;
  generatedAt: number;
  timeRange: { start: number; end: number };
  summary: ReportSummary;
  detailedMetrics: InitializationMetrics;
  alerts: PerformanceAlert[];
  trends: PerformanceTrends;
  recommendations: DashboardRecommendation[];
}

export interface ReportSummary {
  totalSessions: number;
  overallSuccessRate: number;
  averagePerformance: number;
  criticalIssues: number;
  improvementOpportunities: number;
}

class PerformanceMonitoringSystem {
  private metrics: InitializationMetrics;
  private alerts: Map<string, PerformanceAlert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private performanceHistory: TrendData[] = [];
  private sessionData: Array<{
    timestamp: number;
    success: boolean;
    initTime: number;
    phase: StartupPhase;
    errors: string[];
  }> = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private startTime = Date.now();

  constructor() {
    this.metrics = this.initializeMetrics();
    this.setupDefaultAlertRules();
    this.loadStoredData();
  }

  private initializeMetrics(): InitializationMetrics {
    return {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      successRate: 0,
      averageInitTime: 0,
      medianInitTime: 0,
      p95InitTime: 0,
      failuresByPhase: {} as Record<StartupPhase, number>,
      failuresByReason: {}
    };
  }

  private setupDefaultAlertRules(): void {
    // Success rate drop alert
    this.addAlertRule({
      id: 'success-rate-drop',
      name: 'Initialization Success Rate Drop',
      type: AlertType.SUCCESS_RATE_DROP,
      severity: AlertSeverity.HIGH,
      threshold: {
        metric: 'successRate',
        operator: 'lt',
        value: 0.8, // Less than 80% success rate
        timeWindow: 300000, // 5 minutes
        minSamples: 5
      },
      enabled: true,
      description: 'Alert when initialization success rate drops below 80%',
      actions: [
        { type: 'log', config: { level: 'error' } },
        { type: 'emit_event', config: { event: 'performance-alert' } },
        { type: 'store_local', config: { key: 'performance-alerts' } }
      ]
    });

    // Performance degradation alert
    this.addAlertRule({
      id: 'performance-degradation',
      name: 'Performance Degradation',
      type: AlertType.PERFORMANCE_DEGRADATION,
      severity: AlertSeverity.MEDIUM,
      threshold: {
        metric: 'averageInitTime',
        operator: 'gt',
        value: 5000, // More than 5 seconds
        timeWindow: 600000, // 10 minutes
        minSamples: 3
      },
      enabled: true,
      description: 'Alert when average initialization time exceeds 5 seconds',
      actions: [
        { type: 'log', config: { level: 'warn' } },
        { type: 'emit_event', config: { event: 'performance-degradation' } }
      ]
    });

    // Critical error spike alert
    this.addAlertRule({
      id: 'critical-error-spike',
      name: 'Critical Error Spike',
      type: AlertType.CRITICAL_ERROR_SPIKE,
      severity: AlertSeverity.CRITICAL,
      threshold: {
        metric: 'criticalErrorRate',
        operator: 'gt',
        value: 0.1, // More than 10% critical error rate
        timeWindow: 180000, // 3 minutes
        minSamples: 2
      },
      enabled: true,
      description: 'Alert when critical error rate exceeds 10%',
      actions: [
        { type: 'log', config: { level: 'error' } },
        { type: 'emit_event', config: { event: 'critical-error-spike' } },
        { type: 'trigger_recovery', config: { mode: 'emergency' } }
      ]
    });

    // Memory leak alert
    this.addAlertRule({
      id: 'memory-leak',
      name: 'Memory Leak Detection',
      type: AlertType.MEMORY_LEAK,
      severity: AlertSeverity.HIGH,
      threshold: {
        metric: 'memoryGrowthRate',
        operator: 'gt',
        value: 10, // More than 10MB/minute growth
        timeWindow: 900000, // 15 minutes
        minSamples: 5
      },
      enabled: true,
      description: 'Alert when memory usage grows consistently',
      actions: [
        { type: 'log', config: { level: 'warn' } },
        { type: 'emit_event', config: { event: 'memory-leak-detected' } }
      ]
    });
  }

  // Real-time Monitoring
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    debugLogger.logLifecycle('INFO', 'Performance monitoring started');

    // Start periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectRealTimeMetrics();
      this.evaluateAlertRules();
      // Trends are updated in collectRealTimeMetrics
      this.persistData();
    }, 30000); // Every 30 seconds

    // Initial collection
    this.collectRealTimeMetrics();
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    debugLogger.logLifecycle('INFO', 'Performance monitoring stopped');
  }

  private collectRealTimeMetrics(): void {
    try {
      // Collect current performance metrics
      const currentMetrics = this.getCurrentMetrics();
      
      // Update trends
      this.updatePerformanceTrends(currentMetrics);
      
      // Update session data
      this.updateSessionData();
      
      debugLogger.logLifecycle('DEBUG', 'Real-time metrics collected', {
        successRate: currentMetrics.successRate,
        averageInitTime: currentMetrics.averageInitTime,
        totalSessions: this.sessionData.length
      });
      
    } catch (error) {
      debugLogger.logError('ERROR', 'Failed to collect real-time metrics', error);
    }
  }

  private getCurrentMetrics(): InitializationMetrics {
    // Calculate current metrics from session data
    const recentSessions = this.getRecentSessions(300000); // Last 5 minutes
    
    if (recentSessions.length === 0) {
      return this.metrics;
    }
    
    const successful = recentSessions.filter(s => s.success);
    const failed = recentSessions.filter(s => !s.success);
    
    const initTimes = successful.map(s => s.initTime).sort((a, b) => a - b);
    const averageInitTime = initTimes.reduce((sum, time) => sum + time, 0) / initTimes.length || 0;
    const medianInitTime = initTimes[Math.floor(initTimes.length / 2)] || 0;
    const p95InitTime = initTimes[Math.floor(initTimes.length * 0.95)] || 0;
    
    // Count failures by phase
    const failuresByPhase: Record<StartupPhase, number> = {} as Record<StartupPhase, number>;
    failed.forEach(session => {
      failuresByPhase[session.phase] = (failuresByPhase[session.phase] || 0) + 1;
    });
    
    // Count failures by reason
    const failuresByReason: Record<string, number> = {};
    failed.forEach(session => {
      session.errors.forEach(error => {
        failuresByReason[error] = (failuresByReason[error] || 0) + 1;
      });
    });
    
    return {
      totalAttempts: recentSessions.length,
      successfulAttempts: successful.length,
      failedAttempts: failed.length,
      successRate: successful.length / recentSessions.length,
      averageInitTime,
      medianInitTime,
      p95InitTime,
      failuresByPhase,
      failuresByReason
    };
  }

  private getRecentSessions(timeWindow: number) {
    const cutoff = Date.now() - timeWindow;
    return this.sessionData.filter(session => session.timestamp > cutoff);
  }

  private updatePerformanceTrends(metrics: InitializationMetrics): void {
    const timestamp = Date.now();
    
    // Add new trend data points
    this.performanceHistory.push({
      timestamp,
      value: metrics.successRate,
      label: 'successRate'
    });
    
    this.performanceHistory.push({
      timestamp,
      value: metrics.averageInitTime,
      label: 'initTime'
    });
    
    // Keep only last 24 hours of data
    const cutoff = timestamp - 86400000; // 24 hours
    this.performanceHistory = this.performanceHistory.filter(point => point.timestamp > cutoff);
  }

  private updateSessionData(): void {
    // This would be called when new initialization attempts occur
    // For now, we'll simulate some data collection
    const timestamp = Date.now();
    
    // In a real implementation, this would be called from the startup orchestrator
    // when initialization completes or fails
  }

  // Alert System
  private evaluateAlertRules(): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;
      
      try {
        const shouldAlert = this.evaluateAlertRule(rule);
        if (shouldAlert) {
          this.triggerAlert(rule);
        }
      } catch (error) {
        debugLogger.logError('ERROR', `Failed to evaluate alert rule: ${rule.id}`, error);
      }
    }
  }

  private evaluateAlertRule(rule: AlertRule): boolean {
    const recentSessions = this.getRecentSessions(rule.threshold.timeWindow);
    
    if (recentSessions.length < rule.threshold.minSamples) {
      return false; // Not enough data
    }
    
    let metricValue: number;
    
    switch (rule.threshold.metric) {
      case 'successRate':
        const successful = recentSessions.filter(s => s.success).length;
        metricValue = successful / recentSessions.length;
        break;
        
      case 'averageInitTime':
        const initTimes = recentSessions.filter(s => s.success).map(s => s.initTime);
        metricValue = initTimes.reduce((sum, time) => sum + time, 0) / initTimes.length || 0;
        break;
        
      case 'criticalErrorRate':
        const criticalErrors = recentSessions.filter(s => 
          s.errors.some(error => error.includes('CRITICAL'))
        ).length;
        metricValue = criticalErrors / recentSessions.length;
        break;
        
      case 'memoryGrowthRate':
        metricValue = this.calculateMemoryGrowthRate();
        break;
        
      default:
        return false;
    }
    
    return this.compareMetricValue(metricValue, rule.threshold);
  }

  private compareMetricValue(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'gt': return value > threshold.value;
      case 'gte': return value >= threshold.value;
      case 'lt': return value < threshold.value;
      case 'lte': return value <= threshold.value;
      case 'eq': return value === threshold.value;
      default: return false;
    }
  }

  private calculateMemoryGrowthRate(): number {
    // Calculate memory growth rate over time
    if ('memory' in performance) {
      const currentMemory = (performance as any).memory.usedJSHeapSize;
      const memoryHistory = this.performanceHistory
        .filter(point => point.label === 'memory')
        .slice(-10); // Last 10 measurements
      
      if (memoryHistory.length < 2) return 0;
      
      const oldestMemory = memoryHistory[0].value;
      const timeSpan = Date.now() - memoryHistory[0].timestamp;
      
      return ((currentMemory - oldestMemory) / timeSpan) * 60000; // MB per minute
    }
    
    return 0;
  }

  private triggerAlert(rule: AlertRule): void {
    const alertId = `${rule.id}-${Date.now()}`;
    
    const alert: PerformanceAlert = {
      id: alertId,
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      description: rule.description,
      timestamp: Date.now(),
      data: this.getAlertContextData(rule),
      threshold: rule.threshold,
      acknowledged: false,
      resolved: false
    };
    
    this.alerts.set(alertId, alert);
    
    // Execute alert actions
    this.executeAlertActions(rule.actions, alert);
    
    debugLogger.logError(
      rule.severity === AlertSeverity.CRITICAL ? 'CRITICAL' : 'WARN',
      `Performance alert triggered: ${rule.name}`,
      alert
    );
  }

  private getAlertContextData(rule: AlertRule): Record<string, any> {
    const recentSessions = this.getRecentSessions(rule.threshold.timeWindow);
    const currentMetrics = this.getCurrentMetrics();
    
    return {
      recentSessions: recentSessions.length,
      currentMetrics,
      memoryUsage: 'memory' in performance ? (performance as any).memory : null,
      networkStatus: navigator.onLine,
      timestamp: Date.now()
    };
  }

  private executeAlertActions(actions: AlertAction[], alert: PerformanceAlert): void {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'log':
            this.executeLogAction(action, alert);
            break;
          case 'emit_event':
            this.executeEmitEventAction(action, alert);
            break;
          case 'store_local':
            this.executeStoreLocalAction(action, alert);
            break;
          case 'trigger_recovery':
            this.executeTriggerRecoveryAction(action, alert);
            break;
        }
      } catch (error) {
        debugLogger.logError('ERROR', `Failed to execute alert action: ${action.type}`, error);
      }
    }
  }

  private executeLogAction(action: AlertAction, alert: PerformanceAlert): void {
    const level = action.config.level || 'info';
    debugLogger.logLifecycle(level.toUpperCase(), `Alert: ${alert.title}`, alert);
  }

  private executeEmitEventAction(action: AlertAction, alert: PerformanceAlert): void {
    const eventName = action.config.event || 'performance-alert';
    window.dispatchEvent(new CustomEvent(eventName, { detail: alert }));
  }

  private executeStoreLocalAction(action: AlertAction, alert: PerformanceAlert): void {
    const key = action.config.key || 'performance-alerts';
    try {
      const existingAlerts = JSON.parse(localStorage.getItem(key) || '[]');
      existingAlerts.push(alert);
      
      // Keep only last 100 alerts
      if (existingAlerts.length > 100) {
        existingAlerts.splice(0, existingAlerts.length - 100);
      }
      
      localStorage.setItem(key, JSON.stringify(existingAlerts));
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to store alert locally', error);
    }
  }

  private executeTriggerRecoveryAction(action: AlertAction, alert: PerformanceAlert): void {
    const mode = action.config.mode || 'standard';
    
    if (mode === 'emergency') {
      localStorage.setItem('emergency-debug', 'true');
      window.dispatchEvent(new CustomEvent('activate-emergency-mode', { detail: alert }));
    } else {
      window.dispatchEvent(new CustomEvent('trigger-recovery', { detail: { alert, mode } }));
    }
  }

  // Dashboard and Reporting
  generateDashboard(): PerformanceDashboard {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = Array.from(this.alerts.values()).filter(alert => !alert.resolved);
    
    return {
      overview: {
        currentSuccessRate: currentMetrics.successRate,
        averageInitTime: currentMetrics.averageInitTime,
        activeAlerts: activeAlerts.length,
        totalSessions: this.sessionData.length,
        healthScore: this.calculateHealthScore(currentMetrics, activeAlerts),
        lastUpdated: Date.now()
      },
      realTimeMetrics: {
        initializationsPerMinute: this.calculateInitializationsPerMinute(),
        currentMemoryUsage: this.getCurrentMemoryUsage(),
        networkLatency: this.getCurrentNetworkLatency(),
        errorRate: 1 - currentMetrics.successRate,
        componentHealth: this.getComponentHealthStatus()
      },
      trends: this.generatePerformanceTrends(),
      alerts: activeAlerts,
      recommendations: this.generateDashboardRecommendations(currentMetrics, activeAlerts)
    };
  }

  private calculateHealthScore(metrics: InitializationMetrics, alerts: PerformanceAlert[]): number {
    let score = 100;
    
    // Deduct points for low success rate
    if (metrics.successRate < 0.9) {
      score -= (0.9 - metrics.successRate) * 100;
    }
    
    // Deduct points for slow initialization
    if (metrics.averageInitTime > 3000) {
      score -= Math.min((metrics.averageInitTime - 3000) / 100, 30);
    }
    
    // Deduct points for active alerts
    alerts.forEach(alert => {
      switch (alert.severity) {
        case AlertSeverity.CRITICAL:
          score -= 25;
          break;
        case AlertSeverity.HIGH:
          score -= 15;
          break;
        case AlertSeverity.MEDIUM:
          score -= 10;
          break;
        case AlertSeverity.LOW:
          score -= 5;
          break;
      }
    });
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateInitializationsPerMinute(): number {
    const oneMinuteAgo = Date.now() - 60000;
    const recentSessions = this.sessionData.filter(session => session.timestamp > oneMinuteAgo);
    return recentSessions.length;
  }

  private getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  private getCurrentNetworkLatency(): number {
    // Estimate network latency from recent resource timings
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const recentResources = resources.filter(r => r.startTime > performance.now() - 60000);
    
    if (recentResources.length === 0) return 0;
    
    const latencies = recentResources.map(r => r.responseStart - r.requestStart);
    return latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
  }

  private getComponentHealthStatus(): Record<string, ComponentStatus> {
    // This would integrate with the health monitoring system
    return {
      'React App': ComponentStatus.HEALTHY,
      'Authentication': ComponentStatus.HEALTHY,
      'Service Worker': ComponentStatus.HEALTHY,
      'Network': ComponentStatus.HEALTHY
    };
  }

  private generatePerformanceTrends(): PerformanceTrends {
    const successRateTrend = this.performanceHistory
      .filter(point => point.label === 'successRate')
      .slice(-24); // Last 24 data points
    
    const initTimeTrend = this.performanceHistory
      .filter(point => point.label === 'initTime')
      .slice(-24);
    
    const errorRateTrend = successRateTrend.map(point => ({
      timestamp: point.timestamp,
      value: 1 - point.value,
      label: 'errorRate'
    }));
    
    const memoryUsageTrend = this.performanceHistory
      .filter(point => point.label === 'memory')
      .slice(-24);
    
    return {
      successRateTrend,
      initTimeTrend,
      errorRateTrend,
      memoryUsageTrend
    };
  }

  private generateDashboardRecommendations(
    metrics: InitializationMetrics, 
    alerts: PerformanceAlert[]
  ): DashboardRecommendation[] {
    const recommendations: DashboardRecommendation[] = [];
    
    // Success rate recommendations
    if (metrics.successRate < 0.9) {
      recommendations.push({
        id: 'improve-success-rate',
        priority: 'high',
        title: 'Improve Initialization Success Rate',
        description: `Current success rate is ${(metrics.successRate * 100).toFixed(1)}%, below the target of 90%`,
        impact: 'High impact on user experience',
        implementation: 'Review failure patterns and implement targeted fixes',
        estimatedImprovement: (0.9 - metrics.successRate) * 100
      });
    }
    
    // Performance recommendations
    if (metrics.averageInitTime > 3000) {
      recommendations.push({
        id: 'optimize-performance',
        priority: 'medium',
        title: 'Optimize Initialization Performance',
        description: `Average initialization time is ${(metrics.averageInitTime / 1000).toFixed(1)}s, above the target of 3s`,
        impact: 'Medium impact on user experience',
        implementation: 'Implement performance optimizations and resource loading improvements',
        estimatedImprovement: ((metrics.averageInitTime - 3000) / metrics.averageInitTime) * 100
      });
    }
    
    // Alert-based recommendations
    if (alerts.length > 0) {
      recommendations.push({
        id: 'resolve-alerts',
        priority: 'high',
        title: 'Resolve Active Performance Alerts',
        description: `${alerts.length} active performance alerts require attention`,
        impact: 'Varies by alert severity',
        implementation: 'Address root causes of active alerts',
        estimatedImprovement: 20
      });
    }
    
    return recommendations;
  }

  generateReport(timeRange?: { start: number; end: number }): MonitoringReport {
    const now = Date.now();
    const range = timeRange || {
      start: now - 86400000, // Last 24 hours
      end: now
    };
    
    const sessionsInRange = this.sessionData.filter(
      session => session.timestamp >= range.start && session.timestamp <= range.end
    );
    
    const successful = sessionsInRange.filter(s => s.success);
    const alertsInRange = Array.from(this.alerts.values()).filter(
      alert => alert.timestamp >= range.start && alert.timestamp <= range.end
    );
    
    return {
      reportId: `perf-report-${now}`,
      generatedAt: now,
      timeRange: range,
      summary: {
        totalSessions: sessionsInRange.length,
        overallSuccessRate: successful.length / sessionsInRange.length || 0,
        averagePerformance: successful.reduce((sum, s) => sum + s.initTime, 0) / successful.length || 0,
        criticalIssues: alertsInRange.filter(a => a.severity === AlertSeverity.CRITICAL).length,
        improvementOpportunities: this.identifyImprovementOpportunities(sessionsInRange).length
      },
      detailedMetrics: this.calculateDetailedMetrics(sessionsInRange),
      alerts: alertsInRange,
      trends: this.generatePerformanceTrends(),
      recommendations: this.generateDashboardRecommendations(
        this.calculateDetailedMetrics(sessionsInRange),
        alertsInRange
      )
    };
  }

  private calculateDetailedMetrics(sessions: typeof this.sessionData): InitializationMetrics {
    if (sessions.length === 0) {
      return this.initializeMetrics();
    }
    
    const successful = sessions.filter(s => s.success);
    const failed = sessions.filter(s => !s.success);
    
    const initTimes = successful.map(s => s.initTime).sort((a, b) => a - b);
    
    return {
      totalAttempts: sessions.length,
      successfulAttempts: successful.length,
      failedAttempts: failed.length,
      successRate: successful.length / sessions.length,
      averageInitTime: initTimes.reduce((sum, time) => sum + time, 0) / initTimes.length || 0,
      medianInitTime: initTimes[Math.floor(initTimes.length / 2)] || 0,
      p95InitTime: initTimes[Math.floor(initTimes.length * 0.95)] || 0,
      failuresByPhase: this.calculateFailuresByPhase(failed),
      failuresByReason: this.calculateFailuresByReason(failed)
    };
  }

  private calculateFailuresByPhase(failedSessions: typeof this.sessionData): Record<StartupPhase, number> {
    const failures: Record<StartupPhase, number> = {} as Record<StartupPhase, number>;
    
    failedSessions.forEach(session => {
      failures[session.phase] = (failures[session.phase] || 0) + 1;
    });
    
    return failures;
  }

  private calculateFailuresByReason(failedSessions: typeof this.sessionData): Record<string, number> {
    const failures: Record<string, number> = {};
    
    failedSessions.forEach(session => {
      session.errors.forEach(error => {
        failures[error] = (failures[error] || 0) + 1;
      });
    });
    
    return failures;
  }

  private identifyImprovementOpportunities(sessions: typeof this.sessionData): string[] {
    const opportunities: string[] = [];
    
    const metrics = this.calculateDetailedMetrics(sessions);
    
    if (metrics.successRate < 0.95) {
      opportunities.push('Improve initialization reliability');
    }
    
    if (metrics.averageInitTime > 2000) {
      opportunities.push('Optimize initialization performance');
    }
    
    if (Object.keys(metrics.failuresByPhase).length > 0) {
      opportunities.push('Address phase-specific failures');
    }
    
    return opportunities;
  }

  // Public API methods
  recordInitializationAttempt(
    success: boolean, 
    initTime: number, 
    phase: StartupPhase, 
    errors: string[] = []
  ): void {
    this.sessionData.push({
      timestamp: Date.now(),
      success,
      initTime,
      phase,
      errors
    });
    
    // Keep only last 1000 sessions to prevent memory issues
    if (this.sessionData.length > 1000) {
      this.sessionData.splice(0, this.sessionData.length - 1000);
    }
    
    // Update metrics
    this.metrics = this.getCurrentMetrics();
  }

  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    debugLogger.logLifecycle('INFO', `Alert rule added: ${rule.name}`);
  }

  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    debugLogger.logLifecycle('INFO', `Alert rule removed: ${ruleId}`);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      debugLogger.logLifecycle('INFO', `Alert acknowledged: ${alertId}`);
    }
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      debugLogger.logLifecycle('INFO', `Alert resolved: ${alertId}`);
    }
  }

  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  getCurrentMetricsSnapshot(): InitializationMetrics {
    return { ...this.metrics };
  }

  // Data persistence
  private loadStoredData(): void {
    try {
      const storedData = localStorage.getItem('performance-monitoring-data');
      if (storedData) {
        const data = JSON.parse(storedData);
        this.sessionData = data.sessionData || [];
        this.performanceHistory = data.performanceHistory || [];
        
        // Restore alerts (but mark them as acknowledged since they're from a previous session)
        if (data.alerts) {
          data.alerts.forEach((alert: PerformanceAlert) => {
            alert.acknowledged = true;
            this.alerts.set(alert.id, alert);
          });
        }
      }
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to load stored monitoring data', error);
    }
  }

  private persistData(): void {
    try {
      const dataToStore = {
        sessionData: this.sessionData.slice(-500), // Keep last 500 sessions
        performanceHistory: this.performanceHistory.slice(-1000), // Keep last 1000 points
        alerts: Array.from(this.alerts.values()).slice(-50) // Keep last 50 alerts
      };
      
      localStorage.setItem('performance-monitoring-data', JSON.stringify(dataToStore));
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to persist monitoring data', error);
    }
  }

  exportMonitoringData() {
    return {
      metrics: this.metrics,
      alerts: Array.from(this.alerts.values()),
      alertRules: Array.from(this.alertRules.values()),
      performanceHistory: this.performanceHistory,
      sessionData: this.sessionData,
      dashboard: this.generateDashboard(),
      timestamp: Date.now()
    };
  }
}

export const performanceMonitoringSystem = new PerformanceMonitoringSystem();