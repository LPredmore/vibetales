
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bestselfs.vibetales.twa',
  appName: 'VibeTales',
  webDir: 'dist',
  server: {
    url: 'https://vibetales.bestselfs.com',
    cleartext: true,
    // Enhanced server configuration for Play Store compatibility
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'vibetales.bestselfs.com'
  },
  android: {
    // Play Store compatibility optimizations
    allowMixedContent: false, // Stricter security for Play Store
    webContentsDebuggingEnabled: false, // Disable in production for security
    backgroundColor: '#F3E8FF',
    
    // Enhanced Android WebView settings for better Play Store compatibility
    useLegacyBridge: false,
    loggingBehavior: 'production', // Reduced logging for production
    
    // TWA-specific optimizations
    appendUserAgent: 'VibeTales/2.0.1 TWA',
    overrideUserAgent: undefined,
    
    // Enhanced WebView settings for consistent behavior
  },
  ios: {
    backgroundColor: '#F3E8FF'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500, // Reduced for faster startup
      backgroundColor: '#F3E8FF',
      showSpinner: true,
      spinnerColor: '#8B5CF6',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      iosFadeInDuration: 150, // Faster transitions
      iosFadeOutDuration: 150,
      // Enhanced splash screen settings
      launchAutoHide: true,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
      // Enhanced keyboard handling
      resizeMode: 'native'
    },
    // Enhanced App plugin configuration
    App: {
      launchUrl: 'https://vibetales.bestselfs.com',
      // App state and lifecycle management
      backgroundMode: false,
      // URL handling for TWA
      allowNavigationToExternalSite: false
    },
    // Network plugin for connectivity monitoring
    Network: {
      // Network status monitoring
      enabled: true
    },
    // Device plugin for hardware info
    Device: {
      // Device information access
      enabled: true
    },
    // Status bar configuration
    StatusBar: {
      style: 'dark',
      backgroundColor: '#F3E8FF',
      overlaysWebView: false
    }
  }
};

export default config;
