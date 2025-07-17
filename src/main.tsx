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
  rootElement: !!document.getElementById("root")
});

// Set up network and storage monitoring
debugLogger.setupNetworkMonitoring();
debugLogger.setupStorageMonitoring();

// Mark performance for app render
debugLogger.markPerformance('app-render-start');

// Monitor DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  debugLogger.logLifecycle('INFO', 'DOM content loaded');
  debugLogger.measurePerformance('dom-ready', 'app-init');
});

// Monitor window load
window.addEventListener('load', () => {
  debugLogger.logLifecycle('INFO', 'Window fully loaded');
  debugLogger.measurePerformance('window-load', 'app-init');
});

// Legacy console logs for backward compatibility
console.log('🚀 StoryBridge PWA starting...');
console.log('📱 User Agent:', navigator.userAgent);
console.log('🔧 Service Worker supported:', 'serviceWorker' in navigator);
console.log('🏗️ Build timestamp:', new Date().toISOString());

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    debugLogger.logError('CRITICAL', 'Root element not found', { 
      documentReady: document.readyState,
      bodyChildren: document.body?.children.length
    });
    throw new Error('Root element not found');
  }

  debugLogger.logLifecycle('INFO', 'Creating React root');
  const root = createRoot(rootElement);
  
  debugLogger.logLifecycle('INFO', 'Rendering App component');
  root.render(<App />);
  
  debugLogger.measurePerformance('react-render', 'app-render-start');
  debugLogger.logLifecycle('INFO', 'App component rendered successfully');
  
} catch (error) {
  debugLogger.logError('CRITICAL', 'Failed to render application', {
    error: error.message,
    stack: error.stack
  });
  
  // Show emergency error screen
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial; color: red;">
      <h1>Application Failed to Start</h1>
      <p>Error: ${error.message}</p>
      <p>Check console for details or add ?debug=emergency to URL</p>
      <button onclick="localStorage.clear(); location.reload();">Clear Cache & Reload</button>
    </div>
  `;
}
