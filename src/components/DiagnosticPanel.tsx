import React, { useState, useEffect } from 'react';
import { startupOrchestrator } from '@/utils/startupOrchestrator';
import { healthMonitor, ComponentStatus } from '@/utils/healthMonitoring';
import { startupErrorDetector } from '@/utils/startupErrorDetection';
import { diagnosticCollector } from '@/utils/diagnosticDataCollector';

export const DiagnosticPanel: React.FC = () => {
  const [healthSummary, setHealthSummary] = useState<any>(null);
  const [errorSummary, setErrorSummary] = useState<any>(null);
  const [diagnosticReport, setDiagnosticReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [health, errors, report] = await Promise.all([
        startupOrchestrator.getHealthStatus(),
        Promise.resolve(startupErrorDetector.getErrorSummary()),
        diagnosticCollector.generateDiagnosticReport()
      ]);
      
      setHealthSummary(health);
      setErrorSummary(errors);
      setDiagnosticReport(report);
    } catch (error) {
      console.error('Failed to refresh diagnostic data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const downloadReport = () => {
    if (!diagnosticReport) return;
    
    try {
      const reportText = diagnosticCollector.exportDiagnosticReport(diagnosticReport, 'json');
      const blob = new Blob([reportText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vibetales-diagnostic-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>System Diagnostics</h2>
      <button onClick={refreshData} disabled={loading} style={{ marginRight: '10px' }}>
        {loading ? 'Loading...' : 'Refresh'}
      </button>
      <button onClick={downloadReport} disabled={!diagnosticReport}>
        Export Report
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Health Summary</h3>
        {healthSummary && (
          <div>
            <p>Overall Status: {healthSummary.overall}</p>
            <p>Healthy: {healthSummary.healthy} | Degraded: {healthSummary.degraded} | Unhealthy: {healthSummary.unhealthy}</p>
            <p>Total Errors: {healthSummary.totalErrors}</p>
            <p>Uptime: {Math.round(healthSummary.uptime / 1000)}s</p>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Error Summary</h3>
        {errorSummary && (
          <div>
            <p>Total Errors: {errorSummary.total}</p>
            <p>Escalated: {errorSummary.escalated}</p>
            <p>Critical: {errorSummary.bySeverity?.CRITICAL || 0}</p>
            <p>Network Errors: {errorSummary.byCategory?.NETWORK || 0}</p>
            <p>Auth Errors: {errorSummary.byCategory?.AUTH || 0}</p>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>TWA Environment</h3>
        {diagnosticReport?.twaEnvironment && (
          <div>
            <p>Is TWA: {diagnosticReport.twaEnvironment.isTWA ? 'Yes' : 'No'}</p>
            <p>Play Store Origin: {diagnosticReport.twaEnvironment.playStoreOrigin ? 'Yes' : 'No'}</p>
            <p>Capacitor Bridge: {diagnosticReport.twaEnvironment.capacitorBridgeStatus?.bridgeHealth || 'Unknown'}</p>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>System Information</h3>
        {diagnosticReport?.systemInfo && (
          <div>
            <p>Device: {diagnosticReport.systemInfo.device?.type} ({diagnosticReport.systemInfo.device?.os})</p>
            <p>Browser: {diagnosticReport.systemInfo.browser?.name} {diagnosticReport.systemInfo.browser?.version}</p>
            <p>Network: {diagnosticReport.systemInfo.network?.online ? 'Online' : 'Offline'} ({diagnosticReport.systemInfo.network?.effectiveType})</p>
            <p>Display Mode: {diagnosticReport.systemInfo.displayMode}</p>
          </div>
        )}
      </div>
    </div>
  );
};