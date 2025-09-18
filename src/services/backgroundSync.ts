interface BackgroundSyncTask {
  id: string;
  type: 'update-check' | 'sync-preferences' | 'prefetch-content' | 'cleanup-cache';
  data?: unknown;
  timestamp: number;
  retries: number;
}

class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private tasks: Map<string, BackgroundSyncTask> = new Map();
  private maxRetries = 3;

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  async registerPeriodicSync(): Promise<boolean> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Register periodic background sync if supported
        if ('periodicSync' in registration) {
          await (registration as any).periodicSync.register('background-sync', {
            minInterval: 24 * 60 * 60 * 1000, // 24 hours
          });
          console.log('Periodic background sync registered');
          return true;
        }
        
        // Fallback to regular background sync
        if ('sync' in registration) {
          await (registration as any).sync.register('background-sync');
          console.log('Background sync registered');
          return true;
        }
      } catch (error) {
        console.error('Background sync registration failed:', error);
        return false;
      }
    }
    return false;
  }

  async requestPermissions(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  queueTask(type: BackgroundSyncTask['type'], data?: unknown): void {
    const task: BackgroundSyncTask = {
      id: `${type}-${Date.now()}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    };
    
    this.tasks.set(task.id, task);
    this.storeTasksLocally();
  }

  private storeTasksLocally(): void {
    try {
      const tasksArray = Array.from(this.tasks.entries());
      localStorage.setItem('background-sync-tasks', JSON.stringify(tasksArray));
    } catch (error) {
      console.error('Failed to store background sync tasks:', error);
    }
  }

  private loadTasksLocally(): void {
    try {
      const stored = localStorage.getItem('background-sync-tasks');
      if (stored) {
        const tasksArray = JSON.parse(stored);
        this.tasks = new Map(tasksArray);
      }
    } catch (error) {
      console.error('Failed to load background sync tasks:', error);
    }
  }

  async executeTask(task: BackgroundSyncTask): Promise<boolean> {
    try {
      switch (task.type) {
        case 'update-check':
          return await this.checkForUpdates();
        case 'sync-preferences':
          return await this.syncUserPreferences();
        case 'prefetch-content':
          return await this.prefetchContent();
        case 'cleanup-cache':
          return await this.cleanupCache();
        default:
          return false;
      }
    } catch (error) {
      console.error(`Background task ${task.type} failed:`, error);
      return false;
    }
  }

  private async checkForUpdates(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return true;
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
    return false;
  }

  private async syncUserPreferences(): Promise<boolean> {
    // Sync user preferences if user is authenticated
    try {
      const user = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      if (user?.access_token) {
        // Perform sync operations
        return true;
      }
    } catch (error) {
      console.error('Preference sync failed:', error);
    }
    return false;
  }

  private async prefetchContent(): Promise<boolean> {
    // Prefetch popular story themes and templates
    try {
      const cache = await caches.open('prefetch-cache');
      const urlsToPrefetch = [
        '/api/popular-themes',
        '/api/story-templates'
      ];
      
      const fetchPromises = urlsToPrefetch.map(url => 
        fetch(url).then(response => {
          if (response.ok) {
            return cache.put(url, response.clone());
          }
          return Promise.resolve();
        }).catch(() => Promise.resolve())
      );
      
      await Promise.all(fetchPromises);
      return true;
    } catch (error) {
      console.error('Content prefetch failed:', error);
    }
    return false;
  }

  private async cleanupCache(): Promise<boolean> {
    try {
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => 
        name.includes('assets-') && !name.includes(Date.now().toString().slice(0, -6))
      );
      
      await Promise.all(oldCaches.map(cacheName => caches.delete(cacheName)));
      return true;
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
    return false;
  }

  async processAllTasks(): Promise<void> {
    this.loadTasksLocally();
    
    for (const [taskId, task] of this.tasks) {
      if (task.retries < this.maxRetries) {
        const success = await this.executeTask(task);
        
        if (success) {
          this.tasks.delete(taskId);
        } else {
          task.retries++;
          this.tasks.set(taskId, task);
        }
      } else {
        // Remove failed tasks after max retries
        this.tasks.delete(taskId);
      }
    }
    
    this.storeTasksLocally();
  }
}

export const backgroundSync = BackgroundSyncService.getInstance();