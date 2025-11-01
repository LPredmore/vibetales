
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🚀 VibeTales starting...');

// Clear old caches on version update
const clearOldCaches = async () => {
  try {
    const currentVersion = '2.0.1';
    const storedVersion = localStorage.getItem('app-version');
    
    if (storedVersion && storedVersion !== currentVersion) {
      console.log('🔄 Version changed, clearing caches...');
      
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('✅ Cache cleared - old version removed');
      }
    }
    
    localStorage.setItem('app-version', currentVersion);
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
};

// Clear caches asynchronously (non-blocking)
clearOldCaches();

// Render React immediately
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  console.log('✅ Rendering React app...');
  const root = createRoot(rootElement);
  root.render(<App />);
  
  // Hide loader after 2 seconds maximum (fallback)
  setTimeout(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.display = 'none';
      console.log('✅ Loader hidden (timeout)');
    }
  }, 2000);
  
} catch (error) {
  console.error('❌ CRITICAL: React render failed:', error);
  
  // Show emergency screen immediately
  setTimeout(() => {
    const emergencyEl = document.getElementById('emergency-fallback');
    const loaderEl = document.getElementById('initial-loader');
    
    if (emergencyEl && loaderEl) {
      loaderEl.style.display = 'none';
      emergencyEl.style.display = 'block';
      
      const errorInfo = emergencyEl.querySelector('#diagnostic-info');
      if (errorInfo) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'color: red; margin-top: 10px; font-weight: bold;';
        errorDiv.innerHTML = `❌ Critical Error: ${(error as Error).message}`;
        errorInfo.appendChild(errorDiv);
      }
    }
  }, 100);
}
