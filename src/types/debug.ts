// Debug logger types

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type LogCategory = 
  | 'GENERAL' 
  | 'AUTH' 
  | 'SESSION' 
  | 'STORAGE' 
  | 'VERSION' 
  | 'TWA' 
  | 'IAP' 
  | 'STORY' 
  | 'USER' 
  | 'PERFORMANCE';

export interface LogEntry {
  id: string;
  timestamp: number;
  category: LogCategory;
  level: LogLevel;
  message: string;
  data?: unknown;
  source?: string;
  userAgent?: string;
  url?: string;
}

export interface DebugSettings {
  maxEntries: number;
  enableConsoleOutput: boolean;
  enableLocalStorage: boolean;
  enableRemoteLogging: boolean;
  logLevels: LogLevel[];
  categories: LogCategory[];
}

export interface PerformanceMetrics {
  memoryUsage?: {
    used: number;
    total: number;
  };
  navigationTiming?: PerformanceTiming;
  resourceTiming?: PerformanceResourceTiming[];
}

export interface AndroidLogInterface {
  log: (message: string, data: string) => void;
}

export interface WindowWithAndroid extends Window {
  android?: AndroidLogInterface;
}