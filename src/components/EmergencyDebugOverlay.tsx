import React, { useState, useEffect } from 'react';
import { debugLogger, LogEntry } from '@/utils/debugLogger';
import { X, Download, Trash2, Filter, RefreshCw } from 'lucide-react';

interface EmergencyDebugOverlayProps {
  onClose: () => void;
}

export const EmergencyDebugOverlay: React.FC<EmergencyDebugOverlayProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');

  useEffect(() => {
    const allLogs = debugLogger.getLogs();
    setLogs(allLogs);
    setFilteredLogs(allLogs);
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(log => log.category === categoryFilter);
    }

    if (levelFilter !== 'ALL') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    if (filter) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(filter.toLowerCase()) ||
        JSON.stringify(log.data).toLowerCase().includes(filter.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, filter, categoryFilter, levelFilter]);

  const refreshLogs = () => {
    const allLogs = debugLogger.getLogs();
    setLogs(allLogs);
  };

  const clearLogs = () => {
    debugLogger.clearLogs();
    setLogs([]);
    setFilteredLogs([]);
  };

  const downloadLogs = () => {
    try {
      const logsData = debugLogger.exportLogs();
      const blob = new Blob([logsData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emergency-debug-logs-${new Date().toISOString().split('T')[0]}.json`;
      
      // Add null checks for DOM manipulation
      if (document.body) {
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download logs:', error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-700 bg-red-100';
      case 'ERROR': return 'text-red-600 bg-red-50';
      case 'WARN': return 'text-yellow-600 bg-yellow-50';
      case 'INFO': return 'text-blue-600 bg-blue-50';
      case 'DEBUG': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const categories = ['ALL', 'AUTH', 'SESSION', 'STORAGE', 'VERSION', 'TWA', 'AUTOFILL', 'LIFECYCLE', 'NETWORK', 'PERFORMANCE', 'ERROR', 'ANDROID', 'CACHE', 'ROUTING'];
  const levels = ['ALL', 'CRITICAL', 'ERROR', 'WARN', 'INFO', 'DEBUG'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-red-600">🚨 Emergency Debug Mode</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b bg-gray-50 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-48">
              <input
                type="text"
                placeholder="Search logs..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              {levels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={refreshLogs}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={downloadLogs}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={clearLogs}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} log entries
          </div>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No logs found matching current filters
              </div>
            ) : (
              filteredLogs.reverse().map((log, index) => (
                <div key={index} className="border rounded-md p-3 text-sm font-mono">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-500 text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-700">
                      {log.category}
                    </span>
                  </div>
                  <div className="font-medium mb-1">{log.message}</div>
                  {log.data && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                        View data
                      </summary>
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                  {log.stackTrace && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-red-600 hover:text-red-800">
                        Stack trace
                      </summary>
                      <pre className="mt-1 p-2 bg-red-50 rounded text-xs overflow-auto text-red-700">
                        {log.stackTrace}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};