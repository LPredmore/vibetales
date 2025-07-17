
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.66097099bf56454e886215aab2304cbc',
  appName: 'StoryBridge',
  webDir: 'dist',
  server: {
    url: 'https://lexileap.lovable.app',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#F3E8FF',
    // Enhanced Android WebView settings
    webViewRenderMode: 'hardware',
    useLegacyBridge: false,
    loggingBehavior: 'debug'
  },
  ios: {
    backgroundColor: '#F3E8FF'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#F3E8FF',
      showSpinner: true,
      spinnerColor: '#8B5CF6'
    }
  }
};

export default config;
