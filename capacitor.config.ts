
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.66097099bf56454e886215aab2304cbc',
  appName: 'StoryBridge',
  webDir: 'dist',
  server: {
    url: 'https://storybridgeapp.lovable.app',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#F3E8FF',
    // Enhanced Android WebView settings for better compatibility
    webViewRenderMode: 'hardware',
    useLegacyBridge: false,
    loggingBehavior: 'debug',
    // Additional Android-specific settings
    appendUserAgent: 'StoryBridge/1.0',
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
