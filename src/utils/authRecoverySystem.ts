import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { debugLogger } from '@/utils/debugLogger';

export interface AuthResult {
  success: boolean;
  session?: Session;
  user?: User;
  mode: 'full' | 'limited' | 'guest' | 'offline';
  error?: string;
  recoveryMethod?: string;
}

export interface AuthValidation {
  isValid: boolean;
  isExpired: boolean;
  needsRefresh: boolean;
  expiresIn?: number;
  error?: string;
}

export interface SessionRecoveryOptions {
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  fallbackToGuest: boolean;
  validateIntegrity: boolean;
}

export class AuthRecoverySystem {
  private static instance: AuthRecoverySystem;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 3;
  private retryDelay = 1000; // Start with 1 second
  private isRecovering = false;

  static getInstance(): AuthRecoverySystem {
    if (!AuthRecoverySystem.instance) {
      AuthRecoverySystem.instance = new AuthRecoverySystem();
    }
    return AuthRecoverySystem.instance;
  }

  /**
   * Attempt session recovery using multiple strategies
   */
  async attemptSessionRecovery(options: Partial<SessionRecoveryOptions> = {}): Promise<AuthResult> {
    const opts: SessionRecoveryOptions = {
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      fallbackToGuest: true,
      validateIntegrity: true,
      ...options
    };

    if (this.isRecovering) {
      debugLogger.logAuth('WARN', 'Session recovery already in progress');
      return { success: false, mode: 'guest', error: 'Recovery already in progress' };
    }

    this.isRecovering = true;
    debugLogger.logAuth('INFO', 'Starting enhanced session recovery', opts);

    try {
      // Strategy 1: Try Supabase getSession (primary method)
      const supabaseResult = await this.recoverFromSupabase();
      if (supabaseResult.success) {
        debugLogger.logAuth('INFO', 'Session recovered via Supabase');
        return supabaseResult;
      }

      // Strategy 2: Try localStorage recovery
      const localStorageResult = await this.recoverFromLocalStorage(opts.validateIntegrity);
      if (localStorageResult.success) {
        debugLogger.logAuth('INFO', 'Session recovered via localStorage');
        return localStorageResult;
      }

      // Strategy 3: Try sessionStorage recovery
      const sessionStorageResult = await this.recoverFromSessionStorage(opts.validateIntegrity);
      if (sessionStorageResult.success) {
        debugLogger.logAuth('INFO', 'Session recovered via sessionStorage');
        return sessionStorageResult;
      }

      // Strategy 4: Try IndexedDB recovery (for PWA/TWA)
      const indexedDBResult = await this.recoverFromIndexedDB(opts.validateIntegrity);
      if (indexedDBResult.success) {
        debugLogger.logAuth('INFO', 'Session recovered via IndexedDB');
        return indexedDBResult;
      }

      // Strategy 5: Retry with exponential backoff if enabled
      if (opts.enableRetry && this.recoveryAttempts < opts.maxRetries) {
        this.recoveryAttempts++;
        const delay = opts.retryDelay * Math.pow(2, this.recoveryAttempts - 1);
        
        debugLogger.logAuth('INFO', `Retrying session recovery (attempt ${this.recoveryAttempts}/${opts.maxRetries}) after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.attemptSessionRecovery(options);
      }

      // All strategies failed
      debugLogger.logAuth('WARN', 'All session recovery strategies failed');
      
      if (opts.fallbackToGuest) {
        return { success: true, mode: 'guest', recoveryMethod: 'fallback_to_guest' };
      }

      return { success: false, mode: 'guest', error: 'All recovery strategies failed' };

    } catch (error) {
      debugLogger.logAuth('ERROR', 'Session recovery error', error);
      return { 
        success: false, 
        mode: 'guest', 
        error: error instanceof Error ? error.message : 'Unknown recovery error' 
      };
    } finally {
      this.isRecovering = false;
      this.recoveryAttempts = 0; // Reset on completion
    }
  }

  /**
   * Validate current authentication state
   */
  async validateAuthState(): Promise<AuthValidation> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        debugLogger.logAuth('ERROR', 'Auth validation error', error);
        return {
          isValid: false,
          isExpired: true,
          needsRefresh: false,
          error: error.message
        };
      }

      if (!session) {
        return {
          isValid: false,
          isExpired: true,
          needsRefresh: false
        };
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const expiresIn = expiresAt - now;
      const isExpired = expiresIn <= 0;
      const needsRefresh = expiresIn <= 300; // Refresh if expires in 5 minutes

      debugLogger.logAuth('INFO', 'Auth state validation', {
        isValid: !isExpired,
        expiresIn,
        needsRefresh
      });

      return {
        isValid: !isExpired,
        isExpired,
        needsRefresh,
        expiresIn
      };

    } catch (error) {
      debugLogger.logAuth('ERROR', 'Auth validation failed', error);
      return {
        isValid: false,
        isExpired: true,
        needsRefresh: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Automatic token refresh with retry logic
   */
  async refreshTokenWithRetry(maxRetries = 3): Promise<AuthResult> {
    debugLogger.logAuth('INFO', 'Starting token refresh with retry logic');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          debugLogger.logAuth('WARN', `Token refresh attempt ${attempt} failed`, error);
          
          if (attempt === maxRetries) {
            return {
              success: false,
              mode: 'guest',
              error: `Token refresh failed after ${maxRetries} attempts: ${error.message}`
            };
          }
          
          // Wait before retry with exponential backoff
          const delay = 1000 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        if (data.session) {
          debugLogger.logAuth('INFO', `Token refresh successful on attempt ${attempt}`);
          
          // Update stored session data
          await this.storeSessionData(data.session);
          
          return {
            success: true,
            session: data.session,
            user: data.session.user,
            mode: 'full',
            recoveryMethod: `token_refresh_attempt_${attempt}`
          };
        }

      } catch (error) {
        debugLogger.logAuth('ERROR', `Token refresh attempt ${attempt} error`, error);
        
        if (attempt === maxRetries) {
          return {
            success: false,
            mode: 'guest',
            error: `Token refresh failed after ${maxRetries} attempts`
          };
        }
      }
    }

    return {
      success: false,
      mode: 'guest',
      error: 'Token refresh failed - no valid session returned'
    };
  }

  /**
   * Recovery from Supabase client
   */
  private async recoverFromSupabase(): Promise<AuthResult> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        debugLogger.logAuth('WARN', 'Supabase session recovery error', error);
        return { success: false, mode: 'guest', error: error.message };
      }

      if (session) {
        const validation = await this.validateSessionIntegrity(session);
        if (validation.isValid) {
          return {
            success: true,
            session,
            user: session.user,
            mode: 'full',
            recoveryMethod: 'supabase_client'
          };
        } else if (validation.needsRefresh) {
          // Try to refresh the token
          return await this.refreshTokenWithRetry();
        }
      }

      return { success: false, mode: 'guest', error: 'No valid session found' };
    } catch (error) {
      debugLogger.logAuth('ERROR', 'Supabase recovery failed', error);
      return { 
        success: false, 
        mode: 'guest', 
        error: error instanceof Error ? error.message : 'Supabase recovery error' 
      };
    }
  }

  /**
   * Recovery from localStorage
   */
  private async recoverFromLocalStorage(validateIntegrity = true): Promise<AuthResult> {
    try {
      // Check for Supabase auth tokens in localStorage
      const authKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('supabase.auth.token') || 
        key.includes('sb-') || 
        key === 'session-backup'
      );

      if (authKeys.length === 0) {
        return { success: false, mode: 'guest', error: 'No auth data in localStorage' };
      }

      debugLogger.logAuth('INFO', 'Found auth data in localStorage', { keys: authKeys });

      // Try to restore session from backup
      const sessionBackup = localStorage.getItem('session-backup');
      if (sessionBackup) {
        try {
          const session = JSON.parse(sessionBackup) as Session;
          
          if (validateIntegrity) {
            const validation = await this.validateSessionIntegrity(session);
            if (!validation.isValid) {
              if (validation.needsRefresh) {
                return await this.refreshTokenWithRetry();
              }
              return { success: false, mode: 'guest', error: 'Session backup invalid' };
            }
          }

          return {
            success: true,
            session,
            user: session.user,
            mode: 'full',
            recoveryMethod: 'localStorage_backup'
          };
        } catch (parseError) {
          debugLogger.logAuth('WARN', 'Failed to parse session backup', parseError);
        }
      }

      // If we have auth keys but no valid session, try to trigger Supabase recovery
      return { success: false, mode: 'guest', error: 'Auth data found but no valid session' };

    } catch (error) {
      debugLogger.logAuth('ERROR', 'localStorage recovery failed', error);
      return { 
        success: false, 
        mode: 'guest', 
        error: error instanceof Error ? error.message : 'localStorage recovery error' 
      };
    }
  }

  /**
   * Recovery from sessionStorage
   */
  private async recoverFromSessionStorage(validateIntegrity = true): Promise<AuthResult> {
    try {
      const sessionBackup = sessionStorage.getItem('session-backup');
      if (!sessionBackup) {
        return { success: false, mode: 'guest', error: 'No session backup in sessionStorage' };
      }

      const session = JSON.parse(sessionBackup) as Session;
      
      if (validateIntegrity) {
        const validation = await this.validateSessionIntegrity(session);
        if (!validation.isValid) {
          if (validation.needsRefresh) {
            return await this.refreshTokenWithRetry();
          }
          return { success: false, mode: 'guest', error: 'Session backup invalid' };
        }
      }

      return {
        success: true,
        session,
        user: session.user,
        mode: 'full',
        recoveryMethod: 'sessionStorage_backup'
      };

    } catch (error) {
      debugLogger.logAuth('ERROR', 'sessionStorage recovery failed', error);
      return { 
        success: false, 
        mode: 'guest', 
        error: error instanceof Error ? error.message : 'sessionStorage recovery error' 
      };
    }
  }

  /**
   * Recovery from IndexedDB (for PWA/TWA environments)
   */
  private async recoverFromIndexedDB(validateIntegrity = true): Promise<AuthResult> {
    try {
      if (!('indexedDB' in window)) {
        return { success: false, mode: 'guest', error: 'IndexedDB not supported' };
      }

      // Try to open auth database
      const dbRequest = indexedDB.open('auth-recovery', 1);
      
      return new Promise<AuthResult>((resolve) => {
        dbRequest.onerror = () => {
          resolve({ success: false, mode: 'guest', error: 'IndexedDB access failed' });
        };

        dbRequest.onsuccess = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          try {
            const transaction = db.transaction(['sessions'], 'readonly');
            const store = transaction.objectStore('sessions');
            const request = store.get('current-session');

            request.onsuccess = async () => {
              if (request.result && request.result.session) {
                const session = request.result.session as Session;
                
                if (validateIntegrity) {
                  const validation = await this.validateSessionIntegrity(session);
                  if (!validation.isValid) {
                    if (validation.needsRefresh) {
                      const refreshResult = await this.refreshTokenWithRetry();
                      resolve(refreshResult);
                      return;
                    }
                    resolve({ success: false, mode: 'guest', error: 'IndexedDB session invalid' });
                    return;
                  }
                }

                resolve({
                  success: true,
                  session,
                  user: session.user,
                  mode: 'full',
                  recoveryMethod: 'indexedDB'
                });
              } else {
                resolve({ success: false, mode: 'guest', error: 'No session in IndexedDB' });
              }
            };

            request.onerror = () => {
              resolve({ success: false, mode: 'guest', error: 'IndexedDB read failed' });
            };

          } catch (error) {
            resolve({ 
              success: false, 
              mode: 'guest', 
              error: error instanceof Error ? error.message : 'IndexedDB transaction error' 
            });
          }
        };

        dbRequest.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('sessions')) {
            db.createObjectStore('sessions');
          }
        };
      });

    } catch (error) {
      debugLogger.logAuth('ERROR', 'IndexedDB recovery failed', error);
      return { 
        success: false, 
        mode: 'guest', 
        error: error instanceof Error ? error.message : 'IndexedDB recovery error' 
      };
    }
  }

  /**
   * Validate session integrity and expiration
   */
  private async validateSessionIntegrity(session: Session): Promise<AuthValidation> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const expiresIn = expiresAt - now;
      const isExpired = expiresIn <= 0;
      const needsRefresh = expiresIn <= 300; // Refresh if expires in 5 minutes

      // Check if required fields are present
      const hasRequiredFields = !!(
        session.access_token &&
        session.refresh_token &&
        session.user &&
        session.user.id
      );

      const isValid = !isExpired && hasRequiredFields;

      debugLogger.logAuth('INFO', 'Session integrity validation', {
        isValid,
        isExpired,
        needsRefresh,
        expiresIn,
        hasRequiredFields
      });

      return {
        isValid,
        isExpired,
        needsRefresh,
        expiresIn
      };

    } catch (error) {
      debugLogger.logAuth('ERROR', 'Session validation failed', error);
      return {
        isValid: false,
        isExpired: true,
        needsRefresh: false,
        error: error instanceof Error ? error.message : 'Validation error'
      };
    }
  }

  /**
   * Store session data across multiple storage mechanisms
   */
  private async storeSessionData(session: Session): Promise<void> {
    try {
      // Store in sessionStorage as backup
      sessionStorage.setItem('session-backup', JSON.stringify(session));
      
      // Store in IndexedDB for PWA/TWA persistence
      if ('indexedDB' in window) {
        const dbRequest = indexedDB.open('auth-recovery', 1);
        
        dbRequest.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['sessions'], 'readwrite');
          const store = transaction.objectStore('sessions');
          
          store.put({
            session,
            timestamp: Date.now()
          }, 'current-session');
        };

        dbRequest.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('sessions')) {
            db.createObjectStore('sessions');
          }
        };
      }

      debugLogger.logAuth('INFO', 'Session data stored successfully');
    } catch (error) {
      debugLogger.logAuth('WARN', 'Failed to store session data', error);
    }
  }

  /**
   * Clear all stored session data
   */
  async clearStoredSessions(): Promise<void> {
    try {
      // Clear sessionStorage
      sessionStorage.removeItem('session-backup');
      
      // Clear localStorage auth items
      const authKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('supabase.auth.token') || 
        key.includes('sb-') || 
        key === 'session-backup'
      );
      
      authKeys.forEach(key => localStorage.removeItem(key));
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        const dbRequest = indexedDB.open('auth-recovery', 1);
        
        dbRequest.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['sessions'], 'readwrite');
          const store = transaction.objectStore('sessions');
          store.clear();
        };
      }

      debugLogger.logAuth('INFO', 'All stored session data cleared');
    } catch (error) {
      debugLogger.logAuth('WARN', 'Failed to clear stored session data', error);
    }
  }
}

// Export singleton instance
export const authRecoverySystem = AuthRecoverySystem.getInstance();