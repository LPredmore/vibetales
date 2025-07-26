
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Minimal initialization - avoid heavy debug logging on startup
const isDev = process.env.NODE_ENV === 'development';
const isDebugMode = localStorage.getItem('enable-debug') === 'true' || 
                   window.location.search.includes('debug=true');

// Essential error handling only
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('❌ Global error:', event.error);
});

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }

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
    }
  }, 100);
  
} catch (error) {
  console.error('❌ CRITICAL: App initialization failed:', error);
  
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
