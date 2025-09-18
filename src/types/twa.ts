// TWA (Trusted Web App) detection types

export interface TWAManifest {
  name?: string;
  version?: string;
  version_code?: number;
  start_url?: string;
  display?: string;
  theme_color?: string;
  background_color?: string;
  icons?: Array<{
    src: string;
    sizes: string;
    type: string;
  }>;
}

export interface AppVersionInfo {
  app_version: string;
  build_number: string;
  version_name: string;
  last_updated: string;
}

export interface TWAUpdateCheck {
  hasUpdate: boolean;
  currentVersion?: string;
  latestVersion?: string;
  forceUpdate?: boolean;
}

export interface WindowWithTWA extends Window {
  Android?: {
    getPackageName?: () => string;
    getVersionName?: () => string;
    getVersionCode?: () => number;
  };
  chrome?: {
    webview?: {
      getPackageName?: () => string;
    };
  };
}

export interface TWAEnvironmentInfo {
  isTWA: boolean;
  packageName?: string;
  versionName?: string;
  versionCode?: number;
  userAgent: string;
  isStandalone: boolean;
}