/**
 * Progressive Startup Orchestrator
 * 
 * Coordinates all initialization phases with fallback strategies,
 * progressive loading, and automatic recovery mechanisms.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { startupErrorDetector, StartupPhase, ErrorSeverity, StartupError, ErrorCategory } from './startupErrorDetection';
import { healthMonitor, ComponentStatus, AppComponent } from './healthMonitoring';
import { diagnosticCollector } from './diagnosticDataCollector';
import { debugLogger } from './debugLogger';
import { 
  progressiveLoadingManager, 
  ResourceRequest, 
  ResourcePriority, 
  NetworkQuality 
} from './progressiveLoadingStrategies';
import { serviceWorkerManager } from './serviceWorkerManager';
import { serviceWorkerFailureHandler } from './serviceWorkerFailureHandler';
import { simplifiedCacheManager } from './simplifiedCacheManager';
import { 
  initializationPhaseManager, 
  PhaseStatus 
} from './initializationPhaseManager';
import { startupPerformanceOptimizer } from './startupPerformanceOptimizer';
import { performanceMonitoringSystem } from './performanceMonitoringSystem';
import { performanceMetricsCollector } from './performanceMetricsCollector';

export interface StartupResult {
  success: boolean;
  mode: 'full' | 'limited' | 'offline' | 'recovery';
  errors: StartupError[];
  timing: PerformanceMetrics;
  diagnostics?: any;
  completedPhases: StartupPhase[];
  failedPhases: StartupPhase[];
}

export interface PerformanceMetrics {
  startupTime: number;
  phaseTimings: Record<StartupPhase, number>;
  totalInitializationTime: number;
  timeToInteractive?: number;
  criticalPathTime: number;
}

export interface InitializationPhase {
  phase: StartupPhase;
  name: string;
  critical: boolean;
  dependencies: StartupPhase[];
  timeout: number;
  retryCount: number;
  fallbackStrategy?: FallbackStrategy;
  execute: () => Promise<PhaseResult>;
}

export interface PhaseResult {
  success: boolean;
  mode: 'full' | 'limited' | 'degraded';
  errors: StartupError[];
  timing: number;
  metadata?: Record<string, any>;
}

export enum FallbackStrategy {
  RETRY_WITH_BACKOFF = 'retry_backoff',
  SKIP_PHASE = 'skip_phase',
  DEGRADED_MODE = 'degraded_mode',
  EMERGENCY_RECOVERY = 'emergency_recovery'
}

class StartupOrchestrator {
  private startTime = Date.now();
  private initialized = false;
  private currentPhase: StartupPhase = StartupPhase.INITIAL_LOAD;
  private completedPhases: Set<StartupPhase> = new Set();
  private failedPhases: Set<StartupPhase> = new Set();
  private phaseTimings: Map<StartupPhase, number> = new Map();
  private initializationPhases: Map<StartupPhase, InitializationPhase> = new Map();
  private fallbackStrategies: Map<StartupPhase, FallbackStrategy> = new Map();

  constructor() {
    this.setupInitializationPhases();
    this.setupFallbackStrategies();
  }

  private setupInitializationPhases() {
    // Define all initialization phases with dependencies and configurations
    const phases: InitializationPhase[] = [
      {
        phase: StartupPhase.INITIAL_LOAD,
        name: 'Initial Load',
        critical: true,
        dependencies: [],
        timeout: 3000,
        retryCount: 2,
        execute: () => this.executeInitialLoad()
      },
      {
        phase: StartupPhase.SCRIPT_LOADING,
        name: 'Script Loading',
        critical: true,
        dependencies: [StartupPhase.INITIAL_LOAD],
        timeout: 5000,
        retryCount: 3,
        execute: () => this.executeScriptLoading()
      },
      {
        phase: StartupPhase.SERVICE_WORKER_INIT,
        name: 'Service Worker Initialization',
        critical: false,
        dependencies: [StartupPhase.SCRIPT_LOADING],
        timeout: 4000,
        retryCount: 2,
        fallbackStrategy: FallbackStrategy.DEGRADED_MODE,
        execute: () => this.executeServiceWorkerInit()
      },
      {
        phase: StartupPhase.AUTH_INIT,
        name: 'Authentication Initialization',
        critical: false,
        dependencies: [StartupPhase.SCRIPT_LOADING],
        timeout: 6000,
        retryCount: 3,
        fallbackStrategy: FallbackStrategy.DEGRADED_MODE,
        execute: () => this.executeAuthInit()
      },
      {
        phase: StartupPhase.REACT_MOUNT,
        name: 'React Application Mount',
        critical: true,
        dependencies: [StartupPhase.SCRIPT_LOADING],
        timeout: 8000,
        retryCount: 2,
        execute: () => this.executeReactMount()
      },
      {
        phase: StartupPhase.APP_READY,
        name: 'Application Ready',
        critical: true,
        dependencies: [StartupPhase.REACT_MOUNT],
        timeout: 2000,
        retryCount: 1,
        execute: () => this.executeAppReady()
      }
    ];

    phases.forEach(phase => {
      this.initializationPhases.set(phase.phase, phase);
    });
  }

  private setupFallbackStrategies() {
    // Configure fallback strategies for different failure scenarios
    this.fallbackStrategies.set(StartupPhase.SERVICE_WORKER_INIT, FallbackStrategy.DEGRADED_MODE);
    this.fallbackStrategies.set(StartupPhase.AUTH_INIT, FallbackStrategy.DEGRADED_MODE);
    this.fallbackStrategies.set(StartupPhase.INITIAL_LOAD, FallbackStrategy.EMERGENCY_RECOVERY);
    this.fallbackStrategies.set(StartupPhase.REACT_MOUNT, FallbackStrategy.EMERGENCY_RECOVERY);
  }

  async initialize(): Promise<StartupResult> {
    if (this.initialized) {
      return this.createSuccessResult();
    }

    try {
      debugLogger.logLifecycle('INFO', 'Progressive startup orchestrator initializing');
      
      // Start performance monitoring and optimization
      startupPerformanceOptimizer.startTimingAnalysis();
      performanceMonitoringSystem.startMonitoring();
      performanceMetricsCollector.startCollection();
      
      // Start health monitoring
      healthMonitor.startMonitoring();
      
      // Setup error handlers
      this.setupErrorHandlers();
      
      // Execute initialization phases in dependency order
      const result = await this.executeInitializationSequence();
      
      // Record initialization attempt for monitoring
      performanceMonitoringSystem.recordInitializationAttempt(
        result.success,
        result.timing.totalInitializationTime,
        this.currentPhase,
        result.errors.map(e => e.message)
      );
      
      this.initialized = true;
      
      debugLogger.logLifecycle('INFO', 'Startup orchestrator initialization complete', {
        success: result.success,
        mode: result.mode,
        completedPhases: result.completedPhases.length,
        failedPhases: result.failedPhases.length,
        totalTime: result.timing.totalInitializationTime
      });
      
      return result;
      
    } catch (error) {
      debugLogger.logError('CRITICAL', 'Startup orchestrator initialization failed', error);
      
      return this.createFailureResult([
        startupErrorDetector.detectError({
          category: ErrorCategory.JAVASCRIPT,
          message: `Orchestrator initialization failed: ${error.message}`,
          originalError: error as Error
        })
      ]);
    }
  }

  private async executeInitializationSequence(): Promise<StartupResult> {
    const errors: StartupError[] = [];
    let currentMode: 'full' | 'limited' | 'offline' | 'recovery' = 'full';
    
    // Get phases in dependency order
    const orderedPhases = this.getPhaseExecutionOrder();
    
    for (const phase of orderedPhases) {
      const phaseConfig = this.initializationPhases.get(phase)!;
      
      // Start phase using phase manager
      const canStart = await initializationPhaseManager.startPhase(phase);
      if (!canStart) {
        debugLogger.logLifecycle('WARN', `Cannot start phase ${phase} - dependencies not satisfied`);
        this.failedPhases.add(phase);
        continue;
      }
      
      // Execute phase with retry logic and phase management
      const result = await this.executePhaseWithRetry(phaseConfig);
      
      // Complete phase using phase manager
      await initializationPhaseManager.completePhase(
        phase, 
        result.success, 
        result.errors, 
        result.metadata || {}
      );
      
      if (result.success) {
        this.completedPhases.add(phase);
        this.phaseTimings.set(phase, result.timing);
        
        // Update mode based on phase result
        if (result.mode === 'limited' && currentMode === 'full') {
          currentMode = 'limited';
        } else if (result.mode === 'degraded' && currentMode === 'full') {
          currentMode = 'limited';
        }
      } else {
        this.failedPhases.add(phase);
        errors.push(...result.errors);
        
        // Check if phase manager handled recovery
        const phaseStatus = initializationPhaseManager.getPhaseStatus(phase);
        
        if (phaseStatus === PhaseStatus.SKIPPED) {
          debugLogger.logLifecycle('INFO', `Phase ${phase} was skipped by recovery strategy`);
          currentMode = 'limited';
          continue;
        }
        
        // Apply fallback strategy if phase manager didn't handle it
        const fallbackResult = await this.applyFallbackStrategy(phaseConfig, result);
        if (fallbackResult.mode === 'recovery') {
          currentMode = 'recovery';
          
          // Attempt rollback to last stable state
          const rollbackSuccess = await this.attemptRollback(phase);
          if (!rollbackSuccess) {
            debugLogger.logError('CRITICAL', 'Rollback failed - system in unstable state');
          }
          
          break; // Stop execution for critical failures
        } else if (fallbackResult.mode === 'limited') {
          currentMode = 'limited';
        }
      }
      
      // Update current phase for error context
      this.currentPhase = phase;
      startupErrorDetector.setCurrentPhase(phase);
    }
    
    return {
      success: currentMode !== 'recovery',
      mode: currentMode,
      errors,
      timing: this.calculatePerformanceMetrics(),
      completedPhases: Array.from(this.completedPhases),
      failedPhases: Array.from(this.failedPhases)
    };
  }

  private async attemptRollback(failedPhase: StartupPhase): Promise<boolean> {
    debugLogger.logLifecycle('WARN', `Attempting rollback due to critical failure in ${failedPhase}`);
    
    try {
      // Find the last stable phase to rollback to
      const completedPhases = initializationPhaseManager.getCompletedPhases();
      
      if (completedPhases.length === 0) {
        debugLogger.logLifecycle('WARN', 'No completed phases to rollback to');
        return false;
      }
      
      // Rollback to the last completed phase
      const lastStablePhase = completedPhases[completedPhases.length - 1];
      const rollbackSuccess = await initializationPhaseManager.rollbackToPhase(lastStablePhase);
      
      if (rollbackSuccess) {
        debugLogger.logLifecycle('INFO', `Successfully rolled back to ${lastStablePhase}`);
        
        // Update our internal state
        this.completedPhases.clear();
        completedPhases.forEach(phase => this.completedPhases.add(phase));
        
        return true;
      } else {
        debugLogger.logError('ERROR', `Failed to rollback to ${lastStablePhase}`);
        return false;
      }
      
    } catch (error) {
      debugLogger.logError('ERROR', 'Rollback attempt failed', error);
      return false;
    }
  }

  private getPhaseExecutionOrder(): StartupPhase[] {
    const phases = Array.from(this.initializationPhases.keys());
    const visited = new Set<StartupPhase>();
    const result: StartupPhase[] = [];
    
    const visit = (phase: StartupPhase) => {
      if (visited.has(phase)) return;
      visited.add(phase);
      
      const config = this.initializationPhases.get(phase)!;
      config.dependencies.forEach(dep => visit(dep));
      result.push(phase);
    };
    
    phases.forEach(phase => visit(phase));
    return result;
  }

  private areDependenciesSatisfied(dependencies: StartupPhase[]): boolean {
    return dependencies.every(dep => this.completedPhases.has(dep));
  }

  private async executePhaseWithRetry(phaseConfig: InitializationPhase): Promise<PhaseResult> {
    let lastResult: PhaseResult | null = null;
    
    // Start performance tracking for this phase
    startupPerformanceOptimizer.recordOperationStart(`phase-${phaseConfig.phase}`, phaseConfig.phase);
    
    for (let attempt = 0; attempt <= phaseConfig.retryCount; attempt++) {
      debugLogger.logLifecycle('INFO', `Executing phase: ${phaseConfig.name} (attempt ${attempt + 1})`);
      
      try {
        const startTime = performance.now();
        
        // Execute with timeout
        const result = await Promise.race([
          phaseConfig.execute(),
          this.createTimeoutPromise(phaseConfig.timeout, phaseConfig.phase)
        ]);
        
        const timing = performance.now() - startTime;
        result.timing = timing;
        
        if (result.success) {
          // Record successful phase completion
          startupPerformanceOptimizer.recordOperationEnd(`phase-${phaseConfig.phase}`, false);
          
          debugLogger.logLifecycle('INFO', `Phase ${phaseConfig.name} completed successfully`, {
            timing: `${timing.toFixed(2)}ms`,
            mode: result.mode
          });
          return result;
        }
        
        lastResult = result;
        
        if (attempt < phaseConfig.retryCount) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 5000);
          debugLogger.logLifecycle('WARN', `Phase ${phaseConfig.name} failed, retrying in ${backoffDelay}ms`);
          await this.delay(backoffDelay);
        }
        
      } catch (error) {
        const timing = performance.now() - (performance.now() - phaseConfig.timeout);
        lastResult = {
          success: false,
          mode: 'degraded',
          errors: [startupErrorDetector.detectError({
            message: `Phase ${phaseConfig.name} execution error: ${error.message}`,
            originalError: error as Error
          })],
          timing
        };
      }
    }
    
    // Record failed phase completion
    startupPerformanceOptimizer.recordOperationEnd(`phase-${phaseConfig.phase}`, false);
    
    debugLogger.logLifecycle('ERROR', `Phase ${phaseConfig.name} failed after ${phaseConfig.retryCount + 1} attempts`);
    return lastResult!;
  }

  private async createTimeoutPromise(timeout: number, phase: StartupPhase): Promise<PhaseResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Phase ${phase} timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  private async applyFallbackStrategy(
    phaseConfig: InitializationPhase, 
    failureResult: PhaseResult
  ): Promise<{ mode: 'full' | 'limited' | 'recovery' }> {
    const strategy = phaseConfig.fallbackStrategy || this.fallbackStrategies.get(phaseConfig.phase);
    
    if (!strategy) {
      // No fallback strategy - treat as critical failure if phase is critical
      return { mode: phaseConfig.critical ? 'recovery' : 'limited' };
    }
    
    debugLogger.logLifecycle('WARN', `Applying fallback strategy ${strategy} for phase ${phaseConfig.name}`);
    
    switch (strategy) {
      case FallbackStrategy.RETRY_WITH_BACKOFF:
        // Already handled in executePhaseWithRetry
        return { mode: phaseConfig.critical ? 'recovery' : 'limited' };
        
      case FallbackStrategy.SKIP_PHASE:
        debugLogger.logLifecycle('INFO', `Skipping non-critical phase ${phaseConfig.name}`);
        return { mode: 'limited' };
        
      case FallbackStrategy.DEGRADED_MODE:
        debugLogger.logLifecycle('INFO', `Continuing in degraded mode after ${phaseConfig.name} failure`);
        return { mode: 'limited' };
        
      case FallbackStrategy.EMERGENCY_RECOVERY:
        debugLogger.logError('CRITICAL', `Critical phase ${phaseConfig.name} failed - triggering emergency recovery`);
        this.triggerEmergencyRecovery();
        return { mode: 'recovery' };
        
      default:
        return { mode: 'limited' };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculatePerformanceMetrics(): PerformanceMetrics {
    const totalTime = Date.now() - this.startTime;
    const phaseTimings: Record<StartupPhase, number> = {} as Record<StartupPhase, number>;
    
    // Convert phase timings map to record
    for (const [phase, timing] of this.phaseTimings) {
      phaseTimings[phase] = timing;
    }
    
    // Calculate critical path time (sum of critical phases)
    const criticalPathTime = Array.from(this.completedPhases)
      .filter(phase => this.initializationPhases.get(phase)?.critical)
      .reduce((sum, phase) => sum + (this.phaseTimings.get(phase) || 0), 0);
    
    return {
      startupTime: totalTime,
      phaseTimings,
      totalInitializationTime: totalTime,
      criticalPathTime
    };
  }

  private createSuccessResult(): StartupResult {
    return {
      success: true,
      mode: 'full',
      errors: [],
      timing: this.calculatePerformanceMetrics(),
      completedPhases: Array.from(this.completedPhases),
      failedPhases: Array.from(this.failedPhases)
    };
  }

  private createFailureResult(errors: StartupError[]): StartupResult {
    return {
      success: false,
      mode: 'recovery',
      errors,
      timing: this.calculatePerformanceMetrics(),
      completedPhases: Array.from(this.completedPhases),
      failedPhases: Array.from(this.failedPhases)
    };
  }

  // Phase execution methods
  private async executeInitialLoad(): Promise<PhaseResult> {
    try {
      // Verify basic DOM and window objects are available
      if (!document || !window) {
        throw new Error('Basic DOM/Window objects not available');
      }
      
      // Check if root element exists
      const rootElement = document.getElementById('root');
      if (!rootElement) {
        throw new Error('Root element not found');
      }
      
      // Verify essential browser APIs
      const requiredAPIs = ['fetch', 'localStorage', 'sessionStorage'];
      const missingAPIs = requiredAPIs.filter(api => !(api in window));
      
      if (missingAPIs.length > 0) {
        debugLogger.logLifecycle('WARN', `Missing APIs: ${missingAPIs.join(', ')}`);
        return {
          success: true,
          mode: 'limited',
          errors: [],
          timing: 0
        };
      }
      
      return {
        success: true,
        mode: 'full',
        errors: [],
        timing: 0
      };
      
    } catch (error) {
      return {
        success: false,
        mode: 'degraded',
        errors: [startupErrorDetector.detectError({
          message: `Initial load failed: ${error.message}`,
          originalError: error as Error
        })],
        timing: 0
      };
    }
  }

  private async executeScriptLoading(): Promise<PhaseResult> {
    try {
      // Check if React and other essential libraries are loaded
      const hasReact = 'React' in window;
      const hasReactDOM = 'ReactDOM' in window;
      
      if (!hasReact || !hasReactDOM) {
        // Use progressive loading to load essential scripts
        const criticalResources: ResourceRequest[] = [
          {
            id: 'react-bundle',
            url: '/static/js/main.js', // Adjust based on your build output
            priority: ResourcePriority.CRITICAL,
            validator: (response) => response.headers.get('content-type')?.includes('javascript') || false
          }
        ];
        
        const networkQuality = progressiveLoadingManager.getCurrentNetworkQuality();
        
        if (networkQuality === NetworkQuality.OFFLINE) {
          throw new Error('Cannot load essential scripts while offline');
        }
        
        debugLogger.logLifecycle('INFO', 'Loading essential scripts with progressive loading', {
          networkQuality,
          resourceCount: criticalResources.length
        });
        
        const loadingResults = await progressiveLoadingManager.loadWithProgressiveDegradation(criticalResources);
        const criticalFailures = loadingResults.critical.filter(r => !r.success);
        
        if (criticalFailures.length > 0) {
          throw new Error(`Failed to load ${criticalFailures.length} critical scripts`);
        }
      }
      
      // Verify Supabase client is available
      const hasSupabase = window.localStorage.getItem('supabase.auth.token') !== null ||
                         'supabase' in window;
      
      // Load optional resources based on network quality
      const networkQuality = progressiveLoadingManager.getCurrentNetworkQuality();
      let mode: 'full' | 'limited' | 'degraded' = 'full';
      
      if (networkQuality === NetworkQuality.SLOW || networkQuality === NetworkQuality.OFFLINE) {
        mode = 'limited';
        debugLogger.logLifecycle('WARN', 'Using limited mode due to network conditions', { networkQuality });
      } else if (!hasSupabase) {
        mode = 'limited';
        debugLogger.logLifecycle('WARN', 'Using limited mode - Supabase not available');
      }
      
      return {
        success: true,
        mode,
        errors: [],
        timing: 0,
        metadata: {
          hasReact: 'React' in window,
          hasReactDOM: 'ReactDOM' in window,
          hasSupabase,
          networkQuality
        }
      };
      
    } catch (error) {
      return {
        success: false,
        mode: 'degraded',
        errors: [startupErrorDetector.detectError({
          message: `Script loading failed: ${error.message}`,
          originalError: error as Error
        })],
        timing: 0
      };
    }
  }

  private async executeServiceWorkerInit(): Promise<PhaseResult> {
    const startTime = performance.now();
    
    try {
      debugLogger.logLifecycle('INFO', 'Starting progressive service worker initialization');

      // Use the new progressive service worker manager
      const registrationResult = await serviceWorkerManager.registerProgressively();
      
      const timing = performance.now() - startTime;

      if (registrationResult.success) {
        // Start health monitoring for successful registration
        serviceWorkerFailureHandler.startHealthMonitoring();

        // Initialize simplified cache for new installations
        if (registrationResult.mode === 'minimal') {
          await simplifiedCacheManager.initializeMinimalCache();
          
          // Schedule progressive cache enhancement
          setTimeout(async () => {
            await simplifiedCacheManager.enhanceCacheProgressively();
          }, 3000);
        }

        debugLogger.logLifecycle('INFO', 'Service worker initialization completed', {
          mode: registrationResult.mode,
          timing,
          capabilities: registrationResult.capabilities
        });

        return {
          success: true,
          mode: registrationResult.mode === 'disabled' ? 'limited' : 'full',
          errors: [],
          timing,
          metadata: {
            supported: registrationResult.capabilities.supported,
            registered: !!registrationResult.registration,
            active: !!registrationResult.registration?.active,
            mode: registrationResult.mode,
            capabilities: registrationResult.capabilities
          }
        };
      } else {
        // Handle registration failure with new failure handler
        const networkQuality = progressiveLoadingManager.getCurrentNetworkQuality();
        const twaEnvironment = { isTWA: false, isFirstLaunch: false }; // Will be set by caller
        
        const recoverySuccess = await serviceWorkerFailureHandler.handleRegistrationFailure(
          registrationResult.error || new Error('Unknown registration failure'),
          {
            environment: {
              ...twaEnvironment,
              networkStatus: navigator.onLine ? 'online' : 'offline'
            }
          }
        );

        debugLogger.logLifecycle('WARN', 'Service worker registration failed, recovery attempted', {
          originalError: registrationResult.error?.message,
          recoverySuccess,
          timing
        });

        return {
          success: recoverySuccess,
          mode: 'limited',
          errors: registrationResult.error ? [startupErrorDetector.detectError({
            category: ErrorCategory.SERVICE_WORKER,
            message: `Service worker registration failed: ${registrationResult.error.message}`,
            originalError: registrationResult.error
          })] : [],
          timing,
          metadata: {
            supported: registrationResult.capabilities.supported,
            registered: false,
            failed: true,
            recoveryAttempted: true,
            recoverySuccess,
            capabilities: registrationResult.capabilities
          }
        };
      }
      
    } catch (error) {
      const timing = performance.now() - startTime;
      
      debugLogger.logError('ERROR', 'Service worker initialization failed critically', error);
      
      // Attempt emergency recovery
      try {
        await serviceWorkerFailureHandler.handleRegistrationFailure(error as Error);
      } catch (recoveryError) {
        debugLogger.logError('ERROR', 'Emergency recovery also failed', recoveryError);
      }

      return {
        success: false,
        mode: 'limited',
        errors: [startupErrorDetector.detectError({
          category: ErrorCategory.SERVICE_WORKER,
          message: `Service worker initialization failed: ${(error as Error).message}`,
          originalError: error as Error
        })],
        timing,
        metadata: {
          supported: serviceWorkerManager.getCapabilities().supported,
          failed: true,
          criticalError: true,
          error: (error as Error).message
        }
      };
    }
  }

  private async executeAuthInit(): Promise<PhaseResult> {
    try {
      const networkQuality = progressiveLoadingManager.getCurrentNetworkQuality();
      
      debugLogger.logLifecycle('INFO', 'Starting enhanced authentication initialization', {
        networkQuality,
        isOnline: navigator.onLine
      });

      // Import auth systems dynamically to avoid circular dependencies
      const { authRecoverySystem } = await import('@/utils/authRecoverySystem');
      const { offlineAuthSystem } = await import('@/utils/offlineAuthSystem');
      const { authFailureHandler } = await import('@/utils/authFailureHandler');
      
      // Test basic storage functionality
      const storageWorking = this.testStorageAccess();
      
      if (!storageWorking) {
        debugLogger.logLifecycle('ERROR', 'Storage access required for authentication not available');
        
        // Try to enable guest mode as fallback
        const guestResult = await offlineAuthSystem.enableGuestMode();
        if (guestResult.success) {
          return {
            success: true,
            mode: 'degraded',
            errors: [],
            timing: 0,
            metadata: { message: 'Authentication initialized in guest mode due to storage issues' }
          };
        }
        
        throw new Error('Storage access required for authentication not available');
      }
      
      let authMode: 'full' | 'limited' | 'degraded' = 'limited';
      let authResult: any = null;

      // Try enhanced session recovery first
      try {
        authResult = await authRecoverySystem.attemptSessionRecovery({
          enableRetry: networkQuality !== NetworkQuality.OFFLINE,
          maxRetries: networkQuality === NetworkQuality.SLOW ? 1 : 2,
          fallbackToGuest: true,
          validateIntegrity: true
        });

        if (authResult.success) {
          authMode = authResult.mode === 'full' ? 'full' : 'limited';
          debugLogger.logLifecycle('INFO', 'Enhanced session recovery successful', {
            mode: authResult.mode,
            method: authResult.recoveryMethod
          });
        } else {
          debugLogger.logLifecycle('WARN', 'Enhanced session recovery failed', authResult.error);
        }
      } catch (recoveryError) {
        debugLogger.logLifecycle('ERROR', 'Session recovery error', recoveryError);
        
        // Handle the failure with enhanced error handling
        authResult = await authFailureHandler.handleAuthFailure(recoveryError, {
          context: 'startup_auth_init',
          networkQuality,
          phase: 'session_recovery'
        });
      }

      // If session recovery failed but we're online, try to load auth resources
      if (!authResult?.success && networkQuality !== NetworkQuality.OFFLINE) {
        try {
          debugLogger.logLifecycle('INFO', 'Attempting auth resource loading as fallback');
          
          // Validate Supabase client is available
          const supabaseAvailable = typeof window !== 'undefined' && 'supabase' in window;
          
          if (supabaseAvailable) {
            authMode = 'limited';
            debugLogger.logLifecycle('INFO', 'Supabase client available, auth resources ready');
          } else {
            debugLogger.logLifecycle('WARN', 'Supabase client not available');
          }
          
        } catch (resourceError) {
          debugLogger.logLifecycle('WARN', 'Auth resource validation failed', resourceError);
        }
      }

      // If we're offline or all online methods failed, try offline auth
      if ((!authResult?.success || authResult.mode === 'guest') && networkQuality === NetworkQuality.OFFLINE) {
        try {
          const offlineResult = await offlineAuthSystem.recoverOfflineAuth();
          if (offlineResult.success) {
            authMode = 'limited';
            authResult = offlineResult;
            debugLogger.logLifecycle('INFO', 'Offline authentication successful');
          }
        } catch (offlineError) {
          debugLogger.logLifecycle('WARN', 'Offline authentication failed', offlineError);
        }
      }

      // Final fallback to guest mode if everything else failed
      if (!authResult?.success) {
        try {
          const guestResult = await offlineAuthSystem.enableGuestMode();
          if (guestResult.success) {
            authMode = 'degraded';
            authResult = guestResult;
            debugLogger.logLifecycle('INFO', 'Guest mode enabled as final fallback');
          }
        } catch (guestError) {
          debugLogger.logLifecycle('ERROR', 'Guest mode activation failed', guestError);
          throw new Error('All authentication initialization methods failed');
        }
      }

      // Implement timeout handling for authentication operations
      const authTimeout = this.getAuthTimeoutForNetworkQuality(networkQuality);
      
      return {
        success: true,
        mode: authMode,
        errors: [],
        timing: 0,
        metadata: { 
          message: `Enhanced authentication initialized in ${authMode} mode${authResult?.recoveryMethod ? ` via ${authResult.recoveryMethod}` : ''}`,
          recoveryMethod: authResult?.recoveryMethod
        }
      };
      
    } catch (error) {
      debugLogger.logLifecycle('ERROR', 'Enhanced authentication initialization failed', error);
      
      // Try one final fallback to guest mode
      try {
        const { offlineAuthSystem } = await import('@/utils/offlineAuthSystem');
        const guestResult = await offlineAuthSystem.enableGuestMode();
        
        if (guestResult.success) {
          return {
            success: true,
            mode: 'degraded',
            errors: [],
            timing: 0,
            metadata: { message: 'Authentication failed, enabled guest mode as emergency fallback' }
          };
        }
      } catch (fallbackError) {
        debugLogger.logLifecycle('ERROR', 'Emergency guest mode fallback failed', fallbackError);
      }
      
      return {
        success: false,
        mode: 'degraded',
        errors: [],
        timing: 0,
        metadata: { error: error instanceof Error ? error.message : 'Enhanced authentication initialization failed' }
      };
    }
  }

  private getAuthTimeoutForNetworkQuality(quality: NetworkQuality): number {
    switch (quality) {
      case NetworkQuality.FAST:
        return 5000;
      case NetworkQuality.MODERATE:
        return 8000;
      case NetworkQuality.SLOW:
        return 15000;
      case NetworkQuality.OFFLINE:
      default:
        return 3000;
    }
  }

  private async executeReactMount(): Promise<PhaseResult> {
    try {
      // Wait for React app to mount
      await this.waitForReactMount();
      
      const rootElement = document.getElementById('root');
      const hasContent = rootElement && rootElement.children.length > 0;
      const hasReactContent = rootElement?.querySelector('[data-reactroot], .react-component, [class*="react"]');
      
      if (!hasContent) {
        throw new Error('React app failed to mount - no content in root element');
      }
      
      return {
        success: true,
        mode: hasReactContent ? 'full' : 'limited',
        errors: [],
        timing: 0,
        metadata: {
          hasContent,
          hasReactContent: !!hasReactContent,
          childrenCount: rootElement?.children.length || 0
        }
      };
      
    } catch (error) {
      return {
        success: false,
        mode: 'degraded',
        errors: [startupErrorDetector.detectError({
          category: ErrorCategory.JAVASCRIPT,
          message: `React mount failed: ${error.message}`,
          originalError: error as Error
        })],
        timing: 0
      };
    }
  }

  private async executeAppReady(): Promise<PhaseResult> {
    try {
      // Verify app is interactive
      const isInteractive = document.readyState === 'complete' || document.readyState === 'interactive';
      
      // Check component health
      const healthSummary = healthMonitor.getHealthSummary();
      const isHealthy = healthSummary.overall !== ComponentStatus.UNHEALTHY;
      
      // Verify no critical errors
      const criticalErrors = startupErrorDetector.getCriticalErrors();
      const hasCriticalErrors = criticalErrors.length > 0;
      
      if (hasCriticalErrors) {
        throw new Error(`Critical errors detected: ${criticalErrors.length}`);
      }
      
      return {
        success: true,
        mode: (isInteractive && isHealthy) ? 'full' : 'limited',
        errors: [],
        timing: 0,
        metadata: {
          isInteractive,
          isHealthy,
          healthSummary: healthSummary.overall,
          criticalErrorCount: criticalErrors.length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        mode: 'limited',
        errors: [startupErrorDetector.detectError({
          message: `App ready check failed: ${error.message}`,
          originalError: error as Error
        })],
        timing: 0
      };
    }
  }

  private async waitForReactMount(maxWait: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkMount = () => {
        const rootElement = document.getElementById('root');
        const hasContent = rootElement && rootElement.children.length > 0;
        
        if (hasContent) {
          resolve();
          return;
        }
        
        if (Date.now() - startTime > maxWait) {
          reject(new Error('React mount timeout'));
          return;
        }
        
        setTimeout(checkMount, 100);
      };
      
      checkMount();
    });
  }

  private testStorageAccess(): boolean {
    try {
      const testKey = '__startup_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private setupErrorHandlers() {
    // Listen for escalated errors
    window.addEventListener('startup-error-escalated', (event: any) => {
      const error = event.detail;
      debugLogger.logError('CRITICAL', `Escalated error detected: ${error.category}`, error);
      
      // Trigger emergency mode for critical errors
      if (error.severity === ErrorSeverity.CRITICAL) {
        this.triggerEmergencyRecovery();
      }
    });

    // Listen for health recovery triggers
    window.addEventListener('health-recovery-triggered', (event: any) => {
      const trigger = event.detail;
      debugLogger.logError('WARN', `Health recovery triggered: ${trigger.id}`, trigger);
    });
  }

  private triggerEmergencyRecovery() {
    debugLogger.logError('CRITICAL', 'Triggering emergency recovery due to critical errors');
    localStorage.setItem('emergency-debug', 'true');
    
    // Emit emergency mode event
    window.dispatchEvent(new CustomEvent('activate-emergency-mode'));
  }

  // Public API methods
  updatePhase(phase: StartupPhase) {
    this.currentPhase = phase;
    startupErrorDetector.setCurrentPhase(phase);
    debugLogger.logLifecycle('INFO', `Startup phase changed to: ${phase}`);
  }

  getCurrentPhase(): StartupPhase {
    return this.currentPhase;
  }

  getCompletedPhases(): StartupPhase[] {
    return Array.from(this.completedPhases);
  }

  getFailedPhases(): StartupPhase[] {
    return Array.from(this.failedPhases);
  }

  getPhaseTimings(): Record<StartupPhase, number> {
    const timings: Record<StartupPhase, number> = {} as Record<StartupPhase, number>;
    for (const [phase, timing] of this.phaseTimings) {
      timings[phase] = timing;
    }
    return timings;
  }

  async getHealthStatus() {
    return healthMonitor.getHealthSummary();
  }

  async generateDiagnosticReport() {
    return await diagnosticCollector.generateDiagnosticReport();
  }

  getErrorSummary() {
    return startupErrorDetector.getErrorSummary();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getStartupMetrics(): PerformanceMetrics {
    return this.calculatePerformanceMetrics();
  }

  // Phase management methods
  getPhaseStatus(phase: StartupPhase): PhaseStatus {
    return initializationPhaseManager.getPhaseStatus(phase);
  }

  getPhaseMetrics(phase?: StartupPhase) {
    return initializationPhaseManager.getPhaseMetrics(phase);
  }

  getPhaseExecutions(phase: StartupPhase) {
    return initializationPhaseManager.getPhaseExecutions(phase);
  }

  getOverallProgress() {
    return initializationPhaseManager.getOverallProgress();
  }

  async rollbackToPhase(phase: StartupPhase): Promise<boolean> {
    debugLogger.logLifecycle('WARN', `Manual rollback requested to phase: ${phase}`);
    return await initializationPhaseManager.rollbackToPhase(phase);
  }

  exportPhaseData() {
    return initializationPhaseManager.exportPhaseData();
  }

  // Enhanced diagnostic information including phase data
  async generateEnhancedDiagnosticReport() {
    const basicDiagnostics = await this.generateDiagnosticReport();
    const phaseData = this.exportPhaseData();
    const healthStatus = await this.getHealthStatus();
    const errorSummary = this.getErrorSummary();
    
    return {
      ...basicDiagnostics,
      phaseManagement: phaseData,
      healthStatus,
      errorSummary,
      startupMetrics: this.getStartupMetrics(),
      progressiveLoading: {
        networkQuality: progressiveLoadingManager.getCurrentNetworkQuality(),
        strategy: progressiveLoadingManager.getCurrentStrategy(),
        activeRequests: progressiveLoadingManager.getActiveRequestCount(),
        loadingResults: progressiveLoadingManager.getLoadingResults()
      },
      performanceOptimization: {
        timingAnalysis: startupPerformanceOptimizer.getTimingAnalysis(),
        resourceOptimizations: startupPerformanceOptimizer.getResourceOptimizations(),
        memoryOptimizations: startupPerformanceOptimizer.getMemoryOptimizations()
      },
      performanceMonitoring: {
        dashboard: performanceMonitoringSystem.generateDashboard(),
        activeAlerts: performanceMonitoringSystem.getActiveAlerts(),
        currentMetrics: performanceMonitoringSystem.getCurrentMetricsSnapshot()
      },
      metricsCollection: {
        comprehensiveReport: performanceMetricsCollector.generateComprehensiveReport(),
        availableMetrics: performanceMetricsCollector.getAllMetrics()
      }
    };
  }

  // Performance optimization methods
  async optimizeStartupPerformance() {
    debugLogger.logLifecycle('INFO', 'Starting startup performance optimization');
    
    // Optimize resource loading
    const resourceOptimizations = startupPerformanceOptimizer.optimizeResourceLoading();
    
    // Optimize memory usage
    const memoryOptimizations = startupPerformanceOptimizer.optimizeMemoryUsage();
    
    // Get timing analysis
    const timingAnalysis = startupPerformanceOptimizer.getTimingAnalysis();
    
    debugLogger.logLifecycle('INFO', 'Startup performance optimization completed', {
      resourceOptimizations: resourceOptimizations.length,
      memoryOptimizations: memoryOptimizations.length,
      bottlenecks: timingAnalysis.bottlenecks.length,
      recommendations: timingAnalysis.recommendations.length
    });
    
    return {
      resourceOptimizations,
      memoryOptimizations,
      timingAnalysis
    };
  }

  getPerformanceDashboard() {
    return performanceMonitoringSystem.generateDashboard();
  }

  getPerformanceReport(timeRange?: { start: number; end: number }) {
    return performanceMonitoringSystem.generateReport(timeRange);
  }
}

export const startupOrchestrator = new StartupOrchestrator();