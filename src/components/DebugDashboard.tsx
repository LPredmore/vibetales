import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { debugLogger, LogEntry } from '@/utils/debugLogger';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { X, Download, Trash2, RefreshCw } from 'lucide-react';

interface DebugDashboardProps {
  onClose: () => void;
}

export const DebugDashboard: React.FC<DebugDashboardProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>({});
  const { user, session } = useAuth();

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 1000); // Refresh every second
    return () => clearInterval(interval);
  }, []);

  const refreshData = async () => {
    setLogs(debugLogger.getLogs());
    
    // Gather system info
    const info = {
      timestamp: new Date().toISOString(),
      auth: {
        hasUser: !!user,
        hasSession: !!session,
        userId: user?.id,
        sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
      },
      storage: {
        localStorage: await getLocalStorageInfo(),
        sessionStorage: await getSessionStorageInfo(),
        persistent: await getPersistentStorageInfo()
      },
      version: await getVersionInfo(),
      network: navigator.onLine,
      twa: detectTWA()
    };
    
    setSystemInfo(info);
  };

  const getLocalStorageInfo = async () => {
    const keys = Object.keys(localStorage);
    const authKeys = keys.filter(key => key.includes('auth') || key.includes('supabase'));
    const info: any = { totalKeys: keys.length, authKeys: authKeys.length, authData: {} };
    
    authKeys.forEach(key => {
      try {
        info.authData[key] = localStorage.getItem(key);
      } catch (e) {
        info.authData[key] = '[Error reading]';
      }
    });
    
    return info;
  };

  const getSessionStorageInfo = async () => {
    const keys = Object.keys(sessionStorage);
    const authKeys = keys.filter(key => key.includes('auth') || key.includes('session') || key.includes('supabase'));
    const info: any = { totalKeys: keys.length, authKeys: authKeys.length, authData: {} };
    
    authKeys.forEach(key => {
      try {
        info.authData[key] = sessionStorage.getItem(key);
      } catch (e) {
        info.authData[key] = '[Error reading]';
      }
    });
    
    return info;
  };

  const getPersistentStorageInfo = async () => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist();
        const estimate = await navigator.storage.estimate();
        return { persistent, estimate };
      } catch (e) {
        return { error: e.message };
      }
    }
    return { supported: false };
  };

  const getVersionInfo = async () => {
    try {
      const response = await fetch('/app-version.json?t=' + Date.now());
      const version = await response.json();
      return { ...version, buildTimestamp: Date.now() };
    } catch (e) {
      return { error: 'Could not fetch version info' };
    }
  };

  const detectTWA = () => {
    const userAgent = navigator.userAgent;
    return {
      isTWA: userAgent.includes('wv') || 
             document.referrer.includes('android-app://') ||
             window.matchMedia('(display-mode: standalone)').matches,
      userAgent,
      referrer: document.referrer,
      standalone: window.matchMedia('(display-mode: standalone)').matches
    };
  };

  const handleExportLogs = () => {
    const data = {
      logs: debugLogger.exportLogs(),
      systemInfo,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storybridge-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    debugLogger.clearLogs();
    refreshData();
  };

  const formatLogLevel = (level: string) => {
    const colors = {
      ERROR: 'destructive',
      WARN: 'outline',
      INFO: 'default',
      DEBUG: 'secondary'
    };
    return colors[level as keyof typeof colors] || 'default';
  };

  const testAuth = async () => {
    debugLogger.logAuth('DEBUG', 'Manual auth test triggered');
    try {
      const { data, error } = await supabase.auth.getSession();
      debugLogger.logAuth('DEBUG', 'Manual session check result', { hasSession: !!data.session, error });
    } catch (e) {
      debugLogger.logAuth('ERROR', 'Manual session check failed', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Debug Dashboard</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={testAuth}>
              Test Auth
            </Button>
            <Button size="sm" variant="outline" onClick={refreshData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportLogs}>
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleClearLogs}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="logs">Logs ({logs.length})</TabsTrigger>
              <TabsTrigger value="storage">Storage</TabsTrigger>
              <TabsTrigger value="auth">Auth State</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">App Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 text-xs">
                          <div>Version: {systemInfo.version?.version || 'Unknown'}</div>
                          <div>Build: {systemInfo.version?.buildTime || 'Unknown'}</div>
                          <div>Network: {systemInfo.network ? 'Online' : 'Offline'}</div>
                          <div>TWA: {systemInfo.twa?.isTWA ? 'Yes' : 'No'}</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Auth Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 text-xs">
                          <div>User: {systemInfo.auth?.hasUser ? 'Logged in' : 'Not logged in'}</div>
                          <div>Session: {systemInfo.auth?.hasSession ? 'Active' : 'None'}</div>
                          <div>Expires: {systemInfo.auth?.sessionExpiry ? new Date(systemInfo.auth.sessionExpiry).toLocaleString() : 'N/A'}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Recent Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {logs.filter(log => log.level === 'ERROR' || log.level === 'WARN')
                             .slice(-5)
                             .map((log, i) => (
                          <div key={i} className="text-xs flex gap-2">
                            <Badge variant={formatLogLevel(log.level) as any} className="text-xs">
                              {log.level}
                            </Badge>
                            <span className="text-muted-foreground">{log.category}</span>
                            <span>{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="logs" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-1">
                  {logs.slice().reverse().map((log, i) => (
                    <div key={i} className="text-xs border-b pb-1 mb-1">
                      <div className="flex gap-2 items-center">
                        <Badge variant={formatLogLevel(log.level) as any} className="text-xs">
                          {log.level}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{log.category}</Badge>
                        <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span>{log.message}</span>
                      </div>
                      {log.data && (
                        <pre className="text-xs text-muted-foreground mt-1 ml-4 overflow-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="storage" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">localStorage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(systemInfo.storage?.localStorage, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">sessionStorage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(systemInfo.storage?.sessionStorage, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Persistent Storage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(systemInfo.storage?.persistent, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="auth" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Current Auth State</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify({
                          user: user ? { id: user.id, email: user.email } : null,
                          session: session ? { 
                            expires_at: session.expires_at,
                            token_type: session.token_type 
                          } : null
                        }, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">TWA Detection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(systemInfo.twa, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};