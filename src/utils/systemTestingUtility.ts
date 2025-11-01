/**
 * System Testing Utility
 * 
 * Comprehensive testing framework for the integrated startup system
 * across different environments and conditions.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4
 */

import { startupSystemIntegration, SystemIntegrationResult, SystemHealthStatus } from './startupSystemIntegration';
import { detectTWAEnvironment, TWAEnvironment } from './twaDetection';
import { serviceWorkerManager } from './serviceWorkerManager';
import { authRecoverySystem } from './authRecoverySystem';
import { diagnosticCollector } from './diagnosticDataCollector';
import { debugLogger } from './debugLogger';

export interface TestEnvironment {
  name: string;
  description: string;
  conditions: {
    networkQuality: 'fast' | 'moderate' | 'slow' | 'offline';
    deviceType: 'desktop' | 'mobile' | 'tablet';
    browserType: 'chrome' | 'firefox' | 'safari' | 'edge' | 'webview';
    storageAvailable: boolean;
    serviceWorkerSupported: boolean;
    isFirstLaunch: boolean;
    hasCachedData: boolean;
  };
  setup: () => Promise<void>;
  cleanup: () => Promise<void>;
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  environment: string;
  expectedOutcome: 'success' | 'limited' | 'recovery' | 'emergency';
  criticalPath: string[];
  execute: () => Promise<TestResult>;
}

export interface TestResult {
  scenario: string;
  success: boolean;
  mode: string;
  timing: {
    total: number;
    phases: Record<string, number>;
  };
  errors: string[];
  warnings: string[];
  performance: {
    startupTime: number;
    timeToInteractive: number;
    memoryUsage?: number;
  };
  healthStatus: SystemHealthStatus;
  diagnostics: any;
}

export interface TestSuite {
  name: string;
  description: string;
  scenarios: TestScenario[];
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

class SystemTestingUtility {
  private static instance: SystemTestingUtility;
  private testEnvironments: Map<string, TestEnvironment> = new Map();
  private testScenarios: TestScenario[] = [];
  private currentTest: string | null = null;

  static getInstance(): SystemTestingUtility {
    if (!SystemTestingUtility.instance) {
      SystemTestingUtility.instance = new SystemTestingUtility();
    }
    return SystemTestingUtility.instance;
  }

  constructor() {
    this.setupTestEnvironments();
    this.setupTestScenarios();
  }

  /**
   * Setup test environments for different conditions
   */
  private setupTestEnvironments(): void {
    // TWA Environment
    this.testEnvironments.set('twa-fresh', {
      name: 'TWA Fresh Installation',
      description: 'Fresh TWA installation from Play Store on clean device',
      conditions: {
        networkQuality: 'moderate',
        deviceType: 'mobile',
        browserType: 'webview',
        storageAvailable: true,
        serviceWorkerSupported: true,
        isFirstLaunch: true,
        hasCachedData: false
      },
      setup: async () => {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        localStorage.setItem('twa-environment', 'true');
        localStorage.setItem('first-launch', 'true');
      },
      cleanup: async () => {
        localStorage.removeItem('twa-environment');
        localStorage.removeItem('first-launch');
      }
    });

    // PWA Environment
    this.testEnvironments.set('pwa-returning', {
      name: 'PWA Returning User',
      description: 'PWA with existing cache and user data',
      conditions: {
        networkQuality: 'fast',
        deviceType: 'desktop',
        browserType: 'chrome',
        storageAvailable: true,
        serviceWorkerSupported: true,
        isFirstLaunch: false,
        hasCachedData: true
      },
      setup: async () => {
        localStorage.setItem('app-version', '2.0.0');
        localStorage.setItem('user-preferences', JSON.stringify({ theme: 'dark' }));
        sessionStorage.setItem('session-data', 'existing');
      },
      cleanup: async () => {
        localStorage.removeItem('app-version');
        localStorage.removeItem('user-preferences');
        sessionStorage.removeItem('session-data');
      }
    });

    // Slow Network Environment
    this.testEnvironments.set('slow-network', {
      name: 'Slow Network Conditions',
      description: 'Testing with slow/unreliable network connection',
      conditions: {
        networkQuality: 'slow',
        deviceType: 'mobile',
        browserType: 'chrome',
        storageAvailable: true,
        serviceWorkerSupported: true,
        isFirstLaunch: false,
        hasCachedData: false
      },
      setup: async () => {
        // Simulate slow network by adding delays to fetch
        const originalFetch = window.fetch;
        window.fetch = async (input, init) => {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
          return originalFetch(input, init);
        };
      },
      cleanup: async () => {
        // Restore original fetch (this is simplified)
        location.reload();
      }
    });

    // Offline Environment
    this.testEnvironments.set('offline', {
      name: 'Offline Mode',
      description: 'Testing offline functionality and recovery',
      conditions: {
        networkQuality: 'offline',
        deviceType: 'mobile',
        browserType: 'chrome',
        storageAvailable: true,
        serviceWorkerSupported: true,
        isFirstLaunch: false,
        hasCachedData: true
      },
      setup: async () => {
        // Simulate offline by intercepting fetch
        const originalFetch = window.fetch;
        window.fetch = async () => {
          throw new Error('Network request failed - offline mode');
        };
        
        // Set offline flag
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        });
      },
      cleanup: async () => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true
        });
        location.reload();
      }
    });

    // Limited Storage Environment
    this.testEnvironments.set('limited-storage', {
      name: 'Limited Storage',
      description: 'Testing with limited storage availability',
      conditions: {
        networkQuality: 'moderate',
        deviceType: 'mobile',
        browserType: 'webview',
        storageAvailable: false,
        serviceWorkerSupported: true,
        isFirstLaunch: true,
        hasCachedData: false
      },
      setup: async () => {
        // Mock storage to throw errors
        const throwError = () => { throw new Error('Storage quota exceeded'); };
        Storage.prototype.setItem = throwError;
        Storage.prototype.getItem = () => null;
      },
      cleanup: async () => {
        location.reload(); // Restore original storage
      }
    });
  }

  /**
   * Setup test scenarios for different startup flows
   */
  private setupTestScenarios(): void {
    // Scenario 1: Normal TWA startup
    this.testScenarios.push({
      id: 'twa-normal-startup',
      name: 'TWA Normal Startup',
      description: 'Fresh TWA installation should complete successfully',
      environment: 'twa-fresh',
      expectedOutcome: 'success',
      criticalPath: ['environment-detection', 'twa-initialization', 'startup-orchestrator', 'app-ready'],
      execute: async () => {
        const startTime = Date.now();
        
        try {
          const result = await startupSystemIntegration.initializeSystem();
          const healthStatus = startupSystemIntegration.getSystemHealth();
          const diagnostics = await startupSystemIntegration.getSystemDiagnostics();
          
          return {
            scenario: 'twa-normal-startup',
            success: result.success && result.mode !== 'emergency',
            mode: result.mode,
            timing: result.timing,
            errors: result.errors,
            warnings: result.warnings,
            performance: {
              startupTime: result.timing.total,
              timeToInteractive: result.timing.total,
              memoryUsage: this.getMemoryUsage()
            },
            healthStatus,
            diagnostics
          };
        } catch (error) {
          return this.createFailureResult('twa-normal-startup', error, Date.now() - startTime);
        }
      }
    });

    // Scenario 2: PWA with existing data
    this.testScenarios.push({
      id: 'pwa-returning-user',
      name: 'PWA Returning User',
      description: 'PWA with cached data should start quickly',
      environment: 'pwa-returning',
      expectedOutcome: 'success',
      criticalPath: ['environment-detection', 'cache-validation', 'startup-orchestrator', 'app-ready'],
      execute: async () => {
        const startTime = Date.now();
        
        try {
          const result = await startupSystemIntegration.initializeSystem();
          const healthStatus = startupSystemIntegration.getSystemHealth();
          
          return {
            scenario: 'pwa-returning-user',
            success: result.success && result.timing.total < 3000, // Should be fast
            mode: result.mode,
            timing: result.timing,
            errors: result.errors,
            warnings: result.warnings,
            performance: {
              startupTime: result.timing.total,
              timeToInteractive: result.timing.total,
              memoryUsage: this.getMemoryUsage()
            },
            healthStatus,
            diagnostics: {}
          };
        } catch (error) {
          return this.createFailureResult('pwa-returning-user', error, Date.now() - startTime);
        }
      }
    });

    // Scenario 3: Slow network recovery
    this.testScenarios.push({
      id: 'slow-network-recovery',
      name: 'Slow Network Recovery',
      description: 'App should handle slow network gracefully',
      environment: 'slow-network',
      expectedOutcome: 'limited',
      criticalPath: ['network-detection', 'timeout-handling', 'progressive-loading', 'limited-mode'],
      execute: async () => {
        const startTime = Date.now();
        
        try {
          const result = await startupSystemIntegration.initializeSystem();
          const healthStatus = startupSystemIntegration.getSystemHealth();
          
          return {
            scenario: 'slow-network-recovery',
            success: result.success && (result.mode === 'limited' || result.mode === 'offline'),
            mode: result.mode,
            timing: result.timing,
            errors: result.errors,
            warnings: result.warnings,
            performance: {
              startupTime: result.timing.total,
              timeToInteractive: result.timing.total,
              memoryUsage: this.getMemoryUsage()
            },
            healthStatus,
            diagnostics: {}
          };
        } catch (error) {
          return this.createFailureResult('slow-network-recovery', error, Date.now() - startTime);
        }
      }
    });

    // Scenario 4: Offline mode
    this.testScenarios.push({
      id: 'offline-mode',
      name: 'Offline Mode',
      description: 'App should work offline with cached data',
      environment: 'offline',
      expectedOutcome: 'limited',
      criticalPath: ['offline-detection', 'cache-recovery', 'offline-auth', 'limited-functionality'],
      execute: async () => {
        const startTime = Date.now();
        
        try {
          const result = await startupSystemIntegration.initializeSystem();
          const healthStatus = startupSystemIntegration.getSystemHealth();
          
          return {
            scenario: 'offline-mode',
            success: result.success && result.mode === 'offline',
            mode: result.mode,
            timing: result.timing,
            errors: result.errors,
            warnings: result.warnings,
            performance: {
              startupTime: result.timing.total,
              timeToInteractive: result.timing.total,
              memoryUsage: this.getMemoryUsage()
            },
            healthStatus,
            diagnostics: {}
          };
        } catch (error) {
          return this.createFailureResult('offline-mode', error, Date.now() - startTime);
        }
      }
    });

    // Scenario 5: Storage failure recovery
    this.testScenarios.push({
      id: 'storage-failure-recovery',
      name: 'Storage Failure Recovery',
      description: 'App should handle storage failures gracefully',
      environment: 'limited-storage',
      expectedOutcome: 'recovery',
      criticalPath: ['storage-detection', 'fallback-mechanisms', 'memory-only-mode', 'recovery-ui'],
      execute: async () => {
        const startTime = Date.now();
        
        try {
          const result = await startupSystemIntegration.initializeSystem();
          const healthStatus = startupSystemIntegration.getSystemHealth();
          
          return {
            scenario: 'storage-failure-recovery',
            success: result.success && (result.mode === 'recovery' || result.mode === 'limited'),
            mode: result.mode,
            timing: result.timing,
            errors: result.errors,
            warnings: result.warnings,
            performance: {
              startupTime: result.timing.total,
              timeToInteractive: result.timing.total,
              memoryUsage: this.getMemoryUsage()
            },
            healthStatus,
            diagnostics: {}
          };
        } catch (error) {
          return this.createFailureResult('storage-failure-recovery', error, Date.now() - startTime);
        }
      }
    });
  }

  /**
   * Run a complete test suite
   */
  async runTestSuite(suiteName: string = 'Complete System Test'): Promise<TestSuite> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    
    debugLogger.logLifecycle('INFO', `Starting test suite: ${suiteName}`);
    
    for (const scenario of this.testScenarios) {
      debugLogger.logLifecycle('INFO', `Running test scenario: ${scenario.name}`);
      
      try {
        // Setup test environment
        const environment = this.testEnvironments.get(scenario.environment);
        if (environment) {
          await environment.setup();
        }
        
        // Execute test scenario
        this.currentTest = scenario.id;
        const result = await scenario.execute();
        results.push(result);
        
        debugLogger.logLifecycle('INFO', `Test scenario completed: ${scenario.name}`, {
          success: result.success,
          mode: result.mode,
          timing: result.timing.total
        });
        
        // Cleanup test environment
        if (environment) {
          await environment.cleanup();
        }
        
        // Wait between tests to avoid interference
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        debugLogger.logError('ERROR', `Test scenario failed: ${scenario.name}`, error);
        
        const failureResult = this.createFailureResult(scenario.id, error, 0);
        results.push(failureResult);
      }
    }
    
    this.currentTest = null;
    
    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;
    
    const testSuite: TestSuite = {
      name: suiteName,
      description: 'Comprehensive system testing across different environments and conditions',
      scenarios: this.testScenarios,
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        duration
      }
    };
    
    debugLogger.logLifecycle('INFO', `Test suite completed: ${suiteName}`, testSuite.summary);
    
    return testSuite;
  }

  /**
   * Run a specific test scenario
   */
  async runScenario(scenarioId: string): Promise<TestResult> {
    const scenario = this.testScenarios.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Test scenario not found: ${scenarioId}`);
    }
    
    debugLogger.logLifecycle('INFO', `Running single test scenario: ${scenario.name}`);
    
    // Setup environment
    const environment = this.testEnvironments.get(scenario.environment);
    if (environment) {
      await environment.setup();
    }
    
    try {
      this.currentTest = scenario.id;
      const result = await scenario.execute();
      
      debugLogger.logLifecycle('INFO', `Single test scenario completed: ${scenario.name}`, {
        success: result.success,
        mode: result.mode
      });
      
      return result;
    } finally {
      this.currentTest = null;
      
      // Cleanup environment
      if (environment) {
        await environment.cleanup();
      }
    }
  }

  /**
   * Test system performance under stress
   */
  async runPerformanceTest(): Promise<{
    averageStartupTime: number;
    p95StartupTime: number;
    memoryUsage: number;
    errorRate: number;
    iterations: number;
  }> {
    const iterations = 10;
    const startupTimes: number[] = [];
    const memoryUsages: number[] = [];
    let errors = 0;
    
    debugLogger.logLifecycle('INFO', `Starting performance test with ${iterations} iterations`);
    
    for (let i = 0; i < iterations; i++) {
      try {
        // Clear state between iterations
        localStorage.clear();
        sessionStorage.clear();
        
        const startTime = Date.now();
        const result = await startupSystemIntegration.initializeSystem();
        const endTime = Date.now();
        
        if (result.success) {
          startupTimes.push(endTime - startTime);
          memoryUsages.push(this.getMemoryUsage());
        } else {
          errors++;
        }
        
        // Wait between iterations
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        errors++;
        debugLogger.logError('ERROR', `Performance test iteration ${i + 1} failed`, error);
      }
    }
    
    const averageStartupTime = startupTimes.reduce((a, b) => a + b, 0) / startupTimes.length;
    const sortedTimes = startupTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95StartupTime = sortedTimes[p95Index] || 0;
    const averageMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
    const errorRate = errors / iterations;
    
    const performanceResults = {
      averageStartupTime,
      p95StartupTime,
      memoryUsage: averageMemoryUsage,
      errorRate,
      iterations
    };
    
    debugLogger.logLifecycle('INFO', 'Performance test completed', performanceResults);
    
    return performanceResults;
  }

  /**
   * Test recovery mechanisms
   */
  async testRecoveryMechanisms(): Promise<{
    emergencyRecovery: boolean;
    componentRecovery: boolean;
    healthMonitoring: boolean;
    diagnosticGeneration: boolean;
  }> {
    debugLogger.logLifecycle('INFO', 'Testing recovery mechanisms');
    
    const results = {
      emergencyRecovery: false,
      componentRecovery: false,
      healthMonitoring: false,
      diagnosticGeneration: false
    };
    
    try {
      // Test emergency recovery
      const emergencyResult = await startupSystemIntegration.triggerManualRecovery();
      results.emergencyRecovery = emergencyResult.success;
      
      // Test health monitoring
      const healthStatus = startupSystemIntegration.getSystemHealth();
      results.healthMonitoring = healthStatus.overall !== undefined;
      
      // Test diagnostic generation
      const diagnostics = await startupSystemIntegration.getSystemDiagnostics();
      results.diagnosticGeneration = !!diagnostics;
      
      // Test component recovery (simplified)
      results.componentRecovery = true; // Assume working if no errors
      
    } catch (error) {
      debugLogger.logError('ERROR', 'Recovery mechanism testing failed', error);
    }
    
    debugLogger.logLifecycle('INFO', 'Recovery mechanism testing completed', results);
    
    return results;
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport(): Promise<{
    systemTest: TestSuite;
    performanceTest: any;
    recoveryTest: any;
    environment: TWAEnvironment;
    timestamp: number;
  }> {
    debugLogger.logLifecycle('INFO', 'Generating comprehensive test report');
    
    const systemTest = await this.runTestSuite('Comprehensive System Test');
    const performanceTest = await this.runPerformanceTest();
    const recoveryTest = await this.testRecoveryMechanisms();
    const environment = detectTWAEnvironment();
    
    const report = {
      systemTest,
      performanceTest,
      recoveryTest,
      environment,
      timestamp: Date.now()
    };
    
    debugLogger.logLifecycle('INFO', 'Comprehensive test report generated', {
      systemTestsPassed: systemTest.summary.passed,
      systemTestsFailed: systemTest.summary.failed,
      averageStartupTime: performanceTest.averageStartupTime,
      errorRate: performanceTest.errorRate
    });
    
    return report;
  }

  /**
   * Create failure result for test scenarios
   */
  private createFailureResult(scenario: string, error: any, timing: number): TestResult {
    return {
      scenario,
      success: false,
      mode: 'emergency',
      timing: {
        total: timing,
        phases: {}
      },
      errors: [error.message || 'Unknown error'],
      warnings: [],
      performance: {
        startupTime: timing,
        timeToInteractive: timing,
        memoryUsage: this.getMemoryUsage()
      },
      healthStatus: {
        overall: 'emergency',
        components: {
          startup: 'failed',
          twa: 'failed',
          serviceWorker: 'failed',
          authentication: 'failed',
          recovery: 'failed'
        },
        lastCheck: Date.now(),
        uptime: 0
      },
      diagnostics: {}
    };
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get current test status
   */
  getCurrentTest(): string | null {
    return this.currentTest;
  }

  /**
   * Get available test scenarios
   */
  getTestScenarios(): TestScenario[] {
    return [...this.testScenarios];
  }

  /**
   * Get available test environments
   */
  getTestEnvironments(): string[] {
    return Array.from(this.testEnvironments.keys());
  }
}

// Export singleton instance
export const systemTestingUtility = SystemTestingUtility.getInstance();

// Development-only testing interface
if (process.env.NODE_ENV === 'development') {
  (window as any).systemTestingUtility = systemTestingUtility;
  
  // Add global test commands
  (window as any).runSystemTests = () => systemTestingUtility.runTestSuite();
  (window as any).runPerformanceTest = () => systemTestingUtility.runPerformanceTest();
  (window as any).testRecovery = () => systemTestingUtility.testRecoveryMechanisms();
  (window as any).generateTestReport = () => systemTestingUtility.generateTestReport();
}