import { Loader2 } from "lucide-react";

export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary via-primary-dark to-accent">
    <div className="text-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin mx-auto text-white" />
      <p className="text-sm text-white/80">Loading...</p>
    </div>
  </div>
);

export const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);
