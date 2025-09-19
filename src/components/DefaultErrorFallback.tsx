import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Download } from 'lucide-react';
import { debugLogger } from '@/utils/debugLogger';

interface DefaultErrorFallbackProps {
  error?: Error;
  resetError: () => void;
}

export const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({ error, resetError }) => {
  const clearCache = () => {
    debugLogger.logError('INFO', 'User initiated cache clear from error boundary');
    localStorage.clear();
    sessionStorage.clear();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
    window.location.reload();
  };

  const downloadLogs = () => {
    try {
      const logs = debugLogger.exportLogs();
      const blob = new Blob([logs], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vibetales-debug-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      debugLogger.logError('INFO', 'Debug logs downloaded by user');
    } catch (downloadError) {
      console.error('Failed to download logs:', downloadError);
      debugLogger.logError('ERROR', 'Failed to download debug logs', downloadError);
    }
  };

  const enableEmergencyMode = () => {
    debugLogger.enableEmergencyMode();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            The app encountered an unexpected error. This might be due to a temporary issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <details className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <summary className="cursor-pointer font-medium">Error details</summary>
              <pre className="mt-2 text-xs overflow-auto">{error.message}</pre>
            </details>
          )}
          <div className="space-y-2">
            <Button onClick={resetError} className="w-full" variant="default">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={clearCache} className="w-full" variant="outline">
              Clear Cache & Reload
            </Button>
            <Button onClick={downloadLogs} className="w-full" variant="secondary">
              <Download className="mr-2 h-4 w-4" />
              Download Debug Logs
            </Button>
            <Button onClick={enableEmergencyMode} className="w-full" variant="destructive" size="sm">
              Enable Emergency Debug Mode
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};