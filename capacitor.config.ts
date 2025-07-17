import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.66097099bf56454e886215aab2304cbc',
  appName: 'storybridgeapp',
  webDir: 'dist',
  server: {
    url: 'https://storybridgeapp.lovable.app',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;