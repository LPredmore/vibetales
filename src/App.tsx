import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DebugToggle } from "@/components/DebugToggle";
import { EmergencyDebugActivator } from "@/components/EmergencyDebugActivator";
import { ServiceWorkerRecovery } from "@/components/ServiceWorkerRecovery";
import { EmergencyRecoveryActivator } from "@/components/EmergencyRecoveryActivator";
import { SafeModeDetector } from "@/components/SafeModeDetector";
import { debugLogger } from "@/utils/debugLogger";

// Import test utilities in development
if (process.env.NODE_ENV === 'development') {
  import("@/utils/testEmergencyRecovery");
}
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";

// Route logging component
const RouteLogger = () => {
  const location = useLocation();
  
  useEffect(() => {
    debugLogger.logRouting('INFO', 'Route changed', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state
    });
  }, [location]);
  
  return null;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        debugLogger.logNetwork('WARN', 'Query retry', { failureCount, error: error.message });
        return failureCount < 3;
      },
    },
  },
});

const App = () => {
  useEffect(() => {
    console.log('✅ App component mounted');
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <DebugToggle />
            <EmergencyDebugActivator />
            <ServiceWorkerRecovery />
            <EmergencyRecoveryActivator />
            <SafeModeDetector />
            <BrowserRouter>
              <RouteLogger />
              <Routes>
                <Route
                  path="/"
                  element={
                    <AuthGuard>
                      <Index />
                    </AuthGuard>
                  }
                />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route 
                  path="/profile" 
                  element={
                    <AuthGuard>
                      <Profile />
                    </AuthGuard>
                  } 
                />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;