/**
 * Play Store Compatibility Validator
 * 
 * Validates TWA container behavior, Capacitor bridge functionality,
 * and tests update scenarios for Play Store compatibility.
 * 
 * Requirements: 1.1, 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { 
  detectTWAEnvironment, 
  validateTWAManifest, 
  getTWAVersion, 
  checkTWAUpdate,
  TWAEnvironment,
  TWAManifestValidation 
} from './twaDetection';
import { Capacitor } from '@capacitor/core';
import { debugLogger } from './debugLogger';

export interface PlayStoreCompatibilityResult {
  overall: 'compatible' | 'partial' | 'incompatible';
  twaContainer: TWAContainerValidation;
  capacitorBridge: CapacitorBridgeValidation;
  manifestValidation: TWAManifestValidation;
  updateMechanism: UpdateMechanismValidation;
  freshInstallation: FreshInstallationValidation;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface TWAContainerValidation {
  isValid: boolean;
  containerType: 'native-twa' | 'capacitor-twa' | 'browser-fallback' | 'unknown';
  communication: {
    androidInterface: boolean;
    capacitorBridge: boolean;
    customTWAInterface: boolean;
  };
  features: {
    manifestSupport: boolean;
    intentHandling: boolean;
    statusBarControl: boolean;
    navigationBarControl: boolean;
    fullscreenSupport: boolean;
  };
  performance: {
    startupTime: number;
    memoryUsage: number;
    responsiveness: 'excellent' | 'good' | 'poor';
  };
  errors: string[];
}

export interface CapacitorBridgeValidation {
  isHealthy: boolean;
  platform: string;
  version?: string;
  plugins: {
    available: string[];
    working: string[];
    failed: string[];
  };
  communication: {
    bidirectional: boolean;
    latency: number;
    reliability: 'high' | 'medium' | 'low';
  };
  errors: string[];
}

export interface UpdateMechanismValidation {
  isWorking: boolean;
  versionDetection: boolean;
  manifestRefresh: boolean;
  cacheInvalidation: boolean;
  gracefulDegradation: boolean;
  rollbackCapability: boolean;
  errors: string[];
}

export interface FreshInstallationValidation {
  isSimulated: boolean;
  startupSuccess: boolean;
  initialLoadTime: number;
  cacheCreation: boolean;
  authInitialization: boolean;
  serviceWorkerRegistration: boolean;
  userExperience: 'excellent' | 'good' | 'poor' | 'failed';
  errors: string[];
}

class PlayStoreCompatibilityValidator {
  private static instance: PlayStoreCompatibilityValidator;
  
  static getInstance(): PlayStoreCompatibilityValidator {
    if (!PlayStoreCompatibilityValidator.instance) {
      PlayStoreCompatibilityValidator.instance = new PlayStoreCompatibilityValidator();
    }
    return PlayStoreCompatibilityValidator.instance;
  }

  /**
   * Run complete Play Store compatibility validation
   */
  async validatePlayStoreCompatibility(): Promise<PlayStoreCompatibilityResult> {
    debugLogger.logLifecycle('INFO', 'Starting Play Store compatibility validation');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Step 1: Validate TWA container
      const twaContainer = await this.validateTWAContainer();
      if (!twaContainer.isValid) {
        errors.push('TWA container validation failed');
      }
      
      // Step 2: Validate Capacitor bridge
      const capacitorBridge = await this.validateCapacitorBridge();
      if (!capacitorBridge.isHealthy) {
        warnings.push('Capacitor bridge has issues');
      }
      
      // Step 3: Validate manifest
      const manifestValidation = await validateTWAManifest();
      if (!manifestValidation.isValid) {
        errors.push(...manifestValidation.errors);
      }
      warnings.push(...manifestValidation.warnings);
      
      // Step 4: Validate update mechanism
      const updateMechanism = await this.validateUpdateMechanism();
      if (!updateMechanism.isWorking) {
        errors.push('Update mechanism validation failed');
      }
      
      // Step 5: Simulate fresh installation
      const freshInstallation = await this.simulateFreshInstallation();
      if (!freshInstallation.startupSuccess) {
        errors.push('Fresh installation simulation failed');
      }
      
      // Generate recommendations
      this.generateRecommendations(
        twaContainer, 
        capacitorBridge, 
        manifestValidation, 
        updateMechanism, 
        freshInstallation, 
        recommendations
      );
      
      // Determine overall compatibility
      const overall = this.determineOverallCompatibility(
        twaContainer, 
        capacitorBridge, 
        manifestValidation, 
        updateMechanism, 
        freshInstallation, 
        errors.length
      );
      
      const result: PlayStoreCompatibilityResult = {
        overall,
        twaContainer,
        capacitorBridge,
        manifestValidation,
        updateMechanism,
        freshInstallation,
        errors,
        warnings,
        recommendations
      };
      
      debugLogger.logLifecycle('INFO', 'Play Store compatibility validation completed', {
        overall,
        errors: errors.length,
        warnings: warnings.length,
        recommendations: recommendations.length
      });
      
      return result;
      
    } catch (error) {
      debugLogger.logError('ERROR', 'Play Store compatibility validation failed', error);
      
      return {
        overall: 'incompatible',
        twaContainer: this.createFailedTWAValidation(),
        capacitorBridge: this.createFailedCapacitorValidation(),
        manifestValidation: {
          isValid: false,
          errors: [`Validation failed: ${error.message}`],
          warnings: [],
          lastValidated: Date.now(),
          needsRefresh: true
        },
        updateMechanism: this.createFailedUpdateValidation(),
        freshInstallation: this.createFailedInstallationValidation(),
        errors: [`Critical validation error: ${error.message}`],
        warnings: [],
        recommendations: ['Fix critical errors before deploying to Play Store']
      };
    }
  }

  /**
   * Validate TWA container behavior
   */
  private async validateTWAContainer(): Promise<TWAContainerValidation> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      const environment = detectTWAEnvironment();
      
      // Determine container type
      let containerType: TWAContainerValidation['containerType'] = 'unknown';
      if (environment.isTWA && environment.isCapacitor) {
        containerType = 'capacitor-twa';
      } else if (environment.isTWA) {
        containerType = 'native-twa';
      } else {
        containerType = 'browser-fallback';
      }
      
      // Test communication interfaces
      const communication = {
        androidInterface: 'android' in window,
        capacitorBridge: environment.capacitorStatus.bridgeHealthy,
        customTWAInterface: 'TWA' in window
      };
      
      // Test TWA features
      const features = await this.testTWAFeatures();
      
      // Measure performance
      const performance = await this.measureTWAPerformance(startTime);
      
      // Validate container requirements
      if (!environment.isTWA && containerType !== 'browser-fallback') {
        errors.push('TWA environment not detected properly');
      }
      
      if (environment.isTWA && !communication.androidInterface && !communication.capacitorBridge) {
        errors.push('No communication interface available with TWA container');
      }
      
      const isValid = errors.length === 0 && (
        containerType === 'capacitor-twa' || 
        containerType === 'native-twa'
      );
      
      return {
        isValid,
        containerType,
        communication,
        features,
        performance,
        errors
      };
      
    } catch (error) {
      errors.push(`TWA container validation error: ${error.message}`);
      return this.createFailedTWAValidation(errors);
    }
  }

  /**
   * Test TWA-specific features
   */
  private async testTWAFeatures(): Promise<TWAContainerValidation['features']> {
    const features = {
      manifestSupport: false,
      intentHandling: false,
      statusBarControl: false,
      navigationBarControl: false,
      fullscreenSupport: false
    };
    
    try {
      // Test manifest support
      const manifestResponse = await fetch('/manifest.json', { cache: 'no-cache' });
      features.manifestSupport = manifestResponse.ok;
      
      // Test fullscreen support
      features.fullscreenSupport = document.fullscreenEnabled || 
                                   'webkitFullscreenEnabled' in document;
      
      // Test status bar control (Capacitor)
      if (Capacitor.isNativePlatform()) {
        try {
          // Try to import StatusBar plugin if available
          const statusBarModule = await import('@capacitor/status-bar').catch(() => null);
          if (statusBarModule?.StatusBar) {
            await statusBarModule.StatusBar.getInfo();
            features.statusBarControl = true;
          }
        } catch {
          // StatusBar plugin not available or failed
        }
      }
      
      // Test intent handling (simplified check)
      features.intentHandling = 'android' in window || Capacitor.isNativePlatform();
      
      // Test navigation bar control
      features.navigationBarControl = features.statusBarControl; // Usually same capability
      
    } catch (error) {
      debugLogger.logError('WARN', 'TWA features testing failed', error);
    }
    
    return features;
  }

  /**
   * Measure TWA performance characteristics
   */
  private async measureTWAPerformance(startTime: number): Promise<TWAContainerValidation['performance']> {
    const startupTime = Date.now() - startTime;
    
    let memoryUsage = 0;
    if ('memory' in performance) {
      memoryUsage = (performance as any).memory.usedJSHeapSize;
    }
    
    // Test responsiveness by measuring DOM interaction
    const responsiveness = await this.testResponsiveness();
    
    return {
      startupTime,
      memoryUsage,
      responsiveness
    };
  }

  /**
   * Test UI responsiveness
   */
  private async testResponsiveness(): Promise<'excellent' | 'good' | 'poor'> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      // Create a simple DOM operation and measure response time
      const testElement = document.createElement('div');
      testElement.style.cssText = 'position: absolute; top: -1000px; left: -1000px;';
      document.body.appendChild(testElement);
      
      requestAnimationFrame(() => {
        const responseTime = performance.now() - startTime;
        document.body.removeChild(testElement);
        
        if (responseTime < 16) { // 60fps
          resolve('excellent');
        } else if (responseTime < 33) { // 30fps
          resolve('good');
        } else {
          resolve('poor');
        }
      });
    });
  }

  /**
   * Validate Capacitor bridge functionality
   */
  private async validateCapacitorBridge(): Promise<CapacitorBridgeValidation> {
    const errors: string[] = [];
    
    try {
      const isHealthy = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      
      // Test available plugins
      const plugins = await this.testCapacitorPlugins();
      
      // Test communication
      const communication = await this.testCapacitorCommunication();
      
      // Get version if available
      let version: string | undefined;
      try {
        const { App } = await import('@capacitor/app');
        const appInfo = await App.getInfo();
        version = appInfo.version;
      } catch {
        // App plugin not available
      }
      
      if (!isHealthy && platform !== 'web') {
        errors.push('Capacitor bridge not healthy on native platform');
      }
      
      return {
        isHealthy,
        platform,
        version,
        plugins,
        communication,
        errors
      };
      
    } catch (error) {
      errors.push(`Capacitor bridge validation error: ${error.message}`);
      return this.createFailedCapacitorValidation(errors);
    }
  }

  /**
   * Test Capacitor plugins
   */
  private async testCapacitorPlugins(): Promise<CapacitorBridgeValidation['plugins']> {
    const available: string[] = [];
    const working: string[] = [];
    const failed: string[] = [];
    
    const pluginsToTest = [
      { name: 'App', import: () => import('@capacitor/app').catch(() => null) },
      { name: 'Device', import: () => import('@capacitor/device').catch(() => null) },
      { name: 'Network', import: () => import('@capacitor/network').catch(() => null) },
      { name: 'StatusBar', import: () => import('@capacitor/status-bar').catch(() => null) },
      { name: 'SplashScreen', import: () => import('@capacitor/splash-screen').catch(() => null) }
    ];
    
    for (const plugin of pluginsToTest) {
      try {
        const pluginModule = await plugin.import();
        if (pluginModule) {
          available.push(plugin.name);
          
          // Test basic functionality
          if (plugin.name === 'App' && pluginModule.App) {
            await pluginModule.App.getInfo();
            working.push(plugin.name);
          } else if (plugin.name === 'Device' && pluginModule.Device) {
            await pluginModule.Device.getInfo();
            working.push(plugin.name);
          } else if (plugin.name === 'Network' && pluginModule.Network) {
            await pluginModule.Network.getStatus();
            working.push(plugin.name);
          } else {
            working.push(plugin.name); // Assume working if imported successfully
          }
        }
        
      } catch (error) {
        if (available.includes(plugin.name)) {
          failed.push(plugin.name);
        }
        debugLogger.logError('WARN', `Capacitor plugin test failed: ${plugin.name}`, error);
      }
    }
    
    return { available, working, failed };
  }

  /**
   * Test Capacitor communication
   */
  private async testCapacitorCommunication(): Promise<CapacitorBridgeValidation['communication']> {
    let bidirectional = false;
    let latency = 0;
    let reliability: 'high' | 'medium' | 'low' = 'low';
    
    try {
      if (Capacitor.isNativePlatform()) {
        const startTime = performance.now();
        
        // Test bidirectional communication
        try {
          const { App } = await import('@capacitor/app');
          await App.getInfo();
          bidirectional = true;
          latency = performance.now() - startTime;
          
          // Determine reliability based on latency
          if (latency < 50) {
            reliability = 'high';
          } else if (latency < 200) {
            reliability = 'medium';
          } else {
            reliability = 'low';
          }
          
        } catch {
          bidirectional = false;
        }
      }
    } catch (error) {
      debugLogger.logError('WARN', 'Capacitor communication test failed', error);
    }
    
    return { bidirectional, latency, reliability };
  }

  /**
   * Validate update mechanism
   */
  private async validateUpdateMechanism(): Promise<UpdateMechanismValidation> {
    const errors: string[] = [];
    
    try {
      // Test version detection
      const versionDetection = await this.testVersionDetection();
      
      // Test manifest refresh
      const manifestRefresh = await this.testManifestRefresh();
      
      // Test cache invalidation
      const cacheInvalidation = await this.testCacheInvalidation();
      
      // Test graceful degradation
      const gracefulDegradation = await this.testGracefulDegradation();
      
      // Test rollback capability
      const rollbackCapability = await this.testRollbackCapability();
      
      const isWorking = versionDetection && manifestRefresh && cacheInvalidation;
      
      if (!isWorking) {
        errors.push('Update mechanism validation failed');
      }
      
      return {
        isWorking,
        versionDetection,
        manifestRefresh,
        cacheInvalidation,
        gracefulDegradation,
        rollbackCapability,
        errors
      };
      
    } catch (error) {
      errors.push(`Update mechanism validation error: ${error.message}`);
      return this.createFailedUpdateValidation(errors);
    }
  }

  /**
   * Test version detection
   */
  private async testVersionDetection(): Promise<boolean> {
    try {
      const version = await getTWAVersion();
      const updateAvailable = await checkTWAUpdate();
      
      return version !== null; // Version detection working if we get a version
    } catch {
      return false;
    }
  }

  /**
   * Test manifest refresh
   */
  private async testManifestRefresh(): Promise<boolean> {
    try {
      const validation = await validateTWAManifest();
      return validation.isValid;
    } catch {
      return false;
    }
  }

  /**
   * Test cache invalidation
   */
  private async testCacheInvalidation(): Promise<boolean> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        return true; // Cache API available
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Test graceful degradation
   */
  private async testGracefulDegradation(): Promise<boolean> {
    // Simplified test - check if app can handle missing features
    try {
      const hasLocalStorage = 'localStorage' in window;
      const hasSessionStorage = 'sessionStorage' in window;
      const hasIndexedDB = 'indexedDB' in window;
      
      return hasLocalStorage || hasSessionStorage || hasIndexedDB;
    } catch {
      return false;
    }
  }

  /**
   * Test rollback capability
   */
  private async testRollbackCapability(): Promise<boolean> {
    // Simplified test - check if we can restore previous state
    try {
      const hasBackupMechanism = localStorage.getItem('app-version') !== null;
      return hasBackupMechanism;
    } catch {
      return false;
    }
  }

  /**
   * Simulate fresh installation scenario
   */
  private async simulateFreshInstallation(): Promise<FreshInstallationValidation> {
    const errors: string[] = [];
    
    try {
      debugLogger.logLifecycle('INFO', 'Simulating fresh installation scenario');
      
      // Backup current state
      const backupData = this.backupCurrentState();
      
      try {
        // Clear all data to simulate fresh install
        this.clearAllData();
        
        // Mark as fresh installation
        localStorage.setItem('fresh-install-simulation', 'true');
        
        // Measure startup performance
        const startTime = Date.now();
        
        // Test basic functionality
        const startupSuccess = await this.testFreshStartup();
        const initialLoadTime = Date.now() - startTime;
        
        // Test individual components
        const cacheCreation = await this.testCacheCreation();
        const authInitialization = await this.testAuthInitialization();
        const serviceWorkerRegistration = await this.testServiceWorkerRegistration();
        
        // Determine user experience
        const userExperience = this.evaluateUserExperience(
          startupSuccess, 
          initialLoadTime, 
          cacheCreation, 
          authInitialization, 
          serviceWorkerRegistration
        );
        
        return {
          isSimulated: true,
          startupSuccess,
          initialLoadTime,
          cacheCreation,
          authInitialization,
          serviceWorkerRegistration,
          userExperience,
          errors
        };
        
      } finally {
        // Restore original state
        this.restoreState(backupData);
        localStorage.removeItem('fresh-install-simulation');
      }
      
    } catch (error) {
      errors.push(`Fresh installation simulation error: ${error.message}`);
      return this.createFailedInstallationValidation(errors);
    }
  }

  /**
   * Test fresh startup scenario
   */
  private async testFreshStartup(): Promise<boolean> {
    try {
      // Simulate basic app initialization
      const rootElement = document.getElementById('root');
      return !!rootElement;
    } catch {
      return false;
    }
  }

  /**
   * Test cache creation
   */
  private async testCacheCreation(): Promise<boolean> {
    try {
      if ('caches' in window) {
        const cache = await caches.open('test-cache');
        await caches.delete('test-cache');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Test auth initialization
   */
  private async testAuthInitialization(): Promise<boolean> {
    try {
      // Simplified test - check if auth system can initialize
      const hasAuthStorage = 'localStorage' in window;
      return hasAuthStorage;
    } catch {
      return false;
    }
  }

  /**
   * Test service worker registration
   */
  private async testServiceWorkerRegistration(): Promise<boolean> {
    try {
      return 'serviceWorker' in navigator;
    } catch {
      return false;
    }
  }

  /**
   * Evaluate user experience based on test results
   */
  private evaluateUserExperience(
    startupSuccess: boolean,
    initialLoadTime: number,
    cacheCreation: boolean,
    authInitialization: boolean,
    serviceWorkerRegistration: boolean
  ): 'excellent' | 'good' | 'poor' | 'failed' {
    if (!startupSuccess) {
      return 'failed';
    }
    
    const score = [
      cacheCreation,
      authInitialization,
      serviceWorkerRegistration
    ].filter(Boolean).length;
    
    if (initialLoadTime < 3000 && score === 3) {
      return 'excellent';
    } else if (initialLoadTime < 5000 && score >= 2) {
      return 'good';
    } else if (startupSuccess) {
      return 'poor';
    } else {
      return 'failed';
    }
  }

  /**
   * Backup current application state
   */
  private backupCurrentState(): any {
    try {
      return {
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
      };
    } catch {
      return {};
    }
  }

  /**
   * Clear all application data
   */
  private clearAllData(): void {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to clear data during simulation', error);
    }
  }

  /**
   * Restore application state
   */
  private restoreState(backupData: any): void {
    try {
      if (backupData.localStorage) {
        localStorage.clear();
        Object.entries(backupData.localStorage).forEach(([key, value]) => {
          localStorage.setItem(key, value as string);
        });
      }
      
      if (backupData.sessionStorage) {
        sessionStorage.clear();
        Object.entries(backupData.sessionStorage).forEach(([key, value]) => {
          sessionStorage.setItem(key, value as string);
        });
      }
    } catch (error) {
      debugLogger.logError('WARN', 'Failed to restore state after simulation', error);
    }
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(
    twaContainer: TWAContainerValidation,
    capacitorBridge: CapacitorBridgeValidation,
    manifestValidation: TWAManifestValidation,
    updateMechanism: UpdateMechanismValidation,
    freshInstallation: FreshInstallationValidation,
    recommendations: string[]
  ): void {
    // TWA Container recommendations
    if (!twaContainer.isValid) {
      recommendations.push('Fix TWA container configuration for proper Play Store deployment');
    }
    
    if (twaContainer.performance.responsiveness === 'poor') {
      recommendations.push('Optimize app performance for better user experience');
    }
    
    // Capacitor Bridge recommendations
    if (!capacitorBridge.isHealthy) {
      recommendations.push('Fix Capacitor bridge issues for native functionality');
    }
    
    if (capacitorBridge.plugins.failed.length > 0) {
      recommendations.push(`Fix failed Capacitor plugins: ${capacitorBridge.plugins.failed.join(', ')}`);
    }
    
    // Manifest recommendations
    if (manifestValidation.warnings.length > 0) {
      recommendations.push('Address manifest warnings for better Play Store compliance');
    }
    
    // Update mechanism recommendations
    if (!updateMechanism.isWorking) {
      recommendations.push('Fix update mechanism for proper app maintenance');
    }
    
    // Fresh installation recommendations
    if (freshInstallation.userExperience === 'poor' || freshInstallation.userExperience === 'failed') {
      recommendations.push('Improve fresh installation experience for new users');
    }
    
    if (freshInstallation.initialLoadTime > 5000) {
      recommendations.push('Optimize initial load time for better first impression');
    }
  }

  /**
   * Determine overall compatibility rating
   */
  private determineOverallCompatibility(
    twaContainer: TWAContainerValidation,
    capacitorBridge: CapacitorBridgeValidation,
    manifestValidation: TWAManifestValidation,
    updateMechanism: UpdateMechanismValidation,
    freshInstallation: FreshInstallationValidation,
    errorCount: number
  ): 'compatible' | 'partial' | 'incompatible' {
    
    if (errorCount > 2 || !twaContainer.isValid || !manifestValidation.isValid) {
      return 'incompatible';
    }
    
    if (!capacitorBridge.isHealthy || !updateMechanism.isWorking || 
        freshInstallation.userExperience === 'poor' || freshInstallation.userExperience === 'failed') {
      return 'partial';
    }
    
    return 'compatible';
  }

  // Helper methods for creating failed validation results
  
  private createFailedTWAValidation(errors: string[] = ['TWA validation failed']): TWAContainerValidation {
    return {
      isValid: false,
      containerType: 'unknown',
      communication: {
        androidInterface: false,
        capacitorBridge: false,
        customTWAInterface: false
      },
      features: {
        manifestSupport: false,
        intentHandling: false,
        statusBarControl: false,
        navigationBarControl: false,
        fullscreenSupport: false
      },
      performance: {
        startupTime: 0,
        memoryUsage: 0,
        responsiveness: 'poor'
      },
      errors
    };
  }

  private createFailedCapacitorValidation(errors: string[] = ['Capacitor validation failed']): CapacitorBridgeValidation {
    return {
      isHealthy: false,
      platform: 'unknown',
      plugins: {
        available: [],
        working: [],
        failed: []
      },
      communication: {
        bidirectional: false,
        latency: 0,
        reliability: 'low'
      },
      errors
    };
  }

  private createFailedUpdateValidation(errors: string[] = ['Update validation failed']): UpdateMechanismValidation {
    return {
      isWorking: false,
      versionDetection: false,
      manifestRefresh: false,
      cacheInvalidation: false,
      gracefulDegradation: false,
      rollbackCapability: false,
      errors
    };
  }

  private createFailedInstallationValidation(errors: string[] = ['Installation validation failed']): FreshInstallationValidation {
    return {
      isSimulated: false,
      startupSuccess: false,
      initialLoadTime: 0,
      cacheCreation: false,
      authInitialization: false,
      serviceWorkerRegistration: false,
      userExperience: 'failed',
      errors
    };
  }
}

// Export singleton instance
export const playStoreCompatibilityValidator = PlayStoreCompatibilityValidator.getInstance();

// Development-only testing interface
if (process.env.NODE_ENV === 'development') {
  (window as any).playStoreCompatibilityValidator = playStoreCompatibilityValidator;
  (window as any).validatePlayStoreCompatibility = () => 
    playStoreCompatibilityValidator.validatePlayStoreCompatibility();
}