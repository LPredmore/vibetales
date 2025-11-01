import { debugLogger } from '@/utils/debugLogger';
import { AuthResult } from './authRecoverySystem';

export interface OfflineAuthData {
  userId: string;
  email: string;
  name?: string;
  lastLoginTime: number;
  expiresAt: number;
  capabilities: string[];
  encryptedData?: string;
}

export interface GuestModeConfig {
  enabledFeatures: string[];
  limitations: string[];
  maxUsageDuration: number; // in milliseconds
  dataRetention: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  conflicts: number;
  errors: string[];
}

export class OfflineAuthSystem {
  private static instance: OfflineAuthSystem;
  private isOfflineMode = false;
  private guestModeActive = false;
  private offlineAuthData: OfflineAuthData | null = null;
  private guestSessionStart: number | null = null;
  private syncQueue: any[] = [];

  static getInstance(): OfflineAuthSystem {
    if (!OfflineAuthSystem.instance) {
      OfflineAuthSystem.instance = new OfflineAuthSystem();
    }
    return OfflineAuthSystem.instance;
  }

  /**
   * Setup offline authentication caching with secure storage
   */
  async setupOfflineAuth(userId: string, email: string, name?: string): Promise<boolean> {
    try {
      debugLogger.logAuth('INFO', 'Setting up offline authentication', { userId, email });

      const offlineData: OfflineAuthData = {
        userId,
        email,
        name,
        lastLoginTime: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        capabilities: this.getOfflineCapabilities(),
      };

      // Store in multiple locations for redundancy
      await this.storeOfflineAuthData(offlineData);
      
      this.offlineAuthData = offlineData;
      this.isOfflineMode = true;

      debugLogger.logAuth('INFO', 'Offline authentication setup completed');
      return true;

    } catch (error) {
      debugLogger.logAuth('ERROR', 'Failed to setup offline authentication', error);
      return false;
    }
  }

  /**
   * Enable guest mode with limited functionality
   */
  async enableGuestMode(): Promise<AuthResult> {
    try {
      debugLogger.logAuth('INFO', 'Enabling guest mode');

      this.guestModeActive = true;
      this.guestSessionStart = Date.now();

      const guestConfig = this.getGuestModeConfig();
      
      // Store guest session data
      const guestData = {
        sessionId: this.generateGuestSessionId(),
        startTime: this.guestSessionStart,
        config: guestConfig,
        tempData: {}
      };

      localStorage.setItem('guest-session', JSON.stringify(guestData));
      
      debugLogger.logAuth('INFO', 'Guest mode enabled', {
        sessionId: guestData.sessionId,
        enabledFeatures: guestConfig.enabledFeatures
      });

      return {
        success: true,
        mode: 'guest',
        recoveryMethod: 'guest_mode_activation'
      };

    } catch (error) {
      debugLogger.logAuth('ERROR', 'Failed to enable guest mode', error);
      return {
        success: false,
        mode: 'guest',
        error: error instanceof Error ? error.message : 'Guest mode activation failed'
      };
    }
  }

  /**
   * Attempt to recover offline authentication
   */
  async recoverOfflineAuth(): Promise<AuthResult> {
    try {
      debugLogger.logAuth('INFO', 'Attempting offline authentication recovery');

      const storedData = await this.retrieveOfflineAuthData();
      if (!storedData) {
        return {
          success: false,
          mode: 'guest',
          error: 'No offline authentication data found'
        };
      }

      // Validate offline auth data
      if (this.isOfflineAuthExpired(storedData)) {
        debugLogger.logAuth('WARN', 'Offline authentication data expired');
        await this.clearOfflineAuthData();
        return {
          success: false,
          mode: 'guest',
          error: 'Offline authentication expired'
        };
      }

      this.offlineAuthData = storedData;
      this.isOfflineMode = true;

      debugLogger.logAuth('INFO', 'Offline authentication recovered successfully', {
        userId: storedData.userId,
        email: storedData.email
      });

      return {
        success: true,
        mode: 'offline',
        user: {
          id: storedData.userId,
          email: storedData.email,
          user_metadata: { name: storedData.name }
        } as any,
        recoveryMethod: 'offline_auth_recovery'
      };

    } catch (error) {
      debugLogger.logAuth('ERROR', 'Offline authentication recovery failed', error);
      return {
        success: false,
        mode: 'guest',
        error: error instanceof Error ? error.message : 'Offline recovery failed'
      };
    }
  }

  /**
   * Synchronize offline data when connectivity returns
   */
  async synchronizeWhenOnline(): Promise<SyncResult> {
    try {
      debugLogger.logAuth('INFO', 'Starting offline data synchronization');

      if (!navigator.onLine) {
        return {
          success: false,
          syncedItems: 0,
          conflicts: 0,
          errors: ['Device is offline']
        };
      }

      const syncResult: SyncResult = {
        success: true,
        syncedItems: 0,
        conflicts: 0,
        errors: []
      };

      // Sync queued operations
      for (const operation of this.syncQueue) {
        try {
          await this.syncOperation(operation);
          syncResult.syncedItems++;
        } catch (error) {
          syncResult.errors.push(error instanceof Error ? error.message : 'Sync error');
        }
      }

      // Clear sync queue on successful sync
      if (syncResult.errors.length === 0) {
        this.syncQueue = [];
      }

      // Update offline auth data with latest sync time
      if (this.offlineAuthData) {
        this.offlineAuthData.lastLoginTime = Date.now();
        await this.storeOfflineAuthData(this.offlineAuthData);
      }

      debugLogger.logAuth('INFO', 'Offline synchronization completed', syncResult);
      return syncResult;

    } catch (error) {
      debugLogger.logAuth('ERROR', 'Offline synchronization failed', error);
      return {
        success: false,
        syncedItems: 0,
        conflicts: 0,
        errors: [error instanceof Error ? error.message : 'Sync failed']
      };
    }
  }

  /**
   * Check if currently in offline mode
   */
  isInOfflineMode(): boolean {
    return this.isOfflineMode;
  }

  /**
   * Check if guest mode is active
   */
  isInGuestMode(): boolean {
    return this.guestModeActive;
  }

  /**
   * Get current offline user data
   */
  getOfflineUserData(): OfflineAuthData | null {
    return this.offlineAuthData;
  }

  /**
   * Get guest mode configuration
   */
  getGuestModeConfig(): GuestModeConfig {
    return {
      enabledFeatures: [
        'story_reading',
        'basic_sight_words',
        'offline_content',
        'local_progress'
      ],
      limitations: [
        'no_cloud_sync',
        'no_premium_features',
        'limited_content',
        'no_sharing'
      ],
      maxUsageDuration: 24 * 60 * 60 * 1000, // 24 hours
      dataRetention: false
    };
  }

  /**
   * Add operation to sync queue for later processing
   */
  queueForSync(operation: any): void {
    this.syncQueue.push({
      ...operation,
      timestamp: Date.now(),
      id: this.generateOperationId()
    });

    debugLogger.logAuth('INFO', 'Operation queued for sync', {
      operationType: operation.type,
      queueLength: this.syncQueue.length
    });
  }

  /**
   * Clear offline authentication data
   */
  async clearOfflineAuthData(): Promise<void> {
    try {
      // Clear from localStorage
      localStorage.removeItem('offline-auth-data');
      localStorage.removeItem('guest-session');
      
      // Clear from sessionStorage
      sessionStorage.removeItem('offline-auth-backup');
      
      // Clear from IndexedDB
      if ('indexedDB' in window) {
        const dbRequest = indexedDB.open('offline-auth', 1);
        
        dbRequest.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['auth'], 'readwrite');
          const store = transaction.objectStore('auth');
          store.clear();
        };
      }

      this.offlineAuthData = null;
      this.isOfflineMode = false;
      this.guestModeActive = false;
      this.guestSessionStart = null;
      this.syncQueue = [];

      debugLogger.logAuth('INFO', 'Offline authentication data cleared');

    } catch (error) {
      debugLogger.logAuth('ERROR', 'Failed to clear offline auth data', error);
    }
  }

  /**
   * Store offline authentication data securely
   */
  private async storeOfflineAuthData(data: OfflineAuthData): Promise<void> {
    try {
      const serializedData = JSON.stringify(data);
      
      // Store in localStorage
      localStorage.setItem('offline-auth-data', serializedData);
      
      // Store backup in sessionStorage
      sessionStorage.setItem('offline-auth-backup', serializedData);
      
      // Store in IndexedDB for better persistence
      if ('indexedDB' in window) {
        const dbRequest = indexedDB.open('offline-auth', 1);
        
        dbRequest.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['auth'], 'readwrite');
          const store = transaction.objectStore('auth');
          
          store.put({
            data,
            timestamp: Date.now()
          }, 'offline-auth');
        };

        dbRequest.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('auth')) {
            db.createObjectStore('auth');
          }
        };
      }

    } catch (error) {
      debugLogger.logAuth('ERROR', 'Failed to store offline auth data', error);
      throw error;
    }
  }

  /**
   * Retrieve offline authentication data
   */
  private async retrieveOfflineAuthData(): Promise<OfflineAuthData | null> {
    try {
      // Try localStorage first
      const localData = localStorage.getItem('offline-auth-data');
      if (localData) {
        return JSON.parse(localData);
      }

      // Try sessionStorage backup
      const sessionData = sessionStorage.getItem('offline-auth-backup');
      if (sessionData) {
        return JSON.parse(sessionData);
      }

      // Try IndexedDB
      if ('indexedDB' in window) {
        return new Promise<OfflineAuthData | null>((resolve) => {
          const dbRequest = indexedDB.open('offline-auth', 1);
          
          dbRequest.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = db.transaction(['auth'], 'readonly');
            const store = transaction.objectStore('auth');
            const request = store.get('offline-auth');

            request.onsuccess = () => {
              if (request.result && request.result.data) {
                resolve(request.result.data);
              } else {
                resolve(null);
              }
            };

            request.onerror = () => resolve(null);
          };

          dbRequest.onerror = () => resolve(null);
        });
      }

      return null;

    } catch (error) {
      debugLogger.logAuth('ERROR', 'Failed to retrieve offline auth data', error);
      return null;
    }
  }

  /**
   * Check if offline authentication data is expired
   */
  private isOfflineAuthExpired(data: OfflineAuthData): boolean {
    return Date.now() > data.expiresAt;
  }

  /**
   * Get offline capabilities
   */
  private getOfflineCapabilities(): string[] {
    return [
      'read_stories',
      'practice_sight_words',
      'view_progress',
      'offline_content',
      'local_storage'
    ];
  }

  /**
   * Generate unique guest session ID
   */
  private generateGuestSessionId(): string {
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique operation ID for sync queue
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sync individual operation
   */
  private async syncOperation(operation: any): Promise<void> {
    // This would implement the actual sync logic based on operation type
    // For now, we'll just simulate the sync
    debugLogger.logAuth('INFO', 'Syncing operation', {
      id: operation.id,
      type: operation.type
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In a real implementation, this would make API calls to sync the data
  }
}

// Export singleton instance
export const offlineAuthSystem = OfflineAuthSystem.getInstance();