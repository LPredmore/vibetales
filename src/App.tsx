import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UpgradeModalProvider } from "@/contexts/UpgradeModalContext";

// Lazy load Profile page
const Profile = lazy(() => import('./pages/Profile'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (import.meta.env.DEV) {
          console.warn('[QUERY] Retry attempt:', { failureCount, error: error.message });
        }
        return failureCount < 3;
      }
    }
  }
});

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UpgradeModalProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route 
                    path="/" 
                    element={
                      <AuthGuard>
                        <Index />
                      </AuthGuard>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <AuthGuard>
                        <Suspense fallback={<PageLoader />}>
                          <Profile />
                        </Suspense>
                      </AuthGuard>
                    } 
                  />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </UpgradeModalProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
