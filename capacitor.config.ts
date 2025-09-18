
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bestselfs.vibetales.twa',
  appName: 'VibeTales',
  webDir: 'dist',
  server: {
    url: 'https://vibetales.bestselfs.com',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#F3E8FF',
    // Enhanced Android WebView settings for better compatibility
    webViewRenderMode: 'hardware',
    useLegacyBridge: false,
    // Additional Android-specific settings
    appendUserAgent: 'VibeTales/1.0',
    overrideUserAgent: undefined,
    handleColor: '#8B5CF6',
    // WebView settings
    mixedContentMode: 'compatibility',
    // Performance optimizations
    hardwareAccelerated: true
  },
  ios: {
    backgroundColor: '#F3E8FF'
  },
  plugins: {
    PurchasesPlugin: {
      // RevenueCat will be initialized programmatically with user-specific settings
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#F3E8FF',
      showSpinner: true,
      spinnerColor: '#8B5CF6',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      iosFadeInDuration: 200,
      iosFadeOutDuration: 200
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    }
  }
};

export default config;
