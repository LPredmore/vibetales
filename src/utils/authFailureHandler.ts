import { debugLogger } from '@/utils/debugLogger';
import { authRecoverySystem, AuthResult } from './authRecoverySystem';
import { offlineAuthSystem } from './offlineAuthSystem';

export enum AuthErrorType {
  NETWORK_ERROR = 'network_error',
  INVALID_CREDENTIALS = 'invalid_credentials',
  SESSION_EXPIRED = 'session_expired',
  TOKEN_REFRESH_FAILED = 'token_refresh_failed',
  STORAGE_ERROR = 'storage_error',
  SERVER_ERROR = 'server_error',
  RATE_LIMITED = 'rate_limited',
  UNKNOWN_ERROR = 'unknown_error'
}

export enum AuthErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AuthError {
  type: AuthErrorType;
  severity: AuthErrorSeverity;
  message: string;
  originalError?: any;
  timestamp: number;
  context?: Record<string, any>;
  recoverable: boolean;
}

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  userFriendly: boolean;
  autoExecute: boolean;
  execute: () => Promise<AuthResult>;
  rollback?: () => Promise<void>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: AuthErrorType[];
}

export class AuthFailureHandler {
  private static instance: AuthFailureHandler;
  private errorHistory: AuthError[] = [];
  private retryAttempts = new Map<string, number>();
  private isHandlingFailure = false;

  static getInstance(): AuthFailureHandler {
    if (!AuthFailureHandler.instance) {
      AuthFailureHandler.instance = new AuthFailureHandler();
    }
    return AuthFailureHandler.instance;
  }

  /**
   * Categorize authentication errors
   */
  categorizeError(error: any, context?: Record<string, any>): AuthError {
    const timestamp = Date.now();
    let authError: AuthError;

    // Network-related errors
    if (this.isNetworkError(error)) {
      authError = {
        type: AuthErrorType.NETWORK_ERROR,
        severity: AuthErrorSeverity.MEDIUM,
        message: 'Network connection failed. Please check your internet connection.',
        originalError: error,
        timestamp,
        context,
        recoverable: true
      };
    }
    // Invalid credentials
    else if (this.isCredentialError(error)) {
      authError = {
        type: AuthErrorType.INVALID_CREDENTIALS,
        severity: AuthErrorSeverity.HIGH,
        message: 'Invalid email or password. Please check your credentials.',
        originalError: error,
        timestamp,
        context,
        recoverable: false
      };
    }
    // Session expired
    else if (this.isSessionExpiredError(error)) {
      authError = {
        type: AuthErrorType.SESSION_EXPIRED,
        severity: AuthErrorSeverity.MEDIUM,
        message: 'Your session has expired. Please log in again.',
        originalError: error,
        timestamp,
        context,
        recoverable: true
      };
    }
    // Token refresh failed
    else if (this.isTokenRefreshError(error)) {
      authError = {
        type: AuthErrorType.TOKEN_REFRESH_FAILED,
        severity: AuthErrorSeverity.HIGH,
        message: 'Failed to refresh authentication. Please log in again.',
        originalError: error,
        timestamp,
        context,
        recoverable: true
      };
    }
    // Storage errors
    else if (this.isStorageError(error)) {
      authError = {
        type: AuthErrorType.STORAGE_ERROR,
        severity: AuthErrorSeverity.HIGH,
        message: 'Unable to access device storage. Please check your browser settings.',
        originalError: error,
        timestamp,
        context,
        recoverable: true
      };
    }
    // Rate limiting
    else if (this.isRateLimitError(error)) {
      authError = {
        type: AuthErrorType.RATE_LIMITED,
        severity: AuthErrorSeverity.MEDIUM,
        message: 'Too many login attempts. Please wait a moment and try again.',
        originalError: error,
        timestamp,
        context,
        recoverable: true
      };
    }
    // Server errors
    else if (this.isServerError(error)) {
      authError = {
        type: AuthErrorType.SERVER_ERROR,
        severity: AuthErrorSeverity.HIGH,
        message: 'Authentication server is temporarily unavailable. Please try again later.',
        originalError: error,
        timestamp,
        context,
        recoverable: true
      };
    }
    // Unknown errors
    else {
      authError = {
        type: AuthErrorType.UNKNOWN_ERROR,
        severity: AuthErrorSeverity.MEDIUM,
        message: 'An unexpected error occurred. Please try again.',
        originalError: error,
        timestamp,
        context,
        recoverable: true
      };
    }

    // Add to error history
    this.errorHistory.push(authError);
    
    // Keep only last 50 errors
    if (this.errorHistory.length > 50) {
      this.errorHistory = this.errorHistory.slice(-50);
    }

    debugLogger.logAuth('ERROR', 'Authentication error categorized', {
      type: authError.type,
      severity: authError.severity,
      message: authError.message,
      recoverable: authError.recoverable
    });

    return authError;
  }

  /**
   * Handle authentication failure with recovery strategies
   */
  async handleAuthFailure(error: any, context?: Record<string, any>): Promise<AuthResult> {
    if (this.isHandlingFailure) {
      debugLogger.logAuth('WARN', 'Auth failure handling already in progress');
      return { success: false, mode: 'guest', error: 'Recovery already in progress' };
    }

    this.isHandlingFailure = true;

    try {
      const authError = this.categorizeError(error, context);
      debugLogger.logAuth('INFO', 'Handling authentication failure', {
        errorType: authError.type,
        severity: authError.severity
      });

      // Get recovery strategies for this error type
      const strategies = this.getRecoveryStrategies(authError);
      
      // Try recovery strategies in order of priority
      for (const strategy of strategies) {
        try {
          debugLogger.logAuth('INFO', `Attempting recovery strategy: ${strategy.name}`);
          
          const result = await strategy.execute();
          
          if (result.success) {
            debugLogger.logAuth('INFO', `Recovery successful with strategy: ${strategy.name}`);
            return result;
          } else {
            debugLogger.logAuth('WARN', `Recovery strategy failed: ${strategy.name}`, result.error);
          }
          
        } catch (strategyError) {
          debugLogger.logAuth('ERROR', `Recovery strategy error: ${strategy.name}`, strategyError);
          
          // Try rollback if available
          if (strategy.rollback) {
            try {
              await strategy.rollback();
            } catch (rollbackError) {
              debugLogger.logAuth('ERROR', 'Strategy rollback failed', rollbackError);
            }
          }
        }
      }

      // If all strategies failed, fall back to guest mode
      debugLogger.logAuth('WARN', 'All recovery strategies failed, falling back to guest mode');
      return await this.gracefulDegradationToGuest(authError);

    } catch (handlerError) {
      debugLogger.logAuth('ERROR', 'Auth failure handler error', handlerError);
      return {
        success: false,
        mode: 'guest',
        error: 'Authentication recovery failed'
      };
    } finally {
      this.isHandlingFailure = false;
    }
  }

  /**
   * Implement graceful degradation to guest mode
   */
  async gracefulDegradationToGuest(authError: AuthError): Promise<AuthResult> {
    try {
      debugLogger.logAuth('INFO', 'Initiating graceful degradation to guest mode', {
        errorType: authError.type,
        severity: authError.severity
      });

      // Enable guest mode
      const guestResult = await offlineAuthSystem.enableGuestMode();
      
      if (guestResult.success) {
        debugLogger.logAuth('INFO', 'Successfully degraded to guest mode');
        return {
          ...guestResult,
          error: `Authentication failed: ${authError.message}. You're now in guest mode with limited features.`
        };
      } else {
        debugLogger.logAuth('ERROR', 'Failed to enable guest mode');
        return {
          success: false,
          mode: 'guest',
          error: 'Authentication failed and unable to enable guest mode'
        };
      }

    } catch (error) {
      debugLogger.logAuth('ERROR', 'Graceful degradation failed', error);
      return {
        success: false,
        mode: 'guest',
        error: 'Complete authentication failure'
      };
    }
  }

  /**
   * Add user-friendly authentication retry mechanisms
   */
  async retryAuthentication(
    retryFunction: () => Promise<AuthResult>,
    config?: Partial<RetryConfig>
  ): Promise<AuthResult> {
    const retryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [
        AuthErrorType.NETWORK_ERROR,
        AuthErrorType.SERVER_ERROR,
        AuthErrorType.TOKEN_REFRESH_FAILED,
        AuthErrorType.RATE_LIMITED
      ],
      ...config
    };

    const retryKey = 'auth_retry';
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;

    if (currentAttempts >= retryConfig.maxAttempts) {
      debugLogger.logAuth('WARN', 'Max retry attempts reached', {
        attempts: currentAttempts,
        maxAttempts: retryConfig.maxAttempts
      });
      
      return {
        success: false,
        mode: 'guest',
        error: `Authentication failed after ${retryConfig.maxAttempts} attempts`
      };
    }

    try {
      const result = await retryFunction();
      
      if (result.success) {
        // Reset retry counter on success
        this.retryAttempts.delete(retryKey);
        return result;
      }

      // Check if error is retryable
      const lastError = this.errorHistory[this.errorHistory.length - 1];
      if (lastError && !retryConfig.retryableErrors.includes(lastError.type)) {
        debugLogger.logAuth('INFO', 'Error not retryable', { errorType: lastError.type });
        return result;
      }

      // Calculate delay with exponential backoff
      const attempt = currentAttempts + 1;
      const delay = Math.min(
        retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
        retryConfig.maxDelay
      );

      debugLogger.logAuth('INFO', `Retrying authentication in ${delay}ms`, {
        attempt,
        maxAttempts: retryConfig.maxAttempts
      });

      // Update retry counter
      this.retryAttempts.set(retryKey, attempt);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Recursive retry
      return this.retryAuthentication(retryFunction, config);

    } catch (error) {
      debugLogger.logAuth('ERROR', 'Retry authentication error', error);
      
      const authError = this.categorizeError(error);
      if (retryConfig.retryableErrors.includes(authError.type)) {
        // Try again if retryable
        const attempt = currentAttempts + 1;
        this.retryAttempts.set(retryKey, attempt);
        
        if (attempt < retryConfig.maxAttempts) {
          const delay = Math.min(
            retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
            retryConfig.maxDelay
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.retryAuthentication(retryFunction, config);
        }
      }

      return {
        success: false,
        mode: 'guest',
        error: error instanceof Error ? error.message : 'Retry failed'
      };
    }
  }

  /**
   * Get recovery strategies for specific error type
   */
  private getRecoveryStrategies(authError: AuthError): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = [];

    switch (authError.type) {
      case AuthErrorType.SESSION_EXPIRED:
      case AuthErrorType.TOKEN_REFRESH_FAILED:
        strategies.push({
          id: 'token_refresh',
          name: 'Token Refresh',
          description: 'Attempt to refresh authentication tokens',
          userFriendly: false,
          autoExecute: true,
          execute: () => authRecoverySystem.refreshTokenWithRetry()
        });
        
        strategies.push({
          id: 'session_recovery',
          name: 'Session Recovery',
          description: 'Attempt to recover session from storage',
          userFriendly: false,
          autoExecute: true,
          execute: () => authRecoverySystem.attemptSessionRecovery()
        });
        break;

      case AuthErrorType.NETWORK_ERROR:
        strategies.push({
          id: 'offline_auth',
          name: 'Offline Authentication',
          description: 'Use cached authentication data',
          userFriendly: true,
          autoExecute: true,
          execute: () => offlineAuthSystem.recoverOfflineAuth()
        });
        break;

      case AuthErrorType.STORAGE_ERROR:
        strategies.push({
          id: 'alternative_storage',
          name: 'Alternative Storage',
          description: 'Try alternative storage methods',
          userFriendly: false,
          autoExecute: true,
          execute: async () => {
            // Try session recovery with different storage methods
            return authRecoverySystem.attemptSessionRecovery({
              enableRetry: false,
              validateIntegrity: false
            });
          }
        });
        break;

      case AuthErrorType.RATE_LIMITED:
        strategies.push({
          id: 'wait_and_retry',
          name: 'Wait and Retry',
          description: 'Wait for rate limit to reset',
          userFriendly: true,
          autoExecute: false,
          execute: async () => {
            // Wait for rate limit (typically 60 seconds)
            await new Promise(resolve => setTimeout(resolve, 60000));
            return authRecoverySystem.attemptSessionRecovery();
          }
        });
        break;
    }

    // Always add guest mode as final fallback
    strategies.push({
      id: 'guest_mode',
      name: 'Guest Mode',
      description: 'Continue with limited functionality',
      userFriendly: true,
      autoExecute: true,
      execute: () => offlineAuthSystem.enableGuestMode()
    });

    return strategies;
  }

  /**
   * Error type detection methods
   */
  private isNetworkError(error: any): boolean {
    return (
      error?.code === 'NETWORK_ERROR' ||
      error?.message?.includes('network') ||
      error?.message?.includes('fetch') ||
      error?.message?.includes('connection') ||
      !navigator.onLine
    );
  }

  private isCredentialError(error: any): boolean {
    return (
      error?.message?.includes('Invalid login credentials') ||
      error?.message?.includes('invalid_credentials') ||
      error?.message?.includes('wrong password') ||
      error?.message?.includes('user not found')
    );
  }

  private isSessionExpiredError(error: any): boolean {
    return (
      error?.message?.includes('session_expired') ||
      error?.message?.includes('token expired') ||
      error?.message?.includes('JWT expired')
    );
  }

  private isTokenRefreshError(error: any): boolean {
    return (
      error?.message?.includes('refresh_token') ||
      error?.message?.includes('token refresh failed') ||
      error?.code === 'TOKEN_REFRESH_FAILED'
    );
  }

  private isStorageError(error: any): boolean {
    return (
      error?.message?.includes('localStorage') ||
      error?.message?.includes('sessionStorage') ||
      error?.message?.includes('storage quota') ||
      error?.name === 'QuotaExceededError'
    );
  }

  private isRateLimitError(error: any): boolean {
    return (
      error?.message?.includes('rate limit') ||
      error?.message?.includes('too many requests') ||
      error?.status === 429
    );
  }

  private isServerError(error: any): boolean {
    return (
      error?.status >= 500 ||
      error?.message?.includes('server error') ||
      error?.message?.includes('internal error')
    );
  }

  /**
   * Get error history for debugging
   */
  getErrorHistory(): AuthError[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    this.retryAttempts.clear();
    debugLogger.logAuth('INFO', 'Auth error history cleared');
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(authError: AuthError): string {
    const baseMessages = {
      [AuthErrorType.NETWORK_ERROR]: 'Please check your internet connection and try again.',
      [AuthErrorType.INVALID_CREDENTIALS]: 'Please check your email and password.',
      [AuthErrorType.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
      [AuthErrorType.TOKEN_REFRESH_FAILED]: 'Please log in again to continue.',
      [AuthErrorType.STORAGE_ERROR]: 'Please check your browser settings and try again.',
      [AuthErrorType.SERVER_ERROR]: 'Our servers are temporarily unavailable. Please try again in a few minutes.',
      [AuthErrorType.RATE_LIMITED]: 'Please wait a moment before trying again.',
      [AuthErrorType.UNKNOWN_ERROR]: 'Something went wrong. Please try again.'
    };

    return baseMessages[authError.type] || authError.message;
  }
}

// Export singleton instance
export const authFailureHandler = AuthFailureHandler.getInstance();