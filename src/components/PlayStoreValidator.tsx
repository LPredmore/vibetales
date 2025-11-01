/**
 * Play Store Validator Component
 * 
 * Provides comprehensive validation for Play Store compatibility including
 * fresh installation scenarios, TWA container behavior, and update handling.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download, 
  RefreshCw,
  Play,
  Settings,
  Wifi,
  Clock,
  Shield,
  Package,
  Zap
} from 'lucide-react';
import { 
  playStoreCompatibilityValidator, 
  PlayStoreCompatibilityResult,
  TWAContainerValidation,
  CapacitorBridgeValidation,
  UpdateMechanismValidation,
  FreshInstallationValidation
} from '@/utils/playStoreCompatibilityValidator';
import { detectTWAEnvironment, TWAEnvironment } from '@/utils/twaDetection';
import { debugLogger } from '@/utils/debugLogger';

interface PlayStoreValidatorProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export const PlayStoreValidator: React.FC<PlayStoreValidatorProps> = ({
  isVisible = false,
  onClose
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [compatibilityResult, setCompatibilityResult] = useState<PlayStoreCompatibilityResult | null>(null);
  const [twaEnvironment, setTwaEnvironment] = useState<TWAEnvironment | null>(null);
  const [currentValidation, setCurrentValidation] = useState<string>('');

  useEffect(() => {
    if (isVisible) {
      // Detect TWA environment on mount
      const env = detectTWAEnvironment();
      setTwaEnvironment(env);
      
      debugLogger.logLifecycle('INFO', 'Play Store validator opened', {
        isTWA: env.isTWA,
        confidence: env.confidence
      });
    }
  }, [isVisible]);

  const runFullValidation = async () => {
    setIsValidating(true);
    setValidationProgress(0);
    setCurrentValidation('Starting validation...');
    
    try {
      debugLogger.logLifecycle('INFO', 'Starting Play Store compatibility validation');
      
      // Simulate progress updates
      const progressSteps = [
        { progress: 10, message: 'Detecting TWA environment...' },
        { progress: 25, message: 'Validating TWA container...' },
        { progress: 40, message: 'Testing Capacitor bridge...' },
        { progress: 55, message: 'Checking manifest compliance...' },
        { progress: 70, message: 'Testing update mechanisms...' },
        { progress: 85, message: 'Simulating fresh installation...' },
        { progress: 100, message: 'Validation complete' }
      ];
      
      for (const step of progressSteps) {
        setValidationProgress(step.progress);
        setCurrentValidation(step.message);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const result = await playStoreCompatibilityValidator.validatePlayStoreCompatibility();
      setCompatibilityResult(result);
      
      debugLogger.logLifecycle('INFO', 'Play Store compatibility validation completed', {
        overall: result.overall,
        errors: result.errors.length,
        warnings: result.warnings.length
      });
      
    } catch (error) {
      debugLogger.logError('ERROR', 'Play Store validation failed', error);
      setCurrentValidation('Validation failed');
    } finally {
      setIsValidating(false);
      setCurrentValidation('');
    }
  };

  const runQuickCheck = async () => {
    setIsValidating(true);
    setCurrentValidation('Running quick compatibility check...');
    
    try {
      // Quick validation focusing on critical issues
      const result = await playStoreCompatibilityValidator.validatePlayStoreCompatibility();
      setCompatibilityResult(result);
    } catch (error) {
      debugLogger.logError('ERROR', 'Quick validation failed', error);
    } finally {
      setIsValidating(false);
      setCurrentValidation('');
    }
  };

  const downloadValidationReport = () => {
    if (!compatibilityResult) return;
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: twaEnvironment,
      compatibility: compatibilityResult,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        validationTime: Date.now()
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `play-store-validation-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCompatibilityColor = (overall: string) => {
    switch (overall) {
      case 'compatible': return 'text-green-600 bg-green-50 border-green-200';
      case 'partial': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'incompatible': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getValidationIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const renderTWAContainerValidation = (twaContainer: TWAContainerValidation) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            TWA Container
          </CardTitle>
          {getValidationIcon(twaContainer.isValid)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium mb-2">Container Information</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Type:</span>
                <Badge variant="outline">{twaContainer.containerType}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Valid:</span>
                <span className={twaContainer.isValid ? 'text-green-600' : 'text-red-600'}>
                  {twaContainer.isValid ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Performance</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Startup Time:</span>
                <span>{twaContainer.performance.startupTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span>Responsiveness:</span>
                <Badge variant={twaContainer.performance.responsiveness === 'excellent' ? 'default' : 'secondary'}>
                  {twaContainer.performance.responsiveness}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Memory:</span>
                <span>{(twaContainer.performance.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Communication Interfaces</h4>
          <div className="grid gap-2 md:grid-cols-3">
            <div className={`p-2 rounded border ${twaContainer.communication.androidInterface ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {getValidationIcon(twaContainer.communication.androidInterface)}
                <span className="text-sm">Android Interface</span>
              </div>
            </div>
            <div className={`p-2 rounded border ${twaContainer.communication.capacitorBridge ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {getValidationIcon(twaContainer.communication.capacitorBridge)}
                <span className="text-sm">Capacitor Bridge</span>
              </div>
            </div>
            <div className={`p-2 rounded border ${twaContainer.communication.customTWAInterface ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {getValidationIcon(twaContainer.communication.customTWAInterface)}
                <span className="text-sm">Custom TWA</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Features</h4>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries(twaContainer.features).map(([feature, supported]) => (
              <div key={feature} className={`p-2 rounded border ${supported ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  {getValidationIcon(supported)}
                  <span className="text-sm capitalize">{feature.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {twaContainer.errors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Container Issues</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside text-sm">
                {twaContainer.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderCapacitorValidation = (capacitorBridge: CapacitorBridgeValidation) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Capacitor Bridge
          </CardTitle>
          {getValidationIcon(capacitorBridge.isHealthy)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium mb-2">Bridge Status</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Platform:</span>
                <Badge variant="outline">{capacitorBridge.platform}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Healthy:</span>
                <span className={capacitorBridge.isHealthy ? 'text-green-600' : 'text-red-600'}>
                  {capacitorBridge.isHealthy ? 'Yes' : 'No'}
                </span>
              </div>
              {capacitorBridge.version && (
                <div className="flex justify-between">
                  <span>Version:</span>
                  <span>{capacitorBridge.version}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Communication</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Bidirectional:</span>
                <span className={capacitorBridge.communication.bidirectional ? 'text-green-600' : 'text-red-600'}>
                  {capacitorBridge.communication.bidirectional ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Latency:</span>
                <span>{capacitorBridge.communication.latency.toFixed(1)}ms</span>
              </div>
              <div className="flex justify-between">
                <span>Reliability:</span>
                <Badge variant={capacitorBridge.communication.reliability === 'high' ? 'default' : 'secondary'}>
                  {capacitorBridge.communication.reliability}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Plugin Status</h4>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{capacitorBridge.plugins.working.length}</div>
                <div className="text-sm text-green-600">Working</div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{capacitorBridge.plugins.available.length}</div>
                <div className="text-sm text-blue-600">Available</div>
              </div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{capacitorBridge.plugins.failed.length}</div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
            </div>
          </div>
          
          {capacitorBridge.plugins.working.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Working Plugins:</p>
              <div className="flex flex-wrap gap-1">
                {capacitorBridge.plugins.working.map((plugin, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {plugin}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {capacitorBridge.plugins.failed.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1 text-red-600">Failed Plugins:</p>
              <div className="flex flex-wrap gap-1">
                {capacitorBridge.plugins.failed.map((plugin, index) => (
                  <Badge key={index} variant="destructive" className="text-xs">
                    {plugin}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {capacitorBridge.errors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Bridge Issues</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside text-sm">
                {capacitorBridge.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderUpdateValidation = (updateMechanism: UpdateMechanismValidation) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Update Mechanism
          </CardTitle>
          {getValidationIcon(updateMechanism.isWorking)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-2">
          {Object.entries({
            'Version Detection': updateMechanism.versionDetection,
            'Manifest Refresh': updateMechanism.manifestRefresh,
            'Cache Invalidation': updateMechanism.cacheInvalidation,
            'Graceful Degradation': updateMechanism.gracefulDegradation,
            'Rollback Capability': updateMechanism.rollbackCapability
          }).map(([feature, working]) => (
            <div key={feature} className={`p-3 rounded border ${working ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2">
                {getValidationIcon(working)}
                <span className="text-sm font-medium">{feature}</span>
              </div>
            </div>
          ))}
        </div>

        {updateMechanism.errors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Update Issues</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside text-sm">
                {updateMechanism.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderFreshInstallValidation = (freshInstallation: FreshInstallationValidation) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Fresh Installation
          </CardTitle>
          {getValidationIcon(freshInstallation.startupSuccess)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium mb-2">Installation Metrics</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Simulated:</span>
                <span className={freshInstallation.isSimulated ? 'text-green-600' : 'text-gray-600'}>
                  {freshInstallation.isSimulated ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Startup Success:</span>
                <span className={freshInstallation.startupSuccess ? 'text-green-600' : 'text-red-600'}>
                  {freshInstallation.startupSuccess ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Load Time:</span>
                <span>{freshInstallation.initialLoadTime}ms</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">User Experience</h4>
            <div className="text-center">
              <Badge 
                variant={freshInstallation.userExperience === 'excellent' ? 'default' : 
                        freshInstallation.userExperience === 'good' ? 'secondary' : 'destructive'}
                className="text-lg px-4 py-2"
              >
                {freshInstallation.userExperience}
              </Badge>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Component Initialization</h4>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries({
              'Cache Creation': freshInstallation.cacheCreation,
              'Auth Initialization': freshInstallation.authInitialization,
              'Service Worker Registration': freshInstallation.serviceWorkerRegistration
            }).map(([component, success]) => (
              <div key={component} className={`p-3 rounded border ${success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {getValidationIcon(success)}
                  <span className="text-sm font-medium">{component}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {freshInstallation.errors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Installation Issues</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside text-sm">
                {freshInstallation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto clay-card">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Smartphone className="w-6 h-6" />
                Play Store Compatibility Validator
              </CardTitle>
              <CardDescription>
                Comprehensive validation for Google Play Store deployment
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={downloadValidationReport}
                variant="outline"
                size="sm"
                disabled={!compatibilityResult}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button onClick={onClose} variant="outline" size="sm">
                Close
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Validation Progress */}
          {isValidating && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <Clock className="w-4 h-4" />
              <AlertTitle>Validation in Progress</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{currentValidation}</span>
                    <span>{validationProgress}%</span>
                  </div>
                  <Progress value={validationProgress} className="w-full" />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Environment Detection */}
          {twaEnvironment && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Environment Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${twaEnvironment.isTWA ? 'text-green-600' : 'text-gray-400'}`}>
                      {twaEnvironment.isTWA ? 'TWA' : 'Not TWA'}
                    </div>
                    <div className="text-sm text-muted-foreground">Environment</div>
                  </div>
                  <div className="text-center">
                    <Badge variant={twaEnvironment.confidence === 'high' ? 'default' : 'secondary'} className="text-lg px-3 py-1">
                      {twaEnvironment.confidence}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">Confidence</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{twaEnvironment.detectionMethods.length}</div>
                    <div className="text-sm text-muted-foreground">Detection Methods</div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Detection Methods:</p>
                  <div className="flex flex-wrap gap-1">
                    {twaEnvironment.detectionMethods.map((method, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <Button
              onClick={runFullValidation}
              disabled={isValidating}
              className="flex-1"
            >
              {isValidating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Full Validation
            </Button>
            <Button
              onClick={runQuickCheck}
              disabled={isValidating}
              variant="outline"
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-2" />
              Quick Check
            </Button>
          </div>

          {/* Validation Results */}
          {compatibilityResult && (
            <div className="space-y-6">
              {/* Overall Compatibility */}
              <Card className={`border-2 ${getCompatibilityColor(compatibilityResult.overall)}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Overall Compatibility</CardTitle>
                    <Badge 
                      variant={compatibilityResult.overall === 'compatible' ? 'default' : 
                              compatibilityResult.overall === 'partial' ? 'secondary' : 'destructive'}
                      className="text-lg px-4 py-2"
                    >
                      {compatibilityResult.overall}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{compatibilityResult.errors.length}</div>
                      <div className="text-sm text-muted-foreground">Errors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{compatibilityResult.warnings.length}</div>
                      <div className="text-sm text-muted-foreground">Warnings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{compatibilityResult.recommendations.length}</div>
                      <div className="text-sm text-muted-foreground">Recommendations</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Validation Results */}
              <Tabs defaultValue="twa-container" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="twa-container">TWA Container</TabsTrigger>
                  <TabsTrigger value="capacitor">Capacitor</TabsTrigger>
                  <TabsTrigger value="updates">Updates</TabsTrigger>
                  <TabsTrigger value="installation">Installation</TabsTrigger>
                </TabsList>

                <TabsContent value="twa-container">
                  {renderTWAContainerValidation(compatibilityResult.twaContainer)}
                </TabsContent>

                <TabsContent value="capacitor">
                  {renderCapacitorValidation(compatibilityResult.capacitorBridge)}
                </TabsContent>

                <TabsContent value="updates">
                  {renderUpdateValidation(compatibilityResult.updateMechanism)}
                </TabsContent>

                <TabsContent value="installation">
                  {renderFreshInstallValidation(compatibilityResult.freshInstallation)}
                </TabsContent>
              </Tabs>

              {/* Issues and Recommendations */}
              {(compatibilityResult.errors.length > 0 || compatibilityResult.warnings.length > 0 || compatibilityResult.recommendations.length > 0) && (
                <div className="space-y-4">
                  {compatibilityResult.errors.length > 0 && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertTitle>Critical Issues</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside text-sm">
                          {compatibilityResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {compatibilityResult.warnings.length > 0 && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertTitle>Warnings</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside text-sm">
                          {compatibilityResult.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {compatibilityResult.recommendations.length > 0 && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <Shield className="w-4 h-4" />
                      <AlertTitle>Recommendations</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside text-sm">
                          {compatibilityResult.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}

          {/* No Results State */}
          {!compatibilityResult && !isValidating && (
            <Card>
              <CardContent className="p-8 text-center">
                <Smartphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  No validation results available. Run a validation to check Play Store compatibility.
                </p>
                <Button onClick={runFullValidation}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Validation
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};