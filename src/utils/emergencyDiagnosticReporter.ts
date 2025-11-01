/**
 * Emergency Diagnostic Report Generator
 * 
 * Creates comprehensive diagnostic data collection and formatting,
 * exportable report generation with anonymized system information,
 * and diagnostic report sharing for technical support integration.
 * 
 * Requirements: 5.5, 2.5
 */

import { diagnosticCollector, DiagnosticReport } from './diagnosticDataCollector';
import { startupOrchestrator } from './startupOrchestrator';
import { recoveryActionSystem } from './recoveryActionSystem';
import { debugLogger } from './debugLogger';

export interface EmergencyDiagnosticReport extends DiagnosticReport {
  emergency: EmergencyContext;
  recovery: RecoveryContext;
  support: SupportContext;
  anonymized: AnonymizedData;
}

export interface EmergencyContext {
  trigger: 'timeout' | 'error' | 'manual' | 'health-check' | 'crash';
  activationTime: string;
  userActions: UserAction[];
  systemState: SystemState;
  criticalPath: CriticalPathAnalysis;
}

export interface UserAction {
  timestamp: string;
  action: string;
  context: string;
  result?: string;
}

export interface SystemState {
  safeModeActive: boolean;
  emergencyModeActive: boolean;
  lastSuccessfulLoad?: string;
  consecutiveFailures: number;
  uptime: number;
}

export interface CriticalPathAnalysis {
  failedPhases: string[];
  completedPhases: string[];
  bottlenecks: string[];
  timeToFailure: number;
}

export interface RecoveryContext {
  availableActions: string[];
  attemptedActions: RecoveryAttempt[];
  recommendedActions: string[];
  safeModeConfig?: any;
}

export interface RecoveryAttempt {
  action: string;
  timestamp: string;
  success: boolean;
  message: string;
  duration: number;
}

export interface SupportContext {
  reportId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  suggestedEscalation: boolean;
  contactInfo: ContactInfo;
}

export interface ContactInfo {
  email: string;
  subject: string;
  body: string;
  attachments: string[];
}

export interface AnonymizedData {
  userAgent: string;
  deviceFingerprint: string;
  sessionId: string;
  installationId: string;
  sensitiveDataRemoved: string[];
}

export interface ReportExportOptions {
  format: 'json' | 'text' | 'html' | 'csv';
  includeFullDiagnostics: boolean;
  includeSensitiveData: boolean;
  includeRecoveryHistory: boolean;
  includeSystemLogs: boolean;
}

export interface ShareOptions {
  method: 'email' | 'download' | 'clipboard' | 'support-portal';
  anonymize: boolean;
  includeAttachments: boolean;
}

class EmergencyDiagnosticReporter {
  private userActions: UserAction[] = [];
  private sessionStart = Date.now();
  private reportCache = new Map<string, EmergencyDiagnosticReport>();

  constructor() {
    this.initializeReporter();
  }

  private initializeReporter() {
    // Track user actions for context
    this.setupUserActionTracking();
    
    // Listen for emergency events
    window.addEventListener('activate-emergency-mode', (event: any) => {
      this.recordUserAction('emergency-activated', 'system', event.detail?.reason);
    });

    window.addEventListener('show-emergency-recovery', (event: any) => {
      this.recordUserAction('recovery-ui-shown', 'system', event.detail?.trigger);
    });

    debugLogger.logLifecycle('INFO', 'Emergency diagnostic reporter initialized');
  }

  private setupUserActionTracking() {
    // Track clicks on recovery actions
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-recovery-action]')) {
        const action = target.closest('[data-recovery-action]')?.getAttribute('data-recovery-action');
        this.recordUserAction('recovery-action-clicked', 'user', action);
      }
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.recordUserAction(
        document.hidden ? 'page-hidden' : 'page-visible',
        'system',
        `visibility: ${document.visibilityState}`
      );
    });

    // Track errors
    window.addEventListener('error', (event) => {
      this.recordUserAction('javascript-error', 'system', event.error?.message);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordUserAction('promise-rejection', 'system', event.reason?.toString());
    });
  }

  private recordUserAction(action: string, context: string, result?: string) {
    this.userActions.push({
      timestamp: new Date().toISOString(),
      action,
      context,
      result
    });

    // Keep only last 50 actions
    if (this.userActions.length > 50) {
      this.userActions = this.userActions.slice(-50);
    }
  }

  // Generate Emergency Diagnostic Report
  async generateEmergencyReport(
    trigger: EmergencyContext['trigger'] = 'manual'
  ): Promise<EmergencyDiagnosticReport> {
    debugLogger.logLifecycle('INFO', 'Generating emergency diagnostic report', { trigger });

    try {
      // Get base diagnostic report
      const baseDiagnostic = await diagnosticCollector.generateDiagnosticReport();
      
      // Generate emergency-specific context
      const emergency = await this.generateEmergencyContext(trigger);
      const recovery = await this.generateRecoveryContext();
      const support = this.generateSupportContext(emergency, recovery);
      const anonymized = this.generateAnonymizedData();

      const emergencyReport: EmergencyDiagnosticReport = {
        ...baseDiagnostic,
        emergency,
        recovery,
        support,
        anonymized
      };

      // Cache the report
      this.reportCache.set(support.reportId, emergencyReport);

      debugLogger.logLifecycle('INFO', 'Emergency diagnostic report generated', {
        reportId: support.reportId,
        severity: support.severity,
        criticalFindings: baseDiagnostic.troubleshooting.criticalFindings.length
      });

      return emergencyReport;

    } catch (error) {
      debugLogger.logError('ERROR', 'Failed to generate emergency diagnostic report', error);
      throw new Error(`Emergency report generation failed: ${error.message}`);
    }
  }

  private async generateEmergencyContext(trigger: EmergencyContext['trigger']): Promise<EmergencyContext> {
    const systemState = this.getSystemState();
    const criticalPath = await this.analyzeCriticalPath();

    return {
      trigger,
      activationTime: new Date().toISOString(),
      userActions: [...this.userActions],
      systemState,
      criticalPath
    };
  }

  private getSystemState(): SystemState {
    const safeModeActive = recoveryActionSystem.isSafeModeActive();
    const emergencyModeActive = recoveryActionSystem.isEmergencyModeActive();
    
    // Get last successful load timestamp
    const lastSuccessfulLoad = localStorage.getItem('last-successful-load');
    
    // Calculate consecutive failures
    const failureCount = parseInt(localStorage.getItem('consecutive-failures') || '0');
    
    return {
      safeModeActive,
      emergencyModeActive,
      lastSuccessfulLoad: lastSuccessfulLoad || undefined,
      consecutiveFailures: failureCount,
      uptime: Date.now() - this.sessionStart
    };
  }

  private async analyzeCriticalPath(): Promise<CriticalPathAnalysis> {
    const completedPhases = startupOrchestrator.getCompletedPhases();
    const failedPhases = startupOrchestrator.getFailedPhases();
    const phaseTimings = startupOrchestrator.getPhaseTimings();

    // Identify bottlenecks (phases that took longer than expected)
    const bottlenecks: string[] = [];
    Object.entries(phaseTimings).forEach(([phase, timing]) => {
      if (timing > 5000) { // More than 5 seconds
        bottlenecks.push(`${phase} (${timing}ms)`);
      }
    });

    // Calculate time to failure
    const timeToFailure = failedPhases.length > 0 
      ? Object.values(phaseTimings).reduce((sum, time) => sum + time, 0)
      : 0;

    return {
      failedPhases: failedPhases.map(String),
      completedPhases: completedPhases.map(String),
      bottlenecks,
      timeToFailure
    };
  }

  private async generateRecoveryContext(): Promise<RecoveryContext> {
    const recoveryHistory = recoveryActionSystem.getRecoveryHistory();
    const safeModeConfig = recoveryActionSystem.getSafeModeConfig();

    const attemptedActions: RecoveryAttempt[] = recoveryHistory.map(entry => ({
      action: entry.action,
      timestamp: new Date(entry.timestamp).toISOString(),
      success: entry.result.success,
      message: entry.result.message,
      duration: entry.result.metadata?.duration || 0
    }));

    // Available recovery actions based on current state
    const availableActions = [
      'simple-reload',
      'clear-cache-reload',
      'hard-reload',
      'network-reset'
    ];

    if (!recoveryActionSystem.isSafeModeActive()) {
      availableActions.push('safe-mode');
    }

    availableActions.push('complete-reset');

    // Recommend actions based on context
    const recommendedActions = this.getRecommendedActions(attemptedActions);

    return {
      availableActions,
      attemptedActions,
      recommendedActions,
      safeModeConfig
    };
  }

  private getRecommendedActions(attemptedActions: RecoveryAttempt[]): string[] {
    const attempted = new Set(attemptedActions.map(a => a.action));
    const recommendations: string[] = [];

    // If no actions attempted, start with simple reload
    if (attemptedActions.length === 0) {
      recommendations.push('simple-reload');
      return recommendations;
    }

    // If simple reload failed, try cache clear
    if (attempted.has('simple-reload') && !attempted.has('clear-cache-reload')) {
      recommendations.push('clear-cache-reload');
    }

    // If cache clear failed, try hard reload
    if (attempted.has('clear-cache-reload') && !attempted.has('hard-reload')) {
      recommendations.push('hard-reload');
    }

    // If network issues detected, recommend network reset
    const hasNetworkIssues = attemptedActions.some(a => 
      a.message.toLowerCase().includes('network') || 
      a.message.toLowerCase().includes('offline')
    );
    
    if (hasNetworkIssues && !attempted.has('network-reset')) {
      recommendations.push('network-reset');
    }

    // If multiple failures, recommend safe mode
    if (attemptedActions.filter(a => !a.success).length >= 2 && !attempted.has('safe-mode')) {
      recommendations.push('safe-mode');
    }

    // Last resort
    if (recommendations.length === 0 && !attempted.has('complete-reset')) {
      recommendations.push('complete-reset');
    }

    return recommendations;
  }

  private generateSupportContext(emergency: EmergencyContext, recovery: RecoveryContext): SupportContext {
    const reportId = this.generateReportId();
    
    // Determine severity based on context
    let severity: SupportContext['severity'] = 'medium';
    
    if (emergency.systemState.consecutiveFailures >= 3) {
      severity = 'critical';
    } else if (emergency.criticalPath.failedPhases.length >= 2) {
      severity = 'high';
    } else if (recovery.attemptedActions.length >= 2) {
      severity = 'high';
    }

    // Determine category
    let category = 'startup-failure';
    if (emergency.trigger === 'crash') {
      category = 'application-crash';
    } else if (emergency.systemState.emergencyModeActive) {
      category = 'emergency-recovery';
    }

    // Suggest escalation for critical cases
    const suggestedEscalation = severity === 'critical' || 
                               emergency.systemState.consecutiveFailures >= 5;

    const contactInfo = this.generateContactInfo(reportId, emergency, recovery);

    return {
      reportId,
      severity,
      category,
      suggestedEscalation,
      contactInfo
    };
  }

  private generateContactInfo(
    reportId: string, 
    emergency: EmergencyContext, 
    recovery: RecoveryContext
  ): ContactInfo {
    const subject = `VibeTales Emergency Report - ${reportId}`;
    
    const body = `
Emergency Report Details:
- Report ID: ${reportId}
- Trigger: ${emergency.trigger}
- Time: ${emergency.activationTime}
- Failed Phases: ${emergency.criticalPath.failedPhases.join(', ') || 'None'}
- Recovery Attempts: ${recovery.attemptedActions.length}
- Safe Mode: ${emergency.systemState.safeModeActive ? 'Active' : 'Inactive'}

Please find the detailed diagnostic report attached.

User Description:
[Please describe what you were doing when the issue occurred]

Additional Context:
[Any additional information that might help resolve the issue]
    `.trim();

    return {
      email: 'support@vibetales.com',
      subject,
      body,
      attachments: [`vibetales-emergency-${reportId}.json`]
    };
  }

  private generateAnonymizedData(): AnonymizedData {
    // Create anonymized user agent (remove specific version numbers)
    const userAgent = navigator.userAgent
      .replace(/\d+\.\d+\.\d+/g, 'X.X.X')
      .replace(/\b\d{4,}\b/g, 'XXXX');

    // Generate device fingerprint (non-identifying)
    const deviceFingerprint = this.generateDeviceFingerprint();
    
    // Generate session ID
    const sessionId = this.generateSessionId();
    
    // Generate installation ID (persistent but anonymous)
    let installationId = localStorage.getItem('installation-id');
    if (!installationId) {
      installationId = this.generateInstallationId();
      localStorage.setItem('installation-id', installationId);
    }

    const sensitiveDataRemoved = [
      'user-email',
      'user-name',
      'auth-tokens',
      'personal-data',
      'location-data'
    ];

    return {
      userAgent,
      deviceFingerprint,
      sessionId,
      installationId,
      sensitiveDataRemoved
    };
  }

  private generateDeviceFingerprint(): string {
    const components = [
      screen.width,
      screen.height,
      screen.colorDepth,
      navigator.hardwareConcurrency || 0,
      navigator.language,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    ];
    
    return btoa(components.join('|')).substring(0, 16);
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateInstallationId(): string {
    return `inst_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
  }

  private generateReportId(): string {
    return `emrg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Export Report in Various Formats
  exportReport(
    report: EmergencyDiagnosticReport, 
    options: ReportExportOptions
  ): string {
    switch (options.format) {
      case 'json':
        return this.exportAsJSON(report, options);
      case 'text':
        return this.exportAsText(report, options);
      case 'html':
        return this.exportAsHTML(report, options);
      case 'csv':
        return this.exportAsCSV(report, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private exportAsJSON(report: EmergencyDiagnosticReport, options: ReportExportOptions): string {
    let exportData = { ...report };

    if (!options.includeSensitiveData) {
      exportData = this.removeSensitiveData(exportData);
    }

    if (!options.includeFullDiagnostics) {
      exportData = this.createSummaryData(exportData);
    }

    return JSON.stringify(exportData, null, 2);
  }

  private exportAsText(report: EmergencyDiagnosticReport, options: ReportExportOptions): string {
    const lines: string[] = [];
    
    lines.push('=== VibeTales Emergency Diagnostic Report ===');
    lines.push(`Report ID: ${report.support.reportId}`);
    lines.push(`Generated: ${report.metadata.timestamp}`);
    lines.push(`Severity: ${report.support.severity.toUpperCase()}`);
    lines.push('');

    lines.push('=== Emergency Context ===');
    lines.push(`Trigger: ${report.emergency.trigger}`);
    lines.push(`Activation Time: ${report.emergency.activationTime}`);
    lines.push(`Safe Mode: ${report.emergency.systemState.safeModeActive ? 'Active' : 'Inactive'}`);
    lines.push(`Consecutive Failures: ${report.emergency.systemState.consecutiveFailures}`);
    lines.push('');

    lines.push('=== Critical Path Analysis ===');
    lines.push(`Failed Phases: ${report.emergency.criticalPath.failedPhases.join(', ') || 'None'}`);
    lines.push(`Completed Phases: ${report.emergency.criticalPath.completedPhases.join(', ') || 'None'}`);
    lines.push(`Bottlenecks: ${report.emergency.criticalPath.bottlenecks.join(', ') || 'None'}`);
    lines.push(`Time to Failure: ${report.emergency.criticalPath.timeToFailure}ms`);
    lines.push('');

    if (options.includeRecoveryHistory && report.recovery.attemptedActions.length > 0) {
      lines.push('=== Recovery Attempts ===');
      report.recovery.attemptedActions.forEach(attempt => {
        lines.push(`- ${attempt.action}: ${attempt.success ? 'SUCCESS' : 'FAILED'} - ${attempt.message}`);
      });
      lines.push('');
    }

    lines.push('=== Recommendations ===');
    report.recovery.recommendedActions.forEach(action => {
      lines.push(`- ${action}`);
    });
    lines.push('');

    if (options.includeFullDiagnostics) {
      lines.push('=== System Information ===');
      lines.push(`Device: ${report.systemInfo.device.type} (${report.systemInfo.device.os})`);
      lines.push(`Browser: ${report.systemInfo.browser.name} ${report.systemInfo.browser.version}`);
      lines.push(`Network: ${report.systemInfo.network.online ? 'Online' : 'Offline'} (${report.systemInfo.network.effectiveType})`);
      lines.push(`TWA: ${report.twaEnvironment.isTWA ? 'Yes' : 'No'}`);
    }

    return lines.join('\n');
  }

  private exportAsHTML(report: EmergencyDiagnosticReport, options: ReportExportOptions): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>VibeTales Emergency Report - ${report.support.reportId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f44336; color: white; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .critical { background: #ffebee; }
        .success { color: #4caf50; }
        .error { color: #f44336; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Emergency Diagnostic Report</h1>
        <p>Report ID: ${report.support.reportId}</p>
        <p>Severity: ${report.support.severity.toUpperCase()}</p>
    </div>
    
    <div class="section ${report.support.severity === 'critical' ? 'critical' : ''}">
        <h2>Emergency Context</h2>
        <p><strong>Trigger:</strong> ${report.emergency.trigger}</p>
        <p><strong>Time:</strong> ${report.emergency.activationTime}</p>
        <p><strong>Safe Mode:</strong> ${report.emergency.systemState.safeModeActive ? 'Active' : 'Inactive'}</p>
    </div>
    
    <div class="section">
        <h2>Recovery Recommendations</h2>
        <ul>
            ${report.recovery.recommendedActions.map(action => `<li>${action}</li>`).join('')}
        </ul>
    </div>
    
    ${options.includeFullDiagnostics ? `
    <div class="section">
        <h2>System Information</h2>
        <p><strong>Device:</strong> ${report.systemInfo.device.type} (${report.systemInfo.device.os})</p>
        <p><strong>Browser:</strong> ${report.systemInfo.browser.name} ${report.systemInfo.browser.version}</p>
        <p><strong>Network:</strong> ${report.systemInfo.network.online ? 'Online' : 'Offline'}</p>
    </div>
    ` : ''}
</body>
</html>
    `.trim();
  }

  private exportAsCSV(report: EmergencyDiagnosticReport, options: ReportExportOptions): string {
    const rows: string[] = [];
    
    // Header
    rows.push('Category,Key,Value,Timestamp');
    
    // Basic info
    rows.push(`Report,ID,${report.support.reportId},${report.metadata.timestamp}`);
    rows.push(`Report,Severity,${report.support.severity},${report.metadata.timestamp}`);
    rows.push(`Emergency,Trigger,${report.emergency.trigger},${report.emergency.activationTime}`);
    
    // Recovery attempts
    if (options.includeRecoveryHistory) {
      report.recovery.attemptedActions.forEach(attempt => {
        rows.push(`Recovery,${attempt.action},${attempt.success ? 'SUCCESS' : 'FAILED'},${attempt.timestamp}`);
      });
    }
    
    return rows.join('\n');
  }

  private removeSensitiveData(data: any): any {
    const cleaned = JSON.parse(JSON.stringify(data));
    
    // Remove sensitive fields
    const sensitiveFields = [
      'userAgent',
      'referrer',
      'url',
      'sessionId',
      'installationId'
    ];
    
    const removeSensitive = (obj: any) => {
      if (typeof obj === 'object' && obj !== null) {
        sensitiveFields.forEach(field => {
          if (field in obj) {
            obj[field] = '[REDACTED]';
          }
        });
        
        Object.values(obj).forEach(value => {
          if (typeof value === 'object') {
            removeSensitive(value);
          }
        });
      }
    };
    
    removeSensitive(cleaned);
    return cleaned;
  }

  private createSummaryData(data: EmergencyDiagnosticReport): any {
    return {
      metadata: {
        reportId: data.support.reportId,
        timestamp: data.metadata.timestamp,
        severity: data.support.severity
      },
      emergency: {
        trigger: data.emergency.trigger,
        systemState: data.emergency.systemState,
        criticalPath: data.emergency.criticalPath
      },
      recovery: {
        recommendedActions: data.recovery.recommendedActions,
        attemptedActions: data.recovery.attemptedActions.length
      },
      summary: {
        criticalFindings: data.troubleshooting.criticalFindings.length,
        recommendations: data.recommendations.length
      }
    };
  }

  // Share Report
  async shareReport(
    report: EmergencyDiagnosticReport, 
    options: ShareOptions
  ): Promise<boolean> {
    try {
      let reportData = report;
      
      if (options.anonymize) {
        reportData = this.removeSensitiveData(report) as EmergencyDiagnosticReport;
      }

      switch (options.method) {
        case 'email':
          return this.shareViaEmail(reportData, options);
        case 'download':
          return this.shareViaDownload(reportData, options);
        case 'clipboard':
          return this.shareViaClipboard(reportData, options);
        case 'support-portal':
          return this.shareViaSupportPortal(reportData, options);
        default:
          throw new Error(`Unsupported share method: ${options.method}`);
      }
    } catch (error) {
      debugLogger.logError('ERROR', 'Failed to share report', error);
      return false;
    }
  }

  private shareViaEmail(report: EmergencyDiagnosticReport, options: ShareOptions): boolean {
    const subject = encodeURIComponent(report.support.contactInfo.subject);
    const body = encodeURIComponent(report.support.contactInfo.body);
    const mailto = `mailto:${report.support.contactInfo.email}?subject=${subject}&body=${body}`;
    
    window.open(mailto);
    return true;
  }

  private shareViaDownload(report: EmergencyDiagnosticReport, options: ShareOptions): boolean {
    const reportText = this.exportReport(report, {
      format: 'json',
      includeFullDiagnostics: true,
      includeSensitiveData: !options.anonymize,
      includeRecoveryHistory: true,
      includeSystemLogs: true
    });
    
    const blob = new Blob([reportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibetales-emergency-${report.support.reportId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  }

  private async shareViaClipboard(report: EmergencyDiagnosticReport, options: ShareOptions): Promise<boolean> {
    if (!navigator.clipboard) {
      return false;
    }
    
    const reportText = this.exportReport(report, {
      format: 'text',
      includeFullDiagnostics: false,
      includeSensitiveData: !options.anonymize,
      includeRecoveryHistory: true,
      includeSystemLogs: false
    });
    
    await navigator.clipboard.writeText(reportText);
    return true;
  }

  private async shareViaSupportPortal(report: EmergencyDiagnosticReport, options: ShareOptions): Promise<boolean> {
    // This would integrate with a support portal API
    // For now, we'll simulate the functionality
    debugLogger.logLifecycle('INFO', 'Support portal integration not implemented', {
      reportId: report.support.reportId
    });
    
    return false;
  }

  // Public API Methods
  getCachedReport(reportId: string): EmergencyDiagnosticReport | null {
    return this.reportCache.get(reportId) || null;
  }

  clearReportCache() {
    this.reportCache.clear();
  }

  getUserActions(): UserAction[] {
    return [...this.userActions];
  }

  clearUserActions() {
    this.userActions = [];
  }
}

// Singleton instance
export const emergencyDiagnosticReporter = new EmergencyDiagnosticReporter();