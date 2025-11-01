/**
 * Test Performance Optimization Integration
 * 
 * Simple test to verify the performance optimization system works correctly
 */

import { startupPerformanceOptimizer } from './startupPerformanceOptimizer';
import { performanceMonitoringSystem } from './performanceMonitoringSystem';
import { performanceMetricsCollector, MetricCategory } from './performanceMetricsCollector';
import { StartupPhase } from './startupErrorDetection';

export async function testPerformanceOptimization(): Promise<boolean> {
  try {
    console.log('🧪 Testing Performance Optimization System...');
    
    // Test 1: Performance Optimizer
    console.log('📊 Testing Startup Performance Optimizer...');
    startupPerformanceOptimizer.startTimingAnalysis();
    
    // Simulate some operations
    startupPerformanceOptimizer.recordOperationStart('test-operation', StartupPhase.INITIAL_LOAD);
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
    startupPerformanceOptimizer.recordOperationEnd('test-operation');
    
    const timingAnalysis = startupPerformanceOptimizer.getTimingAnalysis();
    console.log('✅ Timing analysis completed:', {
      totalTime: timingAnalysis.totalStartupTime,
      bottlenecks: timingAnalysis.bottlenecks.length,
      recommendations: timingAnalysis.recommendations.length
    });
    
    // Test 2: Performance Monitoring
    console.log('📈 Testing Performance Monitoring System...');
    performanceMonitoringSystem.startMonitoring();
    
    // Record some test data
    performanceMonitoringSystem.recordInitializationAttempt(true, 1500, StartupPhase.APP_READY, []);
    performanceMonitoringSystem.recordInitializationAttempt(true, 1200, StartupPhase.APP_READY, []);
    performanceMonitoringSystem.recordInitializationAttempt(false, 3000, StartupPhase.AUTH_INIT, ['Auth timeout']);
    
    const dashboard = performanceMonitoringSystem.generateDashboard();
    console.log('✅ Dashboard generated:', {
      successRate: dashboard.overview.currentSuccessRate,
      averageTime: dashboard.overview.averageInitTime,
      activeAlerts: dashboard.overview.activeAlerts
    });
    
    // Test 3: Metrics Collection
    console.log('📋 Testing Performance Metrics Collector...');
    performanceMetricsCollector.startCollection();
    
    // Collect some test metrics
    performanceMetricsCollector.collectMetric(
      'test-startup-time',
      'Test Startup Time',
      MetricCategory.STARTUP,
      1500,
      'ms',
      { phase: StartupPhase.INITIAL_LOAD },
      { environment: 'test' }
    );
    
    performanceMetricsCollector.collectMetric(
      'test-memory-usage',
      'Test Memory Usage',
      MetricCategory.MEMORY,
      50,
      'MB',
      { component: 'test' },
      { type: 'heap' }
    );
    
    const availableMetrics = performanceMetricsCollector.getAllMetrics();
    console.log('✅ Metrics collection working:', {
      totalMetrics: availableMetrics.length,
      metrics: availableMetrics
    });
    
    // Test 4: Integration
    console.log('🔗 Testing System Integration...');
    
    // Test resource optimization
    const resourceOptimizations = startupPerformanceOptimizer.optimizeResourceLoading();
    console.log('✅ Resource optimization completed:', resourceOptimizations.length, 'optimizations');
    
    // Test memory optimization
    const memoryOptimizations = startupPerformanceOptimizer.optimizeMemoryUsage();
    console.log('✅ Memory optimization completed:', memoryOptimizations.length, 'optimizations');
    
    // Generate comprehensive report
    const comprehensiveReport = performanceMetricsCollector.generateComprehensiveReport();
    console.log('✅ Comprehensive report generated:', {
      totalMetrics: comprehensiveReport.overview.totalMetrics,
      dataPoints: comprehensiveReport.overview.dataPoints,
      insights: comprehensiveReport.globalInsights.length,
      recommendations: comprehensiveReport.recommendations.length
    });
    
    // Clean up
    performanceMonitoringSystem.stopMonitoring();
    performanceMetricsCollector.stopCollection();
    
    console.log('🎉 All performance optimization tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Performance optimization test failed:', error);
    return false;
  }
}

// Export for use in other components
export { testPerformanceOptimization as default };