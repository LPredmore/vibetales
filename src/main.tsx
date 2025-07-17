
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { debugLogger } from './utils/debugLogger'

// Initialize comprehensive logging
debugLogger.logLifecycle('INFO', 'Application main.tsx loading', {
  buildTimestamp: new Date().toISOString(),
  url: window.location.href,
  userAgent: navigator.userAgent,
  serviceWorkerSupported: 'serviceWorker' in navigator,
  rootElement: !!document.getElementById("root"),
  bypassSW: localStorage.getItem('bypass-sw')
});

// Set up network and storage monitoring
debugLogger.setupNetworkMonitoring();
debugLogger.setupStorageMonitoring();

// Mark performance for app render
debugLogger.markPerformance('app-render-start');

// Enhanced error handling for Android WebView
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  debugLogger.logError('CRITICAL', 'Unhandled promise rejection', {
    reason: event.reason,
    stack: event.reason?.stack
  });
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  debugLogger.logError('CRITICAL', 'Global error caught', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack
  });
});

// Legacy console logs for backward compatibility
console.log('🚀 StoryBridge PWA starting...');
console.log('📱 User Agent:', navigator.userAgent);
console.log('🔧 Service Worker supported:', 'serviceWorker' in navigator);
console.log('🚫 Service Worker bypass:', localStorage.getItem('bypass-sw'));
console.log('🏗️ Build timestamp:', new Date().toISOString());

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    const error = new Error('Root element not found');
    debugLogger.logError('CRITICAL', 'Root element not found', { 
      documentReady: document.readyState,
      bodyChildren: document.body?.children.length,
      headChildren: document.head?.children.length
    });
    throw error;
  }

  debugLogger.logLifecycle('INFO', 'Creating React root');
  const root = createRoot(rootElement);
  
  debugLogger.logLifecycle('INFO', 'Rendering App component');
  root.render(<App />);
  
  debugLogger.measurePerformance('react-render', 'app-render-start');
  debugLogger.logLifecycle('INFO', 'App component rendered successfully');
  
  // Notify emergency screen that React loaded
  setTimeout(() => {
    if (rootElement.children.length > 0) {
      const emergencyEl = document.getElementById('emergency-fallback');
      if (emergencyEl) {
        emergencyEl.style.display = 'none';
      }
    }
  }, 100);
  
} catch (error) {
  console.error('❌ Critical error during app initialization:', error);
  debugLogger.logError('CRITICAL', 'Failed to render application', {
    error: error.message,
    stack: error.stack,
    rootElementExists: !!document.getElementById("root"),
    documentReady: document.readyState
  });
  
  // Show emergency error screen
  setTimeout(() => {
    const emergencyEl = document.getElementById('emergency-fallback');
    if (emergencyEl) {
      emergencyEl.style.display = 'block';
      const errorInfo = emergencyEl.querySelector('#diagnostic-info');
      if (errorInfo) {
        errorInfo.innerHTML += `<div style="color: red; margin-top: 10px;">❌ Error: ${error.message}</div>`;
      }
    }
  }, 100);
}
