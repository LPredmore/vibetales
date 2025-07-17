import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DebugDashboard } from '@/components/DebugDashboard';
import { Bug } from 'lucide-react';

export const DebugToggle: React.FC = () => {
  const [showDebug, setShowDebug] = useState(false);

  // Only show debug toggle in development or when explicitly enabled
  const showToggle = process.env.NODE_ENV === 'development' || 
                     localStorage.getItem('enable-debug') === 'true' ||
                     window.location.search.includes('debug=true');

  if (!showToggle) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 right-4 z-40 bg-background/80 backdrop-blur-sm"
        title="Open Debug Dashboard"
      >
        <Bug className="h-4 w-4" />
      </Button>
      
      {showDebug && <DebugDashboard onClose={() => setShowDebug(false)} />}
    </>
  );
};