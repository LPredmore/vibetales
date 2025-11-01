import { useCallback, useRef } from 'react';

interface PendingUpdate {
  key: string;
  value: string;
}

/**
 * Hook to batch localStorage writes for better performance.
 * Instead of writing immediately on every change, collects changes
 * and writes them all at once after a short delay.
 */
export const useLocalStorageBatch = (debounceMs: number = 300) => {
  const pendingUpdates = useRef<Map<string, string>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flushUpdates = useCallback(() => {
    if (pendingUpdates.current.size === 0) return;

    // Batch write all pending updates
    pendingUpdates.current.forEach((value, key) => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn(`Failed to save ${key} to localStorage:`, error);
      }
    });

    pendingUpdates.current.clear();
  }, []);

  const setItem = useCallback((key: string, value: string) => {
    // Add to pending updates
    pendingUpdates.current.set(key, value);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule batch write
    timeoutRef.current = setTimeout(flushUpdates, debounceMs);
  }, [debounceMs, flushUpdates]);

  const setItemImmediate = useCallback((key: string, value: string) => {
    // Force immediate write
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    flushUpdates();
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Failed to save ${key} to localStorage:`, error);
    }
  }, [flushUpdates]);

  return { setItem, setItemImmediate, flushUpdates };
};
