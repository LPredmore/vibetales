
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { startupSystemIntegration } from './utils/startupSystemIntegration'
import { StartupPhase } from './utils/startupErrorDetection'
import { debugLogger } from './utils/debugLogger'

// Integrated startup system initialization
const initializeApp = async () => {
  try {
    debugLogger.logLifecycle('INFO', 'Starting integrated app initialization');
    
    // Initialize the complete startup system with all components
    const result = await startupSystemIntegration.initializeSystem();
    
    debugLogger.logLifecycle('INFO', 'Integrated startup system result', {
      success: result.success,
      mode: result.mode,
      environment: result.environment.isTWA ? 'TWA' : result.environment.isPWA ? 'PWA' : 'Browser',
      errors: result.errors.length,
      warnings: result.warnings.length,
      totalTiming: result.timing.total
    });
    
    return result;
  } catch (error) {
    debugLogger.logError('CRITICAL', 'Integrated app initialization failed', error);
    throw error;
  }
};

// Start integrated initialization
initializeApp().catch(error => {
  console.error('❌ Critical integrated initialization failure:', error);
  
  // Trigger emergency recovery as last resort
  window.dispatchEvent(new CustomEvent('activate-emergency-mode'));
});

// Minimal initialization - avoid heavy debug logging on startup
const isDev = process.env.NODE_ENV === 'development';
const isDebugMode = localStorage.getItem('enable-debug') === 'true' || 
                   window.location.search.includes('debug=true');

// Clear old caches on version update
const clearOldCaches = async () => {
  try {
    startupOrchestrator.updatePhase(StartupPhase.INITIAL_LOAD);
    
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

// Run cache clearing before app initialization
clearOldCaches();

try {
  startupOrchestrator.updatePhase(StartupPhase.SCRIPT_LOADING);
  
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  startupOrchestrator.updatePhase(StartupPhase.REACT_MOUNT);
  const root = createRoot(rootElement);
  root.render(<App />);
  
  // Simple render verification
  setTimeout(() => {
    const loader = document.getElementById('initial-loader');
    const rootChildren = rootElement.children;
    
    if (rootChildren.length > 1 || (rootChildren.length === 1 && !rootChildren[0].id)) {
      if (loader) {
        loader.style.display = 'none';
      }
      startupOrchestrator.updatePhase(StartupPhase.APP_READY);
    }
  }, 100);
  
} catch (error) {
  console.error('❌ CRITICAL: App initialization failed:', error);
  debugLogger.logError('CRITICAL', 'App initialization failed', error);
  
  // Show emergency screen
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
        errorDiv.innerHTML = `❌ Critical Error: ${error.message}`;
        errorInfo.appendChild(errorDiv);
      }
    }
  }, 100);
  
  throw error;
}

// Lazy load debug logger only when needed - with TWA diagnostics
const shouldEnableDebug = isDev || isDebugMode || window.location.search.includes('debug=emergency');

if (shouldEnableDebug) {
  import('./utils/debugLogger').then(({ debugLogger }) => {
    debugLogger.logLifecycle('INFO', 'Debug logger loaded');
    
    // Run comprehensive TWA startup diagnostics
    setTimeout(() => {
      debugLogger.logTWAStartup();
    }, 1000);
  });
}
