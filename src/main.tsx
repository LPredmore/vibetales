
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { debugLogger } from './utils/debugLogger'

// Android-specific initialization logging
const isAndroid = /Android/i.test(navigator.userAgent);
const isWebView = navigator.userAgent.includes('wv');

console.log('🚀 StoryBridge PWA starting on Android:', isAndroid);
console.log('📱 WebView detected:', isWebView);
console.log('🌐 URL:', window.location.href);
console.log('🔧 VitePWA will handle service worker registration');

// Initialize comprehensive logging for Android debugging
debugLogger.logLifecycle('INFO', 'Android PWA main.tsx loading', {
  buildTimestamp: new Date().toISOString(),
  url: window.location.href,
  userAgent: navigator.userAgent,
  isAndroid,
  isWebView,
  serviceWorkerSupported: 'serviceWorker' in navigator,
  rootElement: !!document.getElementById("root"),
  displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
});

// Set up monitoring
debugLogger.setupNetworkMonitoring();
debugLogger.setupStorageMonitoring();
debugLogger.markPerformance('android-app-render-start');

// Enhanced Android error handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Android unhandled promise rejection:', event.reason);
  debugLogger.logError('CRITICAL', 'Android unhandled promise rejection', {
    reason: event.reason?.toString(),
    stack: event.reason?.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    isAndroid,
    isWebView
  });
});

window.addEventListener('error', (event) => {
  console.error('❌ Android global error:', event.error);
  debugLogger.logError('CRITICAL', 'Android global error caught', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack,
    url: window.location.href,
    isAndroid,
    isWebView
  });
});

// Android-specific startup logging
if (isAndroid) {
  console.log('📱 Android device detected - Enhanced logging enabled');
  debugLogger.logAndroid('INFO', 'Android device PWA startup', {
    version: navigator.userAgent.match(/Android (\d+\.?\d*)/)?.[1],
    webView: isWebView,
    chrome: navigator.userAgent.includes('Chrome'),
    viewport: { width: window.innerWidth, height: window.innerHeight },
    screen: { width: screen.width, height: screen.height },
    devicePixelRatio: window.devicePixelRatio
  });
}

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    const error = new Error('Root element not found in Android PWA');
    debugLogger.logError('CRITICAL', 'Android PWA root element not found', { 
      documentReady: document.readyState,
      bodyChildren: document.body?.children.length,
      headChildren: document.head?.children.length,
      isAndroid,
      isWebView
    });
    throw error;
  }

  console.log('✅ Android PWA root element found:', rootElement);
  debugLogger.logLifecycle('INFO', 'Android PWA root element found, creating React root');
  
  const root = createRoot(rootElement);
  
  debugLogger.logLifecycle('INFO', 'Android PWA rendering App component');
  console.log('⚛️ Android PWA rendering React App...');
  
  root.render(<App />);
  
  debugLogger.measurePerformance('android-react-render', 'android-app-render-start');
  debugLogger.logLifecycle('INFO', 'Android PWA App component render call completed');
  console.log('✅ Android PWA React render call completed');
  
  // Android-specific render verification
  setTimeout(() => {
    const loader = document.getElementById('initial-loader');
    const rootChildren = rootElement.children;
    
    if (rootChildren.length > 1 || (rootChildren.length === 1 && !rootChildren[0].id)) {
      console.log('✅ Android PWA React content detected, hiding loader');
      debugLogger.logLifecycle('INFO', 'Android PWA React content rendered successfully');
      if (loader) {
        loader.style.display = 'none';
      }
    } else {
      console.warn('⚠️ Android PWA React may not have rendered properly');
      debugLogger.logLifecycle('WARN', 'Android PWA React render verification failed', {
        rootChildren: rootChildren.length,
        firstChildId: rootChildren[0]?.id,
        firstChildTag: rootChildren[0]?.tagName,
        isAndroid,
        isWebView
      });
    }
  }, 100);
  
} catch (error) {
  console.error('❌ CRITICAL: Android PWA initialization failed:', error);
  debugLogger.logError('CRITICAL', 'Android PWA failed to render application', {
    error: error.message,
    stack: error.stack,
    rootElementExists: !!document.getElementById("root"),
    documentReady: document.readyState,
    url: window.location.href,
    userAgent: navigator.userAgent,
    isAndroid,
    isWebView
  });
  
  // Show emergency error screen for Android
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
  
  throw error;
}
