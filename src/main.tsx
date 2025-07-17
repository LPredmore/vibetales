
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { debugLogger } from './utils/debugLogger'

// Initialize comprehensive logging for Android debugging
debugLogger.logLifecycle('INFO', 'Application main.tsx loading', {
  buildTimestamp: new Date().toISOString(),
  url: window.location.href,
  userAgent: navigator.userAgent,
  serviceWorkerSupported: 'serviceWorker' in navigator,
  rootElement: !!document.getElementById("root"),
  bypassSW: localStorage.getItem('bypass-sw'),
  forceReload: localStorage.getItem('force-reload'),
  isAndroid: /Android/i.test(navigator.userAgent),
  isWebView: navigator.userAgent.includes('wv'),
  displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
});

// Set up monitoring
debugLogger.setupNetworkMonitoring();
debugLogger.setupStorageMonitoring();
debugLogger.markPerformance('app-render-start');

// Enhanced error handling specifically for Android WebView
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
  debugLogger.logError('CRITICAL', 'Unhandled promise rejection', {
    reason: event.reason?.toString(),
    stack: event.reason?.stack,
    url: window.location.href,
    userAgent: navigator.userAgent
  });
  
  // Prevent the default browser error handling that might show blank screen
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('❌ Global error:', event.error);
  debugLogger.logError('CRITICAL', 'Global error caught', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack,
    url: window.location.href
  });
  
  // Don't prevent default for script errors as we want them to be handled
});

// Android-specific startup logging
if (/Android/i.test(navigator.userAgent)) {
  console.log('📱 Android device detected - Enhanced logging enabled');
  debugLogger.logAndroid('INFO', 'Android device startup', {
    version: navigator.userAgent.match(/Android (\d+\.?\d*)/)?.[1],
    webView: navigator.userAgent.includes('wv'),
    chrome: navigator.userAgent.includes('Chrome'),
    viewport: { width: window.innerWidth, height: window.innerHeight },
    screen: { width: screen.width, height: screen.height },
    devicePixelRatio: window.devicePixelRatio
  });
}

// Legacy console logs for immediate visibility
console.log('🚀 StoryBridge PWA starting...');
console.log('📱 User Agent:', navigator.userAgent);
console.log('🔧 Service Worker supported:', 'serviceWorker' in navigator);
console.log('🚫 Service Worker bypass:', localStorage.getItem('bypass-sw'));
console.log('🔄 Force reload flag:', localStorage.getItem('force-reload'));
console.log('🏗️ Build timestamp:', new Date().toISOString());

// Clear force reload flag after reading it
if (localStorage.getItem('force-reload')) {
  localStorage.removeItem('force-reload');
}

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    const error = new Error('Root element not found');
    debugLogger.logError('CRITICAL', 'Root element not found in DOM', { 
      documentReady: document.readyState,
      bodyChildren: document.body?.children.length,
      headChildren: document.head?.children.length,
      entireHTML: document.documentElement.outerHTML.substring(0, 500)
    });
    throw error;
  }

  // Log successful root element detection
  console.log('✅ Root element found:', rootElement);
  debugLogger.logLifecycle('INFO', 'Root element found, creating React root');
  
  const root = createRoot(rootElement);
  
  debugLogger.logLifecycle('INFO', 'Rendering App component');
  console.log('⚛️ Rendering React App...');
  
  root.render(<App />);
  
  debugLogger.measurePerformance('react-render', 'app-render-start');
  debugLogger.logLifecycle('INFO', 'App component render call completed');
  console.log('✅ React render call completed');
  
  // Notify loading indicators that React is attempting to render
  setTimeout(() => {
    const loader = document.getElementById('initial-loader');
    const rootChildren = rootElement.children;
    
    // Check if React actually rendered content
    if (rootChildren.length > 1 || (rootChildren.length === 1 && !rootChildren[0].id)) {
      console.log('✅ React content detected, hiding loader');
      debugLogger.logLifecycle('INFO', 'React content rendered successfully');
      if (loader) {
        loader.style.display = 'none';
      }
    } else {
      console.warn('⚠️ React may not have rendered properly');
      debugLogger.logLifecycle('WARN', 'React render verification failed', {
        rootChildren: rootChildren.length,
        firstChildId: rootChildren[0]?.id,
        firstChildTag: rootChildren[0]?.tagName
      });
    }
  }, 100);
  
} catch (error) {
  console.error('❌ CRITICAL: App initialization failed:', error);
  debugLogger.logError('CRITICAL', 'Failed to render application', {
    error: error.message,
    stack: error.stack,
    rootElementExists: !!document.getElementById("root"),
    documentReady: document.readyState,
    url: window.location.href,
    userAgent: navigator.userAgent
  });
  
  // Show emergency error screen immediately on critical failure
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
      
      console.log('🚨 Emergency screen activated due to critical error');
    }
  }, 100);
  
  // Re-throw to ensure error is visible in console
  throw error;
}
