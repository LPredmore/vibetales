import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Download, 
  Shield, 
  Wifi, 
  Settings,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { startupOrchestrator } from '@/utils/startupOrchestrator';
import { diagnosticCollector } from '@/utils/diagnosticDataCollector';
import { debugLogger } from '@/utils/debugLogger';

export interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  icon: React.ReactNode;
  estimatedTime: string;
  requiresReload: boolean;
  execute: () => Promise<RecoveryResult>;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  requiresReload: boolean;
  nextActions?: string[];
}

interface EmergencyRecoveryInterfaceProps {
  isVisible: boolean;
  onClose?: () => void;
  trigger?: 'timeout' | 'error' | 'manual' | 'health-check';
}

export const EmergencyRecoveryInterface: React.FC<EmergencyRecoveryInterfaceProps> = ({
  isVisible,
  onClose,
  trigger = 'manual'
}) => {
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [actionProgress, setActionProgress] = useState(0);
  const [actionResults, setActionResults] = useState<Record<string, RecoveryResult>>({});
  const [diagnosticReport, setDiagnosticReport] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Progressive recovery actions from simple to advanced
  const recoveryActions: RecoveryAction[] = [
    {
      id: 'simple-reload',
      name: 'Simple Reload',
      description: 'Refresh the page to restart the app',
      severity: 'low',
      icon: <RefreshCw className="w-4 h-4" />,
      estimatedTime: '5 seconds',
      requiresReload: true,
      execute: async () => {
        setActionProgress(50);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setActionProgress(100);
        window.location.reload();
        return { success: true, message: 'Page reloaded', requiresReload: true };
      }
    },
    {
      id: 'clear-cache-reload',
      name: 'Clear Cache & Reload',
      description: 'Remove cached data and restart with fresh resources',
      severity: 'medium',
      icon: <Trash2 className="w-4 h-4" />,
      estimatedTime: '10 seconds',
      requiresReload: true,
      execute: async () => {
        setActionProgress(25);
        
        // Clear various caches
        try {
          localStorage.clear();
          sessionStorage.clear();
          setActionProgress(50);
          
          // Clear service worker caches if available
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          setActionProgress(75);
          
          // Clear IndexedDB if possible
          if ('indexedDB' in window) {
            // Note: This is a simplified approach
            try {
              indexedDB.deleteDatabase('vibetales-cache');
            } catch (error) {
              debugLogger.logError('WARN', 'Failed to clear IndexedDB', error);
            }
          }
          
          setActionProgress(100);
          
          // Add cache-busting parameters and reload
          const url = new URL(window.location.href);
          url.searchParams.set('cache-bust', Date.now().toString());
          window.location.href = url.toString();
          
          return { 
            success: true, 
            message: 'Cache cleared and page reloaded with fresh resources', 
            requiresReload: true 
          };
        } catch (error) {
          return { 
            success: false, 
            message: `Cache clearing failed: ${error.message}`, 
            requiresReload: false 
          };
        }
      }
    },
    {
      id: 'hard-reload',
      name: 'Hard Reload',
      description: 'Force reload bypassing all caches with cache-busting',
      severity: 'medium',
      icon: <RefreshCw className="w-4 h-4" />,
      estimatedTime: '15 seconds',
      requiresReload: true,
      execute: async () => {
        setActionProgress(33);
        
        try {
          // Disable service worker temporarily
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          }
          setActionProgress(66);
          
          // Create cache-busting URL with multiple parameters
          const url = new URL(window.location.href);
          url.searchParams.set('v', Date.now().toString());
          url.searchParams.set('hard-reload', '1');
          url.searchParams.set('no-cache', '1');
          
          setActionProgress(100);
          
          // Force hard reload
          window.location.replace(url.toString());
          
          return { 
            success: true, 
            message: 'Hard reload initiated with cache bypass', 
            requiresReload: true 
          };
        } catch (error) {
          return { 
            success: false, 
            message: `Hard reload failed: ${error.message}`, 
            requiresReload: false 
          };
        }
      }
    },
    {
      id: 'safe-mode',
      name: 'Safe Mode',
      description: 'Load with minimal features for maximum compatibility',
      severity: 'high',
      icon: <Shield className="w-4 h-4" />,
      estimatedTime: '20 seconds',
      requiresReload: true,
      execute: async () => {
        setActionProgress(25);
        
        try {
          // Set safe mode flags
          localStorage.setItem('safe-mode', 'true');
          localStorage.setItem('disable-service-worker', 'true');
          localStorage.setItem('minimal-features', 'true');
          setActionProgress(50);
          
          // Clear problematic data
          localStorage.removeItem('auth-cache');
          localStorage.removeItem('user-preferences');
          setActionProgress(75);
          
          // Create safe mode URL
          const url = new URL(window.location.href);
          url.searchParams.set('safe-mode', '1');
          url.searchParams.set('minimal', '1');
          
          setActionProgress(100);
          
          window.location.href = url.toString();
          
          return { 
            success: true, 
            message: 'Safe mode activated with minimal features', 
            requiresReload: true 
          };
        } catch (error) {
          return { 
            success: false, 
            message: `Safe mode activation failed: ${error.message}`, 
            requiresReload: false 
          };
        }
      }
    },
    {
      id: 'network-reset',
      name: 'Network Reset',
      description: 'Reset network-related settings and retry connection',
      severity: 'medium',
      icon: <Wifi className="w-4 h-4" />,
      estimatedTime: '10 seconds',
      requiresReload: false,
      execute: async () => {
        setActionProgress(20);
        
        try {
          // Clear network-related storage
          localStorage.removeItem('network-cache');
          localStorage.removeItem('offline-data');
          setActionProgress(40);
          
          // Reset service worker network settings
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'RESET_NETWORK_CACHE'
            });
          }
          setActionProgress(60);
          
          // Test network connectivity
          try {
            await fetch(window.location.origin + '/favicon.ico', { 
              cache: 'no-cache',
              mode: 'no-cors'
            });
            setActionProgress(80);
          } catch (networkError) {
            debugLogger.logError('WARN', 'Network test failed during reset', networkError);
          }
          
          setActionProgress(100);
          
          return { 
            success: true, 
            message: 'Network settings reset successfully', 
            requiresReload: false,
            nextActions: ['Try reloading the page to test connectivity']
          };
        } catch (error) {
          return { 
            success: false, 
            message: `Network reset failed: ${error.message}`, 
            requiresReload: false 
          };
        }
      }
    },
    {
      id: 'reset-all',
      name: 'Complete Reset',
      description: 'Reset all app data and settings (last resort)',
      severity: 'critical',
      icon: <Settings className="w-4 h-4" />,
      estimatedTime: '30 seconds',
      requiresReload: true,
      execute: async () => {
        setActionProgress(10);
        
        try {
          // Clear all storage
          localStorage.clear();
          sessionStorage.clear();
          setActionProgress(25);
          
          // Clear all caches
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          setActionProgress(50);
          
          // Unregister all service workers
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
          }
          setActionProgress(75);
          
          // Clear IndexedDB databases
          if ('indexedDB' in window) {
            try {
              const databases = ['vibetales-cache', 'vibetales-auth', 'vibetales-data'];
              databases.forEach(db => {
                try {
                  indexedDB.deleteDatabase(db);
                } catch (error) {
                  debugLogger.logError('WARN', `Failed to delete database ${db}`, error);
                }
              });
            } catch (error) {
              debugLogger.logError('WARN', 'Failed to clear some databases', error);
            }
          }
          
          setActionProgress(90);
          
          // Create fresh start URL
          const baseUrl = window.location.origin + window.location.pathname;
          const url = new URL(baseUrl);
          url.searchParams.set('fresh-start', '1');
          url.searchParams.set('reset-complete', '1');
          
          setActionProgress(100);
          
          window.location.href = url.toString();
          
          return { 
            success: true, 
            message: 'Complete reset performed - starting fresh', 
            requiresReload: true 
          };
        } catch (error) {
          return { 
            success: false, 
            message: `Complete reset failed: ${error.message}`, 
            requiresReload: false 
          };
        }
      }
    }
  ];

  // Generate diagnostic report on mount
  useEffect(() => {
    if (isVisible && !diagnosticReport) {
      generateDiagnosticReport();
    }
  }, [isVisible]);

  const generateDiagnosticReport = async () => {
    setIsGeneratingReport(true);
    try {
      const report = await diagnosticCollector.generateDiagnosticReport();
      setDiagnosticReport(report);
      debugLogger.logLifecycle('INFO', 'Emergency diagnostic report generated', {
        reportId: report.metadata.reportId,
        criticalFindings: report.troubleshooting.criticalFindings.length
      });
    } catch (error) {
      debugLogger.logError('ERROR', 'Failed to generate diagnostic report', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const executeRecoveryAction = async (action: RecoveryAction) => {
    setCurrentAction(action.id);
    setActionProgress(0);
    
    debugLogger.logLifecycle('INFO', `Executing recovery action: ${action.name}`, {
      actionId: action.id,
      severity: action.severity,
      trigger
    });
    
    try {
      const result = await action.execute();
      setActionResults(prev => ({ ...prev, [action.id]: result }));
      
      debugLogger.logLifecycle('INFO', `Recovery action completed: ${action.name}`, {
        success: result.success,
        message: result.message
      });
      
      if (!result.requiresReload) {
        setCurrentAction(null);
        setActionProgress(0);
      }
    } catch (error) {
      const errorResult: RecoveryResult = {
        success: false,
        message: `Action failed: ${error.message}`,
        requiresReload: false
      };
      
      setActionResults(prev => ({ ...prev, [action.id]: errorResult }));
      setCurrentAction(null);
      setActionProgress(0);
      
      debugLogger.logError('ERROR', `Recovery action failed: ${action.name}`, error);
    }
  };

  const downloadDiagnosticReport = () => {
    if (!diagnosticReport) return;
    
    try {
      const reportText = diagnosticCollector.exportDiagnosticReport(diagnosticReport, 'json');
      const blob = new Blob([reportText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vibetales-emergency-${diagnosticReport.metadata.reportId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      debugLogger.logLifecycle('INFO', 'Diagnostic report downloaded', {
        reportId: diagnosticReport.metadata.reportId
      });
    } catch (error) {
      debugLogger.logError('ERROR', 'Failed to download diagnostic report', error);
    }
  };

  const getTriggerMessage = () => {
    switch (trigger) {
      case 'timeout':
        return 'The app failed to load within the expected time.';
      case 'error':
        return 'Critical errors were detected during startup.';
      case 'health-check':
        return 'System health monitoring detected issues.';
      default:
        return 'Emergency recovery mode was activated.';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 border-green-200 bg-green-50';
      case 'medium': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'high': return 'text-orange-600 border-orange-200 bg-orange-50';
      case 'critical': return 'text-red-600 border-red-200 bg-red-50';
      default: return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto clay-card">
        <CardHeader className="text-center border-b">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <CardTitle className="text-xl font-bold text-red-700">
              Emergency Recovery
            </CardTitle>
          </div>
          <CardDescription className="text-base">
            {getTriggerMessage()} Choose a recovery option below to restore app functionality.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Current Action Progress */}
          {currentAction && (
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="w-4 h-4" />
              <AlertTitle>Recovery in Progress</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {recoveryActions.find(a => a.id === currentAction)?.name}
                    </span>
                    <span>{actionProgress}%</span>
                  </div>
                  <Progress value={actionProgress} className="w-full" />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Recovery Options</h3>
            <div className="grid gap-3">
              {recoveryActions.slice(0, showAdvanced ? recoveryActions.length : 3).map((action) => {
                const result = actionResults[action.id];
                const isExecuting = currentAction === action.id;
                
                return (
                  <div
                    key={action.id}
                    className={`p-4 rounded-lg border-2 transition-all ${getSeverityColor(action.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {action.icon}
                          <h4 className="font-medium">{action.name}</h4>
                          <span className="text-xs px-2 py-1 rounded-full bg-white/50">
                            {action.estimatedTime}
                          </span>
                        </div>
                        <p className="text-sm opacity-80 mb-3">{action.description}</p>
                        
                        {result && (
                          <div className={`flex items-center gap-2 text-sm ${
                            result.success ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.success ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            <span>{result.message}</span>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => executeRecoveryAction(action)}
                        disabled={isExecuting || !!currentAction}
                        variant={action.severity === 'critical' ? 'destructive' : 'default'}
                        size="sm"
                        className="ml-4"
                      >
                        {isExecuting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          'Try This'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {!showAdvanced && recoveryActions.length > 3 && (
              <Button
                variant="outline"
                onClick={() => setShowAdvanced(true)}
                className="w-full"
              >
                Show Advanced Options
              </Button>
            )}
          </div>

          {/* Diagnostic Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Diagnostic Information</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadDiagnosticReport}
                disabled={!diagnosticReport || isGeneratingReport}
              >
                <Download className="w-4 h-4 mr-2" />
                {isGeneratingReport ? 'Generating...' : 'Download Report'}
              </Button>
            </div>
            
            {diagnosticReport && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <h4 className="font-medium mb-2">System Status</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Environment:</span>
                      <span>{diagnosticReport.twaEnvironment?.isTWA ? 'TWA' : 'Browser'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Network:</span>
                      <span className={diagnosticReport.systemInfo?.network?.online ? 'text-green-600' : 'text-red-600'}>
                        {diagnosticReport.systemInfo?.network?.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Device:</span>
                      <span>{diagnosticReport.systemInfo?.device?.type}</span>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Issues Detected</h4>
                  <div className="space-y-1 text-sm">
                    {diagnosticReport.troubleshooting?.criticalFindings?.length > 0 ? (
                      diagnosticReport.troubleshooting.criticalFindings.slice(0, 3).map((finding: string, index: number) => (
                        <div key={index} className="text-red-600">• {finding}</div>
                      ))
                    ) : (
                      <div className="text-green-600">No critical issues detected</div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close Recovery
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = 'mailto:support@vibetales.com?subject=Emergency Recovery Report'}
            >
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};