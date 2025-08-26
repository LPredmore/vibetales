// Background sync event handlers for the service worker
// This file will be imported by the main service worker

self.addEventListener('sync', event => {
  console.log('Background sync event triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

self.addEventListener('periodicsync', event => {
  console.log('Periodic background sync event triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handlePeriodicBackgroundSync());
  }
});

async function handleBackgroundSync() {
  try {
    console.log('Executing background sync tasks...');
    
    // Check for app updates
    await checkForAppUpdates();
    
    // Sync user preferences if online
    if (navigator.onLine) {
      await syncUserData();
    }
    
    // Cleanup old caches
    await cleanupOldCaches();
    
    console.log('Background sync completed successfully');
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error; // Re-throw to trigger retry
  }
}

async function handlePeriodicBackgroundSync() {
  try {
    console.log('Executing periodic background sync...');
    
    // More comprehensive sync for periodic execution
    await Promise.all([
      checkForAppUpdates(),
      syncUserData(),
      prefetchPopularContent(),
      cleanupOldCaches(),
      updateCacheStrategies()
    ]);
    
    console.log('Periodic background sync completed successfully');
  } catch (error) {
    console.error('Periodic background sync failed:', error);
    throw error;
  }
}

async function checkForAppUpdates() {
  try {
    // Check for new service worker version
    const registration = await self.registration.update();
    
    // Check for manifest updates
    const manifestResponse = await fetch('/manifest.json', { 
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json();
      console.log('Manifest checked:', manifest.name);
    }
    
    return true;
  } catch (error) {
    console.error('Update check failed:', error);
    return false;
  }
}

async function syncUserData() {
  try {
    // Only sync if we have stored auth data and are online
    if (!navigator.onLine) {
      console.log('Offline - skipping user data sync');
      return false;
    }
    
    // Check if we have pending sync tasks in IndexedDB or localStorage
    const pendingTasks = await getPendingSyncTasks();
    
    for (const task of pendingTasks) {
      try {
        await processSyncTask(task);
        await removeSyncTask(task.id);
      } catch (error) {
        console.error('Failed to process sync task:', task.id, error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('User data sync failed:', error);
    return false;
  }
}

async function prefetchPopularContent() {
  try {
    const cache = await caches.open('prefetch-cache-v1');
    
    // Prefetch common story themes and assets
    const urlsToPrefetch = [
      '/',
      '/placeholder.png',
      // Add other static assets that are commonly used
    ];
    
    const fetchPromises = urlsToPrefetch.map(async url => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response.clone());
        }
      } catch (error) {
        console.log('Failed to prefetch:', url, error);
      }
    });
    
    await Promise.all(fetchPromises);
    return true;
  } catch (error) {
    console.error('Content prefetch failed:', error);
    return false;
  }
}

async function cleanupOldCaches() {
  try {
    const cacheNames = await caches.keys();
    const currentVersion = new Date().toISOString().split('T')[0]; // Today's date
    
    // Delete caches older than 7 days
    const oldCaches = cacheNames.filter(cacheName => {
      if (cacheName.includes('assets-') || cacheName.includes('images-')) {
        const cacheDate = cacheName.split('-').pop();
        if (cacheDate && cacheDate.length >= 8) {
          const daysDiff = Math.floor((Date.now() - parseInt(cacheDate)) / (1000 * 60 * 60 * 24));
          return daysDiff > 7;
        }
      }
      return false;
    });
    
    await Promise.all(oldCaches.map(cacheName => caches.delete(cacheName)));
    
    if (oldCaches.length > 0) {
      console.log('Cleaned up old caches:', oldCaches);
    }
    
    return true;
  } catch (error) {
    console.error('Cache cleanup failed:', error);
    return false;
  }
}

async function updateCacheStrategies() {
  try {
    // Update cache headers and strategies for better performance
    const cache = await caches.open('runtime-cache-v1');
    
    // Remove entries that might have stale headers
    const requests = await cache.keys();
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const responseDate = new Date(response.headers.get('date') || 0);
        const daysSinceResponse = (Date.now() - responseDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // Remove entries older than 3 days
        if (daysSinceResponse > 3) {
          await cache.delete(request);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Cache strategy update failed:', error);
    return false;
  }
}

// Helper functions for sync task management
async function getPendingSyncTasks() {
  try {
    const stored = localStorage.getItem('background-sync-tasks');
    if (stored) {
      const tasksArray = JSON.parse(stored);
      return tasksArray.map(([id, task]) => ({ id, ...task }));
    }
  } catch (error) {
    console.error('Failed to get pending sync tasks:', error);
  }
  return [];
}

async function processSyncTask(task) {
  // Process different types of sync tasks
  switch (task.type) {
    case 'update-check':
      return await checkForAppUpdates();
    case 'sync-preferences':
      return await syncUserPreferences(task.data);
    case 'prefetch-content':
      return await prefetchPopularContent();
    case 'cleanup-cache':
      return await cleanupOldCaches();
    default:
      console.warn('Unknown sync task type:', task.type);
      return false;
  }
}

async function syncUserPreferences(data) {
  // Sync user preferences with server if authenticated
  try {
    if (data && navigator.onLine) {
      // Perform actual sync with your backend
      const response = await fetch('/api/sync-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      return response.ok;
    }
  } catch (error) {
    console.error('Preference sync failed:', error);
  }
  return false;
}

async function removeSyncTask(taskId) {
  try {
    const stored = localStorage.getItem('background-sync-tasks');
    if (stored) {
      const tasksMap = new Map(JSON.parse(stored));
      tasksMap.delete(taskId);
      localStorage.setItem('background-sync-tasks', JSON.stringify(Array.from(tasksMap.entries())));
    }
  } catch (error) {
    console.error('Failed to remove sync task:', error);
  }
}