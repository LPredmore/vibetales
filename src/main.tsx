import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// PWA update detection and debugging
console.log('🚀 StoryBridge PWA starting...');
console.log('📱 User Agent:', navigator.userAgent);
console.log('🔧 Service Worker supported:', 'serviceWorker' in navigator);

// Add build timestamp for cache busting
console.log('🏗️ Build timestamp:', new Date().toISOString());

createRoot(document.getElementById("root")!).render(<App />);
