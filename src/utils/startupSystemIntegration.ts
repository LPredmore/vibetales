/**
 * Startup System Integration
 * 
 * Integrates all startup components into a cohesive system with
 * unified error handling, recovery coordination, and system-wide monitoring.
 * 
 * Requirements: 1.1, 1.2, 1.5, 3.1, 3.2
 */

import { startupOrchestrator, StartupResult } from './startupOrchestrator';
import { 
  detectTWAEnvironment, 
  initializeTWAOptimized, 
  setupManifestMonitoring,
  optimizeWebViewSettings,
  TWAEnvironment,
  TWAInitializationResult
} from './twaDetection';
import { serviceWorkerManager } from './serviceWorkerManager';
import { authRecoverySystem } from './authRecoverySystem';
import { emergencyDiagnosticReporter } from './emergencyDiagnosticReporter';
import { recoveryActionSystem } from './recoveryActionSystem';
import { healthMonitor, ComponentStatus } from './healthMonitoring';
import { diagnosticCollector } from './diagnosticDataCollector';
import { debugLogger } from './debugLogger';
import { StartupPhase, ErrorSeverity } from './startupErrorDetection';

export interface SystemIntegrationResult {
  success: boolean;
  mode: 'full' | 'limited' | 'offline' | 'recovery' | 'emergency';
  environment: TWAEnvironment;
  startupResult: StartupResult;
  twaResult?: TWAInitializationResult;
  timing: {
    total: number;
    phases: Record<string, number>;
  };
  errors: string[];
  warnings: string[];
  recoveryActions?: string[];
  diagnostics?: any;
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical' | 'emergency';
  components: {
    startup: 'healthy' | 'degraded' | 'failed';
    twa: 'healthy' | 'degraded' | 'failed' | 'not-applicable';
    serviceWorker: 'healthy' | 'degraded' | 'failed';
    authentication: 'healthy' | 'degraded' | 'failed';
    recovery: 'ready' | 'active' | 'failed';
  };
  lastCheck: number;
  uptime: number;
}

export interface RecoveryCoordination {
  trigger: 'timeout' | 'error' | 'health-check' | 'manual';
  strategy: 'automatic' | 'guided' | 'emergency';
  actions: string[];
  success: boolean;
  timing: number;
}

class StartupSystemIntegration {
  private static instance: StartupSystemIntegration;
  private initialized = false;
  private startTime = Date.now();
  private systemHealth: SystemHealthStatus;
  private recoveryInProgress = false;
  private monitoringInterval?: number;

  static getInstance(): StartupSystemIntegration {
    if (!StartupSystemIntegration.instance) {
      StartupSystemIntegration.instance = new StartupSystemIntegration();
    }
    return StartupSystemIntegration.instance;
  }

  constructor() {
    this.systemHealth = {
      overall: 'healthy',
      components: {
        startup: 'healthy',
        twa: 'not-applicable',
        serviceWorker: 'healthy',
        authentication: 'healthy',
        recovery: 'ready'
      },
      lastCheck: Date.now(),
      uptime: 0
    };

    this.setupGlobalErrorHandlers();
    this.setupRecoveryCoordination();
  }

  /**
   * Initialize the complete startup system with all components
   */
  async initializeSystem(): Promise<SystemIntegrationResult> {
    if (this.initialized) {
      return this.createSuccessResult();
    }

    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const phaseTimings: Record<string, number> = {};

    try {
      debugLogger.logLifecycle('INFO', 'Starting integrated startup system initialization');

      // Phase 1: Environment Detection and TWA Initialization
      const envStartTime = Date.now();
      const environment = detectTWAEnvironment();
      phaseTimings.environmentDetection = Date.now() - envStartTime;

      debugLogger.logLifecycle('INFO', 'Environment detected', {
        isTWA: environment.isTWA,
        isPWA: environment.isPWA,
        confidence: environment.confidence,
        methods: environment.detectionMethods
      });

      let twaResult: TWAInitializationResult | undefined;
      if (environment.isTWA) {
        const twaStartTime = Date.now();
        try {
          twaResult = await initializeTWAOptimized();
          phaseTimings.twaInitialization = Date.now() - twaStartTime;
          
          if (twaResult.success) {
            this.systemHealth.components.twa = 'healthy';
            
            // Setup TWA-specific monitoring
            setupManifestMonitoring();
            await optimizeWebViewSettings();
          } else {
            this.systemHealth.components.twa = 'degraded';
            warnings.push('TWA initialization completed with warnings');
          }
        } catch (twaError) {
          phaseTimings.twaInitialization = Date.now() - twaStartTime;
          this.systemHealth.components.twa = 'failed';
          errors.push(`TWA initialization failed: ${twaError.message}`);
          debugLogger.logError('ERROR', 'TWA initialization failed', twaError);
        }
      }

      // Phase 2: Startup Orchestrator Initialization
      const startupStartTime = Date.now();
      let startupResult: StartupResult;
      
      try {
        startupResult = await startupOrchestrator.initialize();
        phaseTimings.startupOrchestrator = Date.now() - startupStartTime;
        
        if (startupResult.success) {
          this.systemHealth.components.startup = 'healthy';
        } else {
          this.systemHealth.components.startup = 'degraded';
          errors.push(...startupResult.errors.map(e => e.message));
        }
      } catch (startupError) {
        phaseTimings.startupOrchestrator = Date.now() - startupStartTime;
        this.systemHealth.components.startup = 'failed';
        errors.push(`Startup orchestrator failed: ${startupError.message}`);
        
        // Create fallback result
        startupResult = {
          success: false,
          mode: 'recovery',
          errors: [],
          timing: { 
            startupTime: 0, 
            phaseTimings: {} as Record<StartupPhase, number>, 
            totalInitializationTime: 0, 
            criticalPathTime: 0 
          },
          completedPhases: [],
          failedPhases: []
        };
      }

      // Phase 3: Component Health Assessment
      const healthStartTime = Date.now();
      await this.assessComponentHealth();
      phaseTimings.healthAssessment = Date.now() - healthStartTime;

      // Phase 4: System-wide Monitoring Setup
      const monitoringStartTime = Date.now();
      this.setupSystemMonitoring();
      phaseTimings.monitoringSetup = Date.now() - monitoringStartTime;

      // Phase 5: Recovery System Preparation
      const recoveryStartTime = Date.now();
      this.prepareRecoverySystem();
      phaseTimings.recoveryPreparation = Date.now() - recoveryStartTime;

      // Determine overall system mode
      const mode = this.determineSystemMode(startupResult, twaResult, errors.length);
      
      // Update overall health status
      this.updateOverallHealth();

      const totalTiming = Date.now() - startTime;
      this.initialized = true;

      debugLogger.logLifecycle('INFO', 'Integrated startup system initialization completed', {
        mode,
        totalTiming,
        errors: errors.length,
        warnings: warnings.length,
        health: this.systemHealth.overall
      });

      return {
        success: mode !== 'emergency',
        mode,
        environment,
        startupResult,
        twaResult,
        timing: {
          total: totalTiming,
          phases: phaseTimings
        },
        errors,
        warnings
      };

    } catch (error) {
      const totalTiming = Date.now() - startTime;
      errors.push(`System initialization failed: ${error.message}`);
      
      debugLogger.logError('CRITICAL', 'System initialization failed', error);
      
      // Trigger emergency recovery
      await this.triggerEmergencyRecovery('error');

      return {
        success: false,
        mode: 'emergency',
        environment: detectTWAEnvironment(),
        startupResult: {
          success: false,
          mode: 'recovery',
          errors: [],
          timing: { 
            startupTime: 0, 
            phaseTimings: {} as Record<StartupPhase, number>, 
            totalInitializationTime: 0, 
            criticalPathTime: 0 
          },
          completedPhases: [],
          failedPhases: []
        },
        timing: {
          total: totalTiming,
          phases: phaseTimings
        },
        errors,
        warnings
      };
    }
  }

  /**
   * Assess health of all system components
   */
  private async assessComponentHealth(): Promise<void> {
    try {
      // Check startup orchestrator health
      const startupHealth = await startupOrchestrator.getHealthStatus();
      this.systemHealth.components.startup = startupHealth.overall === ComponentStatus.HEALTHY ? 'healthy' : 'degraded';

      // Check service worker health
      const swStatus = await serviceWorkerManager.getStatus();
      this.systemHealth.components.serviceWorker = swStatus.active ? 'healthy' : 'degraded';

      // Check authentication health
      const authValidation = await authRecoverySystem.validateAuthState();
      this.systemHealth.components.authentication = authValidation.isValid ? 'healthy' : 'degraded';

      // Check recovery system readiness
      this.systemHealth.components.recovery = this.recoveryInProgress ? 'active' : 'ready';

      debugLogger.logLifecycle('INFO', 'Component health assessment completed', this.systemHealth.components);

    } catch (error) {
      debugLogger.logError('ERROR', 'Component health assessment failed', error);
      this.systemHealth.overall = 'critical';
    }
  }

  /**
   * Setup system-wide monitoring and health checks
   */
  private setupSystemMonitoring(): void {
    try {
      // Start health monitoring
      healthMonitor.startMonitoring();

      // Setup periodic health checks
      this.monitoringInterval = window.setInterval(async () => {
        await this.performHealthCheck();
      }, 30000); // Check every 30 seconds

      // Listen for component health changes
      window.addEventListener('component-health-changed', this.handleHealthChange.bind(this));
      
      // Listen for critical errors
      window.addEventListener('startup-error-escalated', this.handleCriticalError.bind(this));

      debugLogger.logLifecycle('INFO', 'System monitoring setup completed');

    } catch (error) {
      debugLogger.logError('ERROR', 'System monitoring setup failed', error);
    }
  }

  /**
   * Prepare recovery system for potential failures
   */
  private prepareRecoverySystem(): void {
    try {
      // Recovery systems are already initialized on import
      // No explicit initialization needed

      // Prepare emergency recovery interface
      this.setupEmergencyRecoveryTriggers();

      debugLogger.logLifecycle('INFO', 'Recovery system preparation completed');

    } catch (error) {
      debugLogger.logError('ERROR', 'Recovery system preparation failed', error);
    }
  }

  /**
   * Setup emergency recovery triggers
   */
  private setupEmergencyRecoveryTriggers(): void {
    // Timeout-based trigger (5 seconds for emergency mode)
    setTimeout(() => {
      if (!this.initialized) {
        debugLogger.logError('CRITICAL', 'Startup timeout - triggering emergency recovery');
        this.triggerEmergencyRecovery('timeout');
      }
    }, 5000);

    // Listen for manual emergency activation
    window.addEventListener('activate-emergency-mode', () => {
      this.triggerEmergencyRecovery('manual');
    });

    // Listen for health-based triggers
    window.addEventListener('health-recovery-triggered', () => {
      this.triggerEmergencyRecovery('health-check');
    });
  }

  /**
   * Setup global error handlers for system-wide coordination
   */
  private setupGlobalErrorHandlers(): void {
    // Enhanced error handler
    const originalErrorHandler = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      debugLogger.logError('ERROR', 'Global error caught by integration system', {
        message, source, lineno, colno, error
      });

      // Check if this is a critical error that requires recovery
      if (this.isCriticalError(error)) {
        this.triggerEmergencyRecovery('error');
      }

      // Call original handler
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      return false;
    };

    // Enhanced promise rejection handler
    const originalRejectionHandler = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      debugLogger.logError('ERROR', 'Unhandled promise rejection caught by integration system', {
        reason: event.reason
      });

      // Check if this requires recovery
      if (this.isCriticalError(event.reason)) {
        this.triggerEmergencyRecovery('error');
      }

      // Call original handler
      if (originalRejectionHandler) {
        return originalRejectionHandler.call(window, event);
      }
    };
  }

  /**
   * Setup recovery coordination between components
   */
  private setupRecoveryCoordination(): void {
    // Listen for recovery requests from individual components
    window.addEventListener('request-system-recovery', async (event: any) => {
      const { component, reason, severity } = event.detail;
      
      debugLogger.logLifecycle('WARN', `Recovery requested by ${component}`, { reason, severity });
      
      if (severity === 'critical') {
        await this.triggerEmergencyRecovery('error');
      } else {
        await this.coordinateComponentRecovery(component, reason);
      }
    });
  }

  /**
   * Coordinate recovery for specific components
   */
  private async coordinateComponentRecovery(component: string, reason: string): Promise<void> {
    if (this.recoveryInProgress) {
      debugLogger.logLifecycle('WARN', 'Recovery already in progress, queuing request', { component, reason });
      return;
    }

    this.recoveryInProgress = true;
    this.systemHealth.components.recovery = 'active';

    try {
      debugLogger.logLifecycle('INFO', `Starting coordinated recovery for ${component}`, { reason });

      switch (component) {
        case 'startup-orchestrator':
          await this.recoverStartupOrchestrator();
          break;
        case 'service-worker':
          await this.recoverServiceWorker();
          break;
        case 'authentication':
          await this.recoverAuthentication();
          break;
        case 'twa-container':
          await this.recoverTWAContainer();
          break;
        default:
          debugLogger.logLifecycle('WARN', `Unknown component recovery requested: ${component}`);
      }

      // Re-assess system health after recovery
      await this.assessComponentHealth();
      this.updateOverallHealth();

      debugLogger.logLifecycle('INFO', `Coordinated recovery completed for ${component}`);

    } catch (error) {
      debugLogger.logError('ERROR', `Coordinated recovery failed for ${component}`, error);
      
      // If component recovery fails, escalate to emergency recovery
      await this.triggerEmergencyRecovery('error');
    } finally {
      this.recoveryInProgress = false;
      this.systemHealth.components.recovery = 'ready';
    }
  }

  /**
   * Recover startup orchestrator
   */
  private async recoverStartupOrchestrator(): Promise<void> {
    try {
      // Attempt to reinitialize the orchestrator
      const result = await startupOrchestrator.initialize();
      
      if (result.success) {
        this.systemHealth.components.startup = 'healthy';
        debugLogger.logLifecycle('INFO', 'Startup orchestrator recovery successful');
      } else {
        this.systemHealth.components.startup = 'degraded';
        debugLogger.logLifecycle('WARN', 'Startup orchestrator recovery partial');
      }
    } catch (error) {
      this.systemHealth.components.startup = 'failed';
      throw error;
    }
  }

  /**
   * Recover service worker
   */
  private async recoverServiceWorker(): Promise<void> {
    try {
      // Attempt progressive re-registration
      const result = await serviceWorkerManager.registerProgressively();
      
      if (result.success) {
        this.systemHealth.components.serviceWorker = 'healthy';
        debugLogger.logLifecycle('INFO', 'Service worker recovery successful');
      } else {
        this.systemHealth.components.serviceWorker = 'degraded';
        debugLogger.logLifecycle('WARN', 'Service worker recovery failed, continuing without SW');
      }
    } catch (error) {
      this.systemHealth.components.serviceWorker = 'failed';
      debugLogger.logLifecycle('WARN', 'Service worker recovery failed', error);
      // Don't throw - app can continue without service worker
    }
  }

  /**
   * Recover authentication system
   */
  private async recoverAuthentication(): Promise<void> {
    try {
      // Attempt session recovery
      const result = await authRecoverySystem.attemptSessionRecovery({
        enableRetry: true,
        maxRetries: 2,
        fallbackToGuest: true,
        validateIntegrity: true
      });
      
      if (result.success) {
        this.systemHealth.components.authentication = result.mode === 'full' ? 'healthy' : 'degraded';
        debugLogger.logLifecycle('INFO', 'Authentication recovery successful', { mode: result.mode });
      } else {
        this.systemHealth.components.authentication = 'degraded';
        debugLogger.logLifecycle('WARN', 'Authentication recovery failed, using guest mode');
      }
    } catch (error) {
      this.systemHealth.components.authentication = 'failed';
      throw error;
    }
  }

  /**
   * Recover TWA container
   */
  private async recoverTWAContainer(): Promise<void> {
    try {
      const environment = detectTWAEnvironment();
      
      if (environment.isTWA) {
        // Attempt TWA re-initialization
        const result = await initializeTWAOptimized();
        
        if (result.success) {
          this.systemHealth.components.twa = 'healthy';
          debugLogger.logLifecycle('INFO', 'TWA container recovery successful');
        } else {
          this.systemHealth.components.twa = 'degraded';
          debugLogger.logLifecycle('WARN', 'TWA container recovery partial');
        }
      } else {
        this.systemHealth.components.twa = 'not-applicable';
      }
    } catch (error) {
      this.systemHealth.components.twa = 'failed';
      throw error;
    }
  }

  /**
   * Trigger emergency recovery mode
   */
  async triggerEmergencyRecovery(trigger: 'timeout' | 'error' | 'health-check' | 'manual'): Promise<RecoveryCoordination> {
    const startTime = Date.now();
    
    debugLogger.logError('CRITICAL', `Emergency recovery triggered: ${trigger}`);
    
    this.systemHealth.overall = 'emergency';
    this.systemHealth.components.recovery = 'active';

    try {
      // Generate comprehensive diagnostic report
      const diagnostics = await diagnosticCollector.generateDiagnosticReport();
      
      // Activate emergency recovery interface
      window.dispatchEvent(new CustomEvent('activate-emergency-recovery', {
        detail: {
          trigger,
          diagnostics,
          systemHealth: this.systemHealth,
          timestamp: Date.now()
        }
      }));

      // Attempt automatic recovery actions based on trigger
      const actions = await this.executeEmergencyActions(trigger);

      return {
        trigger,
        strategy: 'emergency',
        actions,
        success: true,
        timing: Date.now() - startTime
      };

    } catch (error) {
      debugLogger.logError('CRITICAL', 'Emergency recovery failed', error);
      
      return {
        trigger,
        strategy: 'emergency',
        actions: ['emergency-recovery-failed'],
        success: false,
        timing: Date.now() - startTime
      };
    }
  }

  /**
   * Execute emergency recovery actions
   */
  private async executeEmergencyActions(trigger: string): Promise<string[]> {
    const actions: string[] = [];

    try {
      // Action 1: Clear problematic caches
      if (trigger === 'timeout' || trigger === 'error') {
        localStorage.setItem('emergency-mode', 'true');
        actions.push('emergency-mode-enabled');
      }

      // Action 2: Disable service worker if it's causing issues
      if (this.systemHealth.components.serviceWorker === 'failed') {
        localStorage.setItem('disable-service-worker', 'true');
        actions.push('service-worker-disabled');
      }

      // Action 3: Enable safe mode
      localStorage.setItem('safe-mode', 'true');
      actions.push('safe-mode-enabled');

      // Action 4: Generate diagnostic report
      const report = await emergencyDiagnosticReporter.generateEmergencyReport();
      if (report) {
        actions.push('diagnostic-report-generated');
      }

      return actions;

    } catch (error) {
      debugLogger.logError('ERROR', 'Emergency actions execution failed', error);
      return actions;
    }
  }

  /**
   * Perform periodic health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      await this.assessComponentHealth();
      this.updateOverallHealth();
      this.systemHealth.lastCheck = Date.now();
      this.systemHealth.uptime = Date.now() - this.startTime;

      // Check for degraded components that need attention
      const degradedComponents = Object.entries(this.systemHealth.components)
        .filter(([_, status]) => status === 'degraded' || status === 'failed')
        .map(([component, _]) => component);

      if (degradedComponents.length > 0) {
        debugLogger.logLifecycle('WARN', 'Health check found degraded components', {
          components: degradedComponents,
          overall: this.systemHealth.overall
        });

        // Trigger recovery for failed components
        for (const component of degradedComponents) {
          if (this.systemHealth.components[component as keyof typeof this.systemHealth.components] === 'failed') {
            await this.coordinateComponentRecovery(component, 'health-check-failure');
          }
        }
      }

    } catch (error) {
      debugLogger.logError('ERROR', 'Health check failed', error);
      this.systemHealth.overall = 'critical';
    }
  }

  /**
   * Handle component health changes
   */
  private handleHealthChange(event: any): void {
    const { component, status, details } = event.detail;
    
    debugLogger.logLifecycle('INFO', `Component health changed: ${component} -> ${status}`, details);
    
    // Update component status
    if (component in this.systemHealth.components) {
      this.systemHealth.components[component as keyof typeof this.systemHealth.components] = status;
    }
    
    // Update overall health
    this.updateOverallHealth();
    
    // Trigger recovery if component failed
    if (status === 'failed') {
      this.coordinateComponentRecovery(component, 'health-change-failure');
    }
  }

  /**
   * Handle critical errors
   */
  private handleCriticalError(event: any): void {
    const error = event.detail;
    
    debugLogger.logError('CRITICAL', 'Critical error handled by integration system', error);
    
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.triggerEmergencyRecovery('error');
    }
  }

  /**
   * Determine if an error is critical
   */
  private isCriticalError(error: any): boolean {
    if (!error) return false;
    
    const criticalMessages = [
      'ChunkLoadError',
      'Loading chunk',
      'Script error',
      'Network error',
      'Failed to fetch'
    ];
    
    const errorMessage = error.message || error.toString();
    return criticalMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Determine overall system mode
   */
  private determineSystemMode(
    startupResult: StartupResult, 
    twaResult?: TWAInitializationResult, 
    errorCount: number = 0
  ): 'full' | 'limited' | 'offline' | 'recovery' | 'emergency' {
    
    if (errorCount > 2 || !startupResult.success) {
      return 'emergency';
    }
    
    if (startupResult.mode === 'recovery') {
      return 'recovery';
    }
    
    if (startupResult.mode === 'offline') {
      return 'offline';
    }
    
    if (startupResult.mode === 'limited' || twaResult?.mode === 'twa-fallback') {
      return 'limited';
    }
    
    return 'full';
  }

  /**
   * Update overall health status based on components
   */
  private updateOverallHealth(): void {
    const components = this.systemHealth.components;
    
    // Count failed and degraded components
    const failedCount = Object.values(components).filter(status => status === 'failed').length;
    const degradedCount = Object.values(components).filter(status => status === 'degraded').length;
    
    if (failedCount > 1 || components.startup === 'failed') {
      this.systemHealth.overall = 'emergency';
    } else if (failedCount > 0 || degradedCount > 2) {
      this.systemHealth.overall = 'critical';
    } else if (degradedCount > 0) {
      this.systemHealth.overall = 'degraded';
    } else {
      this.systemHealth.overall = 'healthy';
    }
  }

  /**
   * Create success result for already initialized system
   */
  private createSuccessResult(): SystemIntegrationResult {
    return {
      success: true,
      mode: 'full',
      environment: detectTWAEnvironment(),
      startupResult: {
        success: true,
        mode: 'full',
        errors: [],
        timing: { 
          startupTime: 0, 
          phaseTimings: {} as Record<StartupPhase, number>, 
          totalInitializationTime: 0, 
          criticalPathTime: 0 
        },
        completedPhases: [],
        failedPhases: []
      },
      timing: {
        total: 0,
        phases: {}
      },
      errors: [],
      warnings: []
    };
  }

  // Public API methods
  
  /**
   * Get current system health status
   */
  getSystemHealth(): SystemHealthStatus {
    return { ...this.systemHealth };
  }

  /**
   * Get system diagnostics
   */
  async getSystemDiagnostics(): Promise<any> {
    return await startupOrchestrator.generateEnhancedDiagnosticReport();
  }

  /**
   * Manual recovery trigger
   */
  async triggerManualRecovery(): Promise<RecoveryCoordination> {
    return await this.triggerEmergencyRecovery('manual');
  }

  /**
   * Check if system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Cleanup system monitoring
   */
  cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Cleanup individual components
    healthMonitor.stopMonitoring();
    
    debugLogger.logLifecycle('INFO', 'Startup system integration cleanup completed');
  }
}

// Export singleton instance
export const startupSystemIntegration = StartupSystemIntegration.getInstance();