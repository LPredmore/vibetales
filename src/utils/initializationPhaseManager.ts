/**
 * Initialization Phase Management System
 * 
 * Implements phase tracking with detailed timing and success metrics,
 * phase dependency management, rollback capabilities, and phase-specific
 * error handling and recovery strategies.
 * 
 * Requirements: 1.1, 1.2, 1.5
 */

import { StartupPhase, StartupError, startupErrorDetector } from './startupErrorDetection';
import { debugLogger } from './debugLogger';

export interface PhaseMetrics {
  phase: StartupPhase;
  startTime: number;
  endTime?: number;
  duration?: number;
  attempts: number;
  successRate: number;
  averageDuration: number;
  lastSuccess?: number;
  lastFailure?: number;
  errorCount: number;
  warningCount: number;
}

export interface PhaseDependency {
  phase: StartupPhase;
  requiredPhases: StartupPhase[];
  optionalPhases: StartupPhase[];
  blockingPhases: StartupPhase[]; // Phases that must not be running
  timeout: number;
  retryPolicy: PhaseRetryPolicy;
}

export interface PhaseRetryPolicy {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay: number;
  retryConditions: RetryCondition[];
}

export interface RetryCondition {
  errorCategory?: string;
  errorMessage?: RegExp;
  networkQuality?: string;
  maxConsecutiveFailures?: number;
}

export interface PhaseExecution {
  phase: StartupPhase;
  status: PhaseStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  attempt: number;
  errors: StartupError[];
  warnings: string[];
  metadata: Record<string, any>;
  rollbackData?: any;
}

export enum PhaseStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  ROLLED_BACK = 'rolled_back'
}

export interface PhaseRollbackHandler {
  phase: StartupPhase;
  canRollback: (execution: PhaseExecution) => boolean;
  rollback: (execution: PhaseExecution) => Promise<void>;
  cleanup: (execution: PhaseExecution) => Promise<void>;
}

export interface PhaseRecoveryStrategy {
  phase: StartupPhase;
  errorCategory: string;
  strategy: RecoveryAction;
  condition: (error: StartupError, execution: PhaseExecution) => boolean;
  execute: (error: StartupError, execution: PhaseExecution) => Promise<RecoveryResult>;
}

export enum RecoveryAction {
  RETRY = 'retry',
  SKIP = 'skip',
  ROLLBACK = 'rollback',
  FALLBACK = 'fallback',
  EMERGENCY = 'emergency'
}

export interface RecoveryResult {
  success: boolean;
  action: RecoveryAction;
  message: string;
  shouldContinue: boolean;
  newPhaseStatus?: PhaseStatus;
}

class InitializationPhaseManager {
  private phaseMetrics: Map<StartupPhase, PhaseMetrics> = new Map();
  private phaseDependencies: Map<StartupPhase, PhaseDependency> = new Map();
  private phaseExecutions: Map<StartupPhase, PhaseExecution[]> = new Map();
  private rollbackHandlers: Map<StartupPhase, PhaseRollbackHandler> = new Map();
  private recoveryStrategies: Map<string, PhaseRecoveryStrategy[]> = new Map();
  private activePhases: Set<StartupPhase> = new Set();
  private completedPhases: Set<StartupPhase> = new Set();
  private failedPhases: Set<StartupPhase> = new Set();
  private rollbackStack: StartupPhase[] = [];

  constructor() {
    this.initializePhaseMetrics();
    this.setupPhaseDependencies();
    this.setupRollbackHandlers();
    this.setupRecoveryStrategies();
  }

  private initializePhaseMetrics() {
    // Initialize metrics for all phases
    Object.values(StartupPhase).forEach(phase => {
      this.phaseMetrics.set(phase, {
        phase,
        startTime: 0,
        attempts: 0,
        successRate: 0,
        averageDuration: 0,
        errorCount: 0,
        warningCount: 0
      });
      
      this.phaseExecutions.set(phase, []);
    });
  }

  private setupPhaseDependencies() {
    // Define phase dependencies and constraints
    const dependencies: PhaseDependency[] = [
      {
        phase: StartupPhase.INITIAL_LOAD,
        requiredPhases: [],
        optionalPhases: [],
        blockingPhases: [],
        timeout: 5000,
        retryPolicy: {
          maxRetries: 2,
          backoffStrategy: 'exponential',
          baseDelay: 1000,
          maxDelay: 5000,
          retryConditions: [
            { errorCategory: 'NETWORK', maxConsecutiveFailures: 3 },
            { errorCategory: 'JAVASCRIPT', maxConsecutiveFailures: 1 }
          ]
        }
      },
      {
        phase: StartupPhase.SCRIPT_LOADING,
        requiredPhases: [StartupPhase.INITIAL_LOAD],
        optionalPhases: [],
        blockingPhases: [],
        timeout: 8000,
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential',
          baseDelay: 1500,
          maxDelay: 8000,
          retryConditions: [
            { errorCategory: 'NETWORK', maxConsecutiveFailures: 5 },
            { errorMessage: /timeout/i, maxConsecutiveFailures: 2 }
          ]
        }
      },
      {
        phase: StartupPhase.SERVICE_WORKER_INIT,
        requiredPhases: [StartupPhase.SCRIPT_LOADING],
        optionalPhases: [],
        blockingPhases: [],
        timeout: 6000,
        retryPolicy: {
          maxRetries: 2,
          backoffStrategy: 'linear',
          baseDelay: 2000,
          maxDelay: 6000,
          retryConditions: [
            { errorCategory: 'SERVICE_WORKER', maxConsecutiveFailures: 3 }
          ]
        }
      },
      {
        phase: StartupPhase.AUTH_INIT,
        requiredPhases: [StartupPhase.SCRIPT_LOADING],
        optionalPhases: [StartupPhase.SERVICE_WORKER_INIT],
        blockingPhases: [],
        timeout: 10000,
        retryPolicy: {
          maxRetries: 4,
          backoffStrategy: 'exponential',
          baseDelay: 2000,
          maxDelay: 10000,
          retryConditions: [
            { errorCategory: 'AUTH', maxConsecutiveFailures: 3 },
            { errorCategory: 'NETWORK', maxConsecutiveFailures: 5 }
          ]
        }
      },
      {
        phase: StartupPhase.REACT_MOUNT,
        requiredPhases: [StartupPhase.SCRIPT_LOADING],
        optionalPhases: [StartupPhase.AUTH_INIT, StartupPhase.SERVICE_WORKER_INIT],
        blockingPhases: [],
        timeout: 12000,
        retryPolicy: {
          maxRetries: 2,
          backoffStrategy: 'fixed',
          baseDelay: 3000,
          maxDelay: 3000,
          retryConditions: [
            { errorCategory: 'JAVASCRIPT', maxConsecutiveFailures: 2 }
          ]
        }
      },
      {
        phase: StartupPhase.APP_READY,
        requiredPhases: [StartupPhase.REACT_MOUNT],
        optionalPhases: [StartupPhase.AUTH_INIT, StartupPhase.SERVICE_WORKER_INIT],
        blockingPhases: [],
        timeout: 5000,
        retryPolicy: {
          maxRetries: 1,
          backoffStrategy: 'fixed',
          baseDelay: 2000,
          maxDelay: 2000,
          retryConditions: []
        }
      }
    ];

    dependencies.forEach(dep => {
      this.phaseDependencies.set(dep.phase, dep);
    });
  }

  private setupRollbackHandlers() {
    // Define rollback handlers for each phase
    this.rollbackHandlers.set(StartupPhase.SERVICE_WORKER_INIT, {
      phase: StartupPhase.SERVICE_WORKER_INIT,
      canRollback: (execution) => execution.metadata?.registration !== undefined,
      rollback: async (execution) => {
        if (execution.metadata?.registration) {
          try {
            await execution.metadata.registration.unregister();
            debugLogger.logLifecycle('INFO', 'Service worker registration rolled back');
          } catch (error) {
            debugLogger.logError('WARN', 'Service worker rollback failed', error);
          }
        }
      },
      cleanup: async (execution) => {
        // Clear any service worker caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
      }
    });

    this.rollbackHandlers.set(StartupPhase.AUTH_INIT, {
      phase: StartupPhase.AUTH_INIT,
      canRollback: (execution) => execution.metadata?.authState !== undefined,
      rollback: async (execution) => {
        try {
          // Clear authentication state
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.removeItem('supabase.auth.token');
          debugLogger.logLifecycle('INFO', 'Authentication state rolled back');
        } catch (error) {
          debugLogger.logError('WARN', 'Authentication rollback failed', error);
        }
      },
      cleanup: async (execution) => {
        // Clear any auth-related storage
        const authKeys = Object.keys(localStorage).filter(key => key.includes('auth'));
        authKeys.forEach(key => localStorage.removeItem(key));
      }
    });

    this.rollbackHandlers.set(StartupPhase.REACT_MOUNT, {
      phase: StartupPhase.REACT_MOUNT,
      canRollback: (execution) => true,
      rollback: async (execution) => {
        try {
          // Clear React root
          const rootElement = document.getElementById('root');
          if (rootElement) {
            rootElement.innerHTML = '';
          }
          debugLogger.logLifecycle('INFO', 'React mount rolled back');
        } catch (error) {
          debugLogger.logError('WARN', 'React mount rollback failed', error);
        }
      },
      cleanup: async (execution) => {
        // Remove any React-specific event listeners or global state
        window.removeEventListener('error', this.handleReactError);
      }
    });
  }

  private setupRecoveryStrategies() {
    // Define recovery strategies for different error scenarios
    const strategies: PhaseRecoveryStrategy[] = [
      {
        phase: StartupPhase.SCRIPT_LOADING,
        errorCategory: 'NETWORK',
        strategy: RecoveryAction.RETRY,
        condition: (error, execution) => execution.attempt < 3,
        execute: async (error, execution) => ({
          success: true,
          action: RecoveryAction.RETRY,
          message: 'Retrying script loading due to network error',
          shouldContinue: true
        })
      },
      {
        phase: StartupPhase.SERVICE_WORKER_INIT,
        errorCategory: 'SERVICE_WORKER',
        strategy: RecoveryAction.SKIP,
        condition: (error, execution) => execution.attempt >= 2,
        execute: async (error, execution) => ({
          success: true,
          action: RecoveryAction.SKIP,
          message: 'Skipping service worker initialization - continuing without offline support',
          shouldContinue: true,
          newPhaseStatus: PhaseStatus.SKIPPED
        })
      },
      {
        phase: StartupPhase.AUTH_INIT,
        errorCategory: 'AUTH',
        strategy: RecoveryAction.FALLBACK,
        condition: (error, execution) => error.message.includes('network'),
        execute: async (error, execution) => ({
          success: true,
          action: RecoveryAction.FALLBACK,
          message: 'Using offline authentication mode',
          shouldContinue: true
        })
      },
      {
        phase: StartupPhase.REACT_MOUNT,
        errorCategory: 'JAVASCRIPT',
        strategy: RecoveryAction.EMERGENCY,
        condition: (error, execution) => error.message.includes('Cannot read properties'),
        execute: async (error, execution) => ({
          success: false,
          action: RecoveryAction.EMERGENCY,
          message: 'Critical React mounting error - activating emergency mode',
          shouldContinue: false
        })
      }
    ];

    strategies.forEach(strategy => {
      const key = `${strategy.phase}_${strategy.errorCategory}`;
      if (!this.recoveryStrategies.has(key)) {
        this.recoveryStrategies.set(key, []);
      }
      this.recoveryStrategies.get(key)!.push(strategy);
    });
  }

  async startPhase(phase: StartupPhase): Promise<boolean> {
    debugLogger.logLifecycle('INFO', `Starting phase: ${phase}`);

    // Check if phase can be started
    if (!this.canStartPhase(phase)) {
      debugLogger.logLifecycle('WARN', `Cannot start phase ${phase} - dependencies not satisfied`);
      return false;
    }

    // Check if phase is already running
    if (this.activePhases.has(phase)) {
      debugLogger.logLifecycle('WARN', `Phase ${phase} is already running`);
      return false;
    }

    // Create phase execution record
    const execution: PhaseExecution = {
      phase,
      status: PhaseStatus.RUNNING,
      startTime: performance.now(),
      attempt: this.getPhaseAttemptCount(phase) + 1,
      errors: [],
      warnings: [],
      metadata: {}
    };

    // Add to active phases and execution history
    this.activePhases.add(phase);
    this.phaseExecutions.get(phase)!.push(execution);
    this.rollbackStack.push(phase);

    // Update metrics
    const metrics = this.phaseMetrics.get(phase)!;
    metrics.startTime = execution.startTime;
    metrics.attempts++;

    return true;
  }

  async completePhase(
    phase: StartupPhase, 
    success: boolean, 
    errors: StartupError[] = [], 
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const endTime = performance.now();
    const execution = this.getCurrentExecution(phase);

    if (!execution) {
      debugLogger.logError('WARN', `No active execution found for phase ${phase}`);
      return;
    }

    // Update execution record
    execution.endTime = endTime;
    execution.duration = endTime - execution.startTime;
    execution.errors = errors;
    execution.metadata = { ...execution.metadata, ...metadata };
    execution.status = success ? PhaseStatus.COMPLETED : PhaseStatus.FAILED;

    // Update phase sets
    this.activePhases.delete(phase);
    if (success) {
      this.completedPhases.add(phase);
    } else {
      this.failedPhases.add(phase);
    }

    // Update metrics
    this.updatePhaseMetrics(phase, execution);

    // Handle failure with recovery strategies
    if (!success && errors.length > 0) {
      const shouldContinue = await this.handlePhaseFailure(phase, errors, execution);
      if (!shouldContinue) {
        debugLogger.logError('CRITICAL', `Phase ${phase} failure requires emergency intervention`);
        return;
      }
    }

    debugLogger.logLifecycle('INFO', `Phase ${phase} completed`, {
      success,
      duration: execution.duration,
      attempt: execution.attempt,
      errorCount: errors.length
    });
  }

  private canStartPhase(phase: StartupPhase): boolean {
    const dependency = this.phaseDependencies.get(phase);
    if (!dependency) return true;

    // Check required phases are completed
    const requiredSatisfied = dependency.requiredPhases.every(reqPhase => 
      this.completedPhases.has(reqPhase)
    );

    if (!requiredSatisfied) {
      return false;
    }

    // Check no blocking phases are running
    const noBlockingPhases = dependency.blockingPhases.every(blockPhase => 
      !this.activePhases.has(blockPhase)
    );

    return noBlockingPhases;
  }

  private getPhaseAttemptCount(phase: StartupPhase): number {
    return this.phaseExecutions.get(phase)?.length || 0;
  }

  private getCurrentExecution(phase: StartupPhase): PhaseExecution | undefined {
    const executions = this.phaseExecutions.get(phase) || [];
    return executions.find(exec => exec.status === PhaseStatus.RUNNING);
  }

  private updatePhaseMetrics(phase: StartupPhase, execution: PhaseExecution) {
    const metrics = this.phaseMetrics.get(phase)!;
    
    if (execution.duration) {
      // Update average duration
      const totalDuration = metrics.averageDuration * (metrics.attempts - 1) + execution.duration;
      metrics.averageDuration = totalDuration / metrics.attempts;
    }

    // Update success rate
    const executions = this.phaseExecutions.get(phase)!;
    const completedExecutions = executions.filter(exec => 
      exec.status === PhaseStatus.COMPLETED || exec.status === PhaseStatus.FAILED
    );
    const successfulExecutions = completedExecutions.filter(exec => 
      exec.status === PhaseStatus.COMPLETED
    );
    
    metrics.successRate = completedExecutions.length > 0 
      ? successfulExecutions.length / completedExecutions.length 
      : 0;

    // Update error and warning counts
    metrics.errorCount += execution.errors.length;
    metrics.warningCount += execution.warnings.length;

    // Update last success/failure timestamps
    if (execution.status === PhaseStatus.COMPLETED) {
      metrics.lastSuccess = execution.endTime;
    } else if (execution.status === PhaseStatus.FAILED) {
      metrics.lastFailure = execution.endTime;
    }
  }

  private async handlePhaseFailure(
    phase: StartupPhase, 
    errors: StartupError[], 
    execution: PhaseExecution
  ): Promise<boolean> {
    debugLogger.logError('WARN', `Handling failure for phase ${phase}`, {
      errorCount: errors.length,
      attempt: execution.attempt
    });

    // Try recovery strategies for each error
    for (const error of errors) {
      const strategies = this.getRecoveryStrategies(phase, error.category);
      
      for (const strategy of strategies) {
        if (strategy.condition(error, execution)) {
          debugLogger.logLifecycle('INFO', `Applying recovery strategy: ${strategy.strategy}`, {
            phase,
            errorCategory: error.category
          });
          
          const result = await strategy.execute(error, execution);
          
          if (result.success) {
            if (result.newPhaseStatus) {
              execution.status = result.newPhaseStatus;
            }
            
            debugLogger.logLifecycle('INFO', `Recovery strategy succeeded: ${result.message}`);
            return result.shouldContinue;
          }
        }
      }
    }

    // No recovery strategy worked - check if we should retry
    const dependency = this.phaseDependencies.get(phase);
    if (dependency && this.shouldRetryPhase(phase, execution, dependency.retryPolicy)) {
      debugLogger.logLifecycle('INFO', `Retrying phase ${phase}`, {
        attempt: execution.attempt,
        maxRetries: dependency.retryPolicy.maxRetries
      });
      
      // Calculate retry delay
      const delay = this.calculateRetryDelay(execution.attempt, dependency.retryPolicy);
      await this.delay(delay);
      
      // Restart the phase
      return await this.startPhase(phase);
    }

    // All recovery attempts failed
    debugLogger.logError('ERROR', `All recovery attempts failed for phase ${phase}`);
    return false;
  }

  private getRecoveryStrategies(phase: StartupPhase, errorCategory: string): PhaseRecoveryStrategy[] {
    const key = `${phase}_${errorCategory}`;
    return this.recoveryStrategies.get(key) || [];
  }

  private shouldRetryPhase(
    phase: StartupPhase, 
    execution: PhaseExecution, 
    retryPolicy: PhaseRetryPolicy
  ): boolean {
    if (execution.attempt >= retryPolicy.maxRetries) {
      return false;
    }

    // Check retry conditions
    for (const condition of retryPolicy.retryConditions) {
      if (condition.errorCategory) {
        const hasMatchingError = execution.errors.some(error => 
          error.category === condition.errorCategory
        );
        if (!hasMatchingError) continue;
      }

      if (condition.errorMessage) {
        const hasMatchingMessage = execution.errors.some(error => 
          condition.errorMessage!.test(error.message)
        );
        if (!hasMatchingMessage) continue;
      }

      if (condition.maxConsecutiveFailures) {
        const recentFailures = this.getRecentConsecutiveFailures(phase);
        if (recentFailures >= condition.maxConsecutiveFailures) {
          return false;
        }
      }
    }

    return true;
  }

  private getRecentConsecutiveFailures(phase: StartupPhase): number {
    const executions = this.phaseExecutions.get(phase) || [];
    let consecutiveFailures = 0;
    
    // Count consecutive failures from the end
    for (let i = executions.length - 1; i >= 0; i--) {
      const execution = executions[i];
      if (execution.status === PhaseStatus.FAILED) {
        consecutiveFailures++;
      } else if (execution.status === PhaseStatus.COMPLETED) {
        break;
      }
    }
    
    return consecutiveFailures;
  }

  private calculateRetryDelay(attempt: number, retryPolicy: PhaseRetryPolicy): number {
    switch (retryPolicy.backoffStrategy) {
      case 'linear':
        return Math.min(retryPolicy.baseDelay * attempt, retryPolicy.maxDelay);
      
      case 'exponential':
        return Math.min(retryPolicy.baseDelay * Math.pow(2, attempt - 1), retryPolicy.maxDelay);
      
      case 'fixed':
      default:
        return retryPolicy.baseDelay;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async rollbackPhase(phase: StartupPhase): Promise<boolean> {
    debugLogger.logLifecycle('WARN', `Rolling back phase: ${phase}`);

    const handler = this.rollbackHandlers.get(phase);
    if (!handler) {
      debugLogger.logLifecycle('WARN', `No rollback handler for phase ${phase}`);
      return false;
    }

    const execution = this.getCurrentExecution(phase);
    if (!execution) {
      debugLogger.logLifecycle('WARN', `No active execution to rollback for phase ${phase}`);
      return false;
    }

    if (!handler.canRollback(execution)) {
      debugLogger.logLifecycle('WARN', `Phase ${phase} cannot be rolled back`);
      return false;
    }

    try {
      await handler.rollback(execution);
      await handler.cleanup(execution);
      
      execution.status = PhaseStatus.ROLLED_BACK;
      this.activePhases.delete(phase);
      this.completedPhases.delete(phase);
      this.failedPhases.delete(phase);
      
      // Remove from rollback stack
      const index = this.rollbackStack.indexOf(phase);
      if (index > -1) {
        this.rollbackStack.splice(index, 1);
      }
      
      debugLogger.logLifecycle('INFO', `Phase ${phase} rolled back successfully`);
      return true;
      
    } catch (error) {
      debugLogger.logError('ERROR', `Rollback failed for phase ${phase}`, error);
      return false;
    }
  }

  async rollbackToPhase(targetPhase: StartupPhase): Promise<boolean> {
    debugLogger.logLifecycle('WARN', `Rolling back to phase: ${targetPhase}`);

    const targetIndex = this.rollbackStack.indexOf(targetPhase);
    if (targetIndex === -1) {
      debugLogger.logLifecycle('ERROR', `Target phase ${targetPhase} not found in rollback stack`);
      return false;
    }

    // Rollback phases in reverse order
    const phasesToRollback = this.rollbackStack.slice(targetIndex + 1).reverse();
    
    for (const phase of phasesToRollback) {
      const success = await this.rollbackPhase(phase);
      if (!success) {
        debugLogger.logError('ERROR', `Failed to rollback phase ${phase} during rollback to ${targetPhase}`);
        return false;
      }
    }

    debugLogger.logLifecycle('INFO', `Successfully rolled back to phase ${targetPhase}`);
    return true;
  }

  private handleReactError = (event: ErrorEvent) => {
    // React-specific error handler for rollback scenarios
    debugLogger.logError('ERROR', 'React error detected', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno
    });
  };

  // Public API methods
  getPhaseStatus(phase: StartupPhase): PhaseStatus {
    if (this.activePhases.has(phase)) return PhaseStatus.RUNNING;
    if (this.completedPhases.has(phase)) return PhaseStatus.COMPLETED;
    if (this.failedPhases.has(phase)) return PhaseStatus.FAILED;
    return PhaseStatus.PENDING;
  }

  getPhaseMetrics(phase?: StartupPhase): PhaseMetrics | PhaseMetrics[] {
    if (phase) {
      return this.phaseMetrics.get(phase) || this.createEmptyMetrics(phase);
    }
    return Array.from(this.phaseMetrics.values());
  }

  private createEmptyMetrics(phase: StartupPhase): PhaseMetrics {
    return {
      phase,
      startTime: 0,
      attempts: 0,
      successRate: 0,
      averageDuration: 0,
      errorCount: 0,
      warningCount: 0
    };
  }

  getPhaseExecutions(phase: StartupPhase): PhaseExecution[] {
    return this.phaseExecutions.get(phase) || [];
  }

  getActivePhases(): StartupPhase[] {
    return Array.from(this.activePhases);
  }

  getCompletedPhases(): StartupPhase[] {
    return Array.from(this.completedPhases);
  }

  getFailedPhases(): StartupPhase[] {
    return Array.from(this.failedPhases);
  }

  getRollbackStack(): StartupPhase[] {
    return [...this.rollbackStack];
  }

  getOverallProgress(): {
    total: number;
    completed: number;
    failed: number;
    active: number;
    pending: number;
    successRate: number;
  } {
    const total = Object.values(StartupPhase).length;
    const completed = this.completedPhases.size;
    const failed = this.failedPhases.size;
    const active = this.activePhases.size;
    const pending = total - completed - failed - active;
    const successRate = total > 0 ? completed / total : 0;

    return {
      total,
      completed,
      failed,
      active,
      pending,
      successRate
    };
  }

  exportPhaseData() {
    return {
      timestamp: new Date().toISOString(),
      metrics: Array.from(this.phaseMetrics.values()),
      executions: Object.fromEntries(
        Array.from(this.phaseExecutions.entries()).map(([phase, executions]) => [
          phase,
          executions.map(exec => ({
            ...exec,
            errors: exec.errors.map(err => ({
              category: err.category,
              message: err.message,
              severity: err.severity
            }))
          }))
        ])
      ),
      activePhases: Array.from(this.activePhases),
      completedPhases: Array.from(this.completedPhases),
      failedPhases: Array.from(this.failedPhases),
      rollbackStack: this.rollbackStack,
      progress: this.getOverallProgress()
    };
  }
}

// Singleton instance
export const initializationPhaseManager = new InitializationPhaseManager();