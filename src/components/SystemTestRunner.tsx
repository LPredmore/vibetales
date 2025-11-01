/**
 * System Test Runner Component
 * 
 * Provides a UI for running comprehensive system tests across different
 * environments and conditions with real-time results display.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Square, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Download,
  RefreshCw,
  Monitor,
  Smartphone,
  Wifi,
  WifiOff,
  Settings
} from 'lucide-react';
import { systemTestingUtility, TestSuite, TestResult, TestScenario } from '@/utils/systemTestingUtility';
import { playStoreCompatibilityValidator, PlayStoreCompatibilityResult } from '@/utils/playStoreCompatibilityValidator';
import { debugLogger } from '@/utils/debugLogger';

interface SystemTestRunnerProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export const SystemTestRunner: React.FC<SystemTestRunnerProps> = ({
  isVisible = false,
  onClose
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testProgress, setTestProgress] = useState(0);
  const [testSuite, setTestSuite] = useState<TestSuite | null>(null);
  const [compatibilityResult, setCompatibilityResult] = useState<PlayStoreCompatibilityResult | null>(null);
  const [performanceResults, setPerformanceResults] = useState<any>(null);
  const [recoveryResults, setRecoveryResults] = useState<any>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  // Get available test scenarios
  const testScenarios = systemTestingUtility.getTestScenarios();
  const testEnvironments = systemTestingUtility.getTestEnvironments();

  useEffect(() => {
    // Monitor current test status
    const checkCurrentTest = () => {
      const current = systemTestingUtility.getCurrentTest();
      setCurrentTest(current);
    };

    const interval = setInterval(checkCurrentTest, 1000);
    return () => clearInterval(interval);
  }, []);

  const runFullTestSuite = async () => {
    setIsRunning(true);
    setTestProgress(0);
    
    try {
      debugLogger.logLifecycle('INFO', 'Starting full system test suite');
      
      // Run system tests
      setTestProgress(10);
      const suite = await systemTestingUtility.runTestSuite('Comprehensive System Test');
      setTestSuite(suite);
      
      // Run compatibility validation
      setTestProgress(40);
      const compatibility = await playStoreCompatibilityValidator.validatePlayStoreCompatibility();
      setCompatibilityResult(compatibility);
      
      // Run performance tests
      setTestProgress(70);
      const performance = await systemTestingUtility.runPerformanceTest();
      setPerformanceResults(performance);
      
      // Run recovery tests
      setTestProgress(90);
      const recovery = await systemTestingUtility.testRecoveryMechanisms();
      setRecoveryResults(recovery);
      
      setTestProgress(100);
      
      debugLogger.logLifecycle('INFO', 'Full system test suite completed', {
        systemTests: suite.summary,
        compatibility: compatibility.overall,
        performance: performance.averageStartupTime
      });
      
    } catch (error) {
      debugLogger.logError('ERROR', 'System test suite failed', error);
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  };

  const runSingleScenario = async (scenarioId: string) => {
    setIsRunning(true);
    setSelectedScenario(scenarioId);
    
    try {
      const result = await systemTestingUtility.runScenario(scenarioId);
      
      // Update test suite with single result
      const scenario = testScenarios.find(s => s.id === scenarioId);
      if (scenario) {
        setTestSuite({
          name: 'Single Scenario Test',
          description: `Test for scenario: ${scenario.name}`,
          scenarios: [scenario],
          results: [result],
          summary: {
            total: 1,
            passed: result.success ? 1 : 0,
            failed: result.success ? 0 : 1,
            duration: result.timing.total
          }
        });
      }
      
    } catch (error) {
      debugLogger.logError('ERROR', 'Single scenario test failed', error);
    } finally {
      setIsRunning(false);
      setSelectedScenario(null);
    }
  };

  const runCompatibilityTest = async () => {
    setIsRunning(true);
    
    try {
      const result = await playStoreCompatibilityValidator.validatePlayStoreCompatibility();
      setCompatibilityResult(result);
    } catch (error) {
      debugLogger.logError('ERROR', 'Compatibility test failed', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runPerformanceTest = async () => {
    setIsRunning(true);
    
    try {
      const result = await systemTestingUtility.runPerformanceTest();
      setPerformanceResults(result);
    } catch (error) {
      debugLogger.logError('ERROR', 'Performance test failed', error);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadTestReport = () => {
    if (!testSuite && !compatibilityResult && !performanceResults) return;
    
    const report = {
      timestamp: new Date().toISOString(),
      testSuite,
      compatibilityResult,
      performanceResults,
      recoveryResults,
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-test-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getEnvironmentIcon = (environment: string) => {
    switch (environment) {
      case 'twa-fresh':
        return <Smartphone className="w-4 h-4" />;
      case 'pwa-returning':
        return <Monitor className="w-4 h-4" />;
      case 'slow-network':
        return <Wifi className="w-4 h-4 text-yellow-500" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      case 'limited-storage':
        return <Settings className="w-4 h-4 text-orange-500" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getCompatibilityBadge = (overall: string) => {
    const variants = {
      compatible: 'default',
      partial: 'secondary',
      incompatible: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[overall as keyof typeof variants] || 'secondary'}>
        {overall}
      </Badge>
    );
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto clay-card">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">System Test Runner</CardTitle>
              <CardDescription>
                Comprehensive testing across different environments and conditions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={downloadTestReport}
                variant="outline"
                size="sm"
                disabled={!testSuite && !compatibilityResult && !performanceResults}
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
          {/* Test Progress */}
          {isRunning && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <Clock className="w-4 h-4" />
              <AlertTitle>Test in Progress</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{currentTest || selectedScenario || 'Running tests...'}</span>
                    <span>{testProgress}%</span>
                  </div>
                  <Progress value={testProgress} className="w-full" />
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
              <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Full Test Suite</p>
                        <p className="text-xs text-muted-foreground">All scenarios</p>
                      </div>
                      <Button
                        onClick={runFullTestSuite}
                        disabled={isRunning}
                        size="sm"
                      >
                        {isRunning ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Compatibility</p>
                        <p className="text-xs text-muted-foreground">Play Store</p>
                      </div>
                      <Button
                        onClick={runCompatibilityTest}
                        disabled={isRunning}
                        size="sm"
                        variant="outline"
                      >
                        <Smartphone className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Performance</p>
                        <p className="text-xs text-muted-foreground">Load testing</p>
                      </div>
                      <Button
                        onClick={runPerformanceTest}
                        disabled={isRunning}
                        size="sm"
                        variant="outline"
                      >
                        <Monitor className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Test Status</p>
                        <p className="text-xs text-muted-foreground">
                          {testSuite ? `${testSuite.summary.passed}/${testSuite.summary.total} passed` : 'Not run'}
                        </p>
                      </div>
                      {testSuite && (
                        <div className="text-right">
                          {testSuite.summary.failed === 0 ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Summary */}
              {(testSuite || compatibilityResult || performanceResults) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Test Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {testSuite && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">System Tests</p>
                          <p className="text-sm text-muted-foreground">
                            {testSuite.summary.passed} passed, {testSuite.summary.failed} failed
                          </p>
                        </div>
                        <Badge variant={testSuite.summary.failed === 0 ? 'default' : 'destructive'}>
                          {testSuite.summary.failed === 0 ? 'All Passed' : `${testSuite.summary.failed} Failed`}
                        </Badge>
                      </div>
                    )}

                    {compatibilityResult && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Play Store Compatibility</p>
                          <p className="text-sm text-muted-foreground">
                            {compatibilityResult.errors.length} errors, {compatibilityResult.warnings.length} warnings
                          </p>
                        </div>
                        {getCompatibilityBadge(compatibilityResult.overall)}
                      </div>
                    )}

                    {performanceResults && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Performance</p>
                          <p className="text-sm text-muted-foreground">
                            Avg: {performanceResults.averageStartupTime.toFixed(0)}ms, 
                            P95: {performanceResults.p95StartupTime.toFixed(0)}ms
                          </p>
                        </div>
                        <Badge variant={performanceResults.averageStartupTime < 3000 ? 'default' : 'secondary'}>
                          {performanceResults.averageStartupTime < 3000 ? 'Good' : 'Needs Improvement'}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Scenarios Tab */}
            <TabsContent value="scenarios" className="space-y-6">
              <div className="grid gap-4">
                {testScenarios.map((scenario) => {
                  const result = testSuite?.results.find(r => r.scenario === scenario.id);
                  
                  return (
                    <Card key={scenario.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getEnvironmentIcon(scenario.environment)}
                              <h4 className="font-medium">{scenario.name}</h4>
                              <Badge variant="outline">{scenario.expectedOutcome}</Badge>
                              {result && getStatusIcon(result.success)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {scenario.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Environment: {scenario.environment}</span>
                              {result && (
                                <>
                                  <span>Mode: {result.mode}</span>
                                  <span>Time: {result.timing.total}ms</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={() => runSingleScenario(scenario.id)}
                            disabled={isRunning}
                            size="sm"
                            variant="outline"
                          >
                            {isRunning && selectedScenario === scenario.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Compatibility Tab */}
            <TabsContent value="compatibility" className="space-y-6">
              {compatibilityResult ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Overall Compatibility</CardTitle>
                        {getCompatibilityBadge(compatibilityResult.overall)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="font-medium mb-2">TWA Container</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Valid:</span>
                              <span className={compatibilityResult.twaContainer.isValid ? 'text-green-600' : 'text-red-600'}>
                                {compatibilityResult.twaContainer.isValid ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Type:</span>
                              <span>{compatibilityResult.twaContainer.containerType}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Performance:</span>
                              <span>{compatibilityResult.twaContainer.performance.responsiveness}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Capacitor Bridge</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Healthy:</span>
                              <span className={compatibilityResult.capacitorBridge.isHealthy ? 'text-green-600' : 'text-red-600'}>
                                {compatibilityResult.capacitorBridge.isHealthy ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Platform:</span>
                              <span>{compatibilityResult.capacitorBridge.platform}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Plugins:</span>
                              <span>{compatibilityResult.capacitorBridge.plugins.working.length} working</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {compatibilityResult.errors.length > 0 && (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertTriangle className="w-4 h-4" />
                          <AlertTitle>Errors</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside text-sm">
                              {compatibilityResult.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {compatibilityResult.recommendations.length > 0 && (
                        <Alert className="border-blue-200 bg-blue-50">
                          <AlertTriangle className="w-4 h-4" />
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
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">No compatibility test results available</p>
                    <Button onClick={runCompatibilityTest} disabled={isRunning}>
                      <Smartphone className="w-4 h-4 mr-2" />
                      Run Compatibility Test
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              {performanceResults ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Startup Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Average Startup Time:</span>
                          <span className="font-mono">{performanceResults.averageStartupTime.toFixed(0)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>95th Percentile:</span>
                          <span className="font-mono">{performanceResults.p95StartupTime.toFixed(0)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Memory Usage:</span>
                          <span className="font-mono">{(performanceResults.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Error Rate:</span>
                          <span className={`font-mono ${performanceResults.errorRate > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {(performanceResults.errorRate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Test Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Iterations:</span>
                          <span>{performanceResults.iterations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Success Rate:</span>
                          <span className="text-green-600">
                            {((1 - performanceResults.errorRate) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">No performance test results available</p>
                    <Button onClick={runPerformanceTest} disabled={isRunning}>
                      <Monitor className="w-4 h-4 mr-2" />
                      Run Performance Test
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="space-y-6">
              {testSuite ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Test Results Summary</CardTitle>
                      <CardDescription>
                        {testSuite.summary.total} tests, {testSuite.summary.passed} passed, {testSuite.summary.failed} failed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {testSuite.results.map((result, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(result.success)}
                                <h4 className="font-medium">{result.scenario}</h4>
                                <Badge variant="outline">{result.mode}</Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {result.timing.total}ms
                              </span>
                            </div>
                            
                            {result.errors.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-red-600 mb-1">Errors:</p>
                                <ul className="list-disc list-inside text-sm text-red-600">
                                  {result.errors.map((error, errorIndex) => (
                                    <li key={errorIndex}>{error}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {result.warnings.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-yellow-600 mb-1">Warnings:</p>
                                <ul className="list-disc list-inside text-sm text-yellow-600">
                                  {result.warnings.map((warning, warningIndex) => (
                                    <li key={warningIndex}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">No test results available</p>
                    <Button onClick={runFullTestSuite} disabled={isRunning}>
                      <Play className="w-4 h-4 mr-2" />
                      Run Full Test Suite
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};