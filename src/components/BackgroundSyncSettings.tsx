import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, CheckCircle, XCircle } from 'lucide-react';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';

export const BackgroundSyncSettings = () => {
  const { status, registerSync, queueTask } = useBackgroundSync();

  const handleToggleSync = async () => {
    if (!status.isRegistered) {
      await registerSync();
    }
  };

  const handleManualSync = () => {
    queueTask('update-check');
    queueTask('sync-preferences');
    queueTask('cleanup-cache');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status.isSupported ? (
            <Wifi className="h-5 w-5 text-primary" />
          ) : (
            <WifiOff className="h-5 w-5 text-muted-foreground" />
          )}
          Background Sync
        </CardTitle>
        <CardDescription>
          Keep your app updated and synced automatically in the background
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Support Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Browser Support</span>
          <Badge variant={status.isSupported ? "default" : "secondary"}>
            {status.isSupported ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Supported
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Not Supported
              </>
            )}
          </Badge>
        </div>

        {/* Registration Status */}
        {status.isSupported && (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Background Sync</div>
              <div className="text-xs text-muted-foreground">
                Automatically sync when app is in background
              </div>
            </div>
            <Switch
              checked={status.isRegistered}
              onCheckedChange={handleToggleSync}
              disabled={!status.isSupported}
            />
          </div>
        )}

        {/* Permissions Status */}
        {status.isRegistered && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Notifications</span>
            <Badge variant={status.hasPermissions ? "default" : "outline"}>
              {status.hasPermissions ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        )}

        {/* Error Display */}
        {status.error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{status.error}</p>
          </div>
        )}

        {/* Manual Sync Button */}
        {status.isRegistered && (
          <Button
            onClick={handleManualSync}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Sync Now
          </Button>
        )}

        {/* Info Text */}
        <div className="text-xs text-muted-foreground space-y-2">
          <p>
            Background sync helps keep your app up-to-date and ensures your data is synced 
            even when the app is not actively being used.
          </p>
          {status.isSupported && (
            <p>
              • App updates will be checked periodically<br/>
              • User preferences will be synchronized<br/>
              • Old cache data will be cleaned up automatically
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};