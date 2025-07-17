
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
    backgroundColor: '#F3E8FF'
  },
  ios: {
    backgroundColor: '#F3E8FF'
  }
};

export default config;
