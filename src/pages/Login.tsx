import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { debugLogger } from "@/utils/debugLogger";

const Login = () => {
  const navigate = useNavigate();
  const { login, user, isTWA } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-check remember me for TWA users and if previously set
  useEffect(() => {
    const hasRememberPreference = localStorage.getItem('auth-remember-preference') === 'true';
    if (isTWA || hasRememberPreference) {
      setRemember(true);
    }
  }, [isTWA]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      console.log('🔄 User already authenticated, redirecting...');
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    debugLogger.logAutofill('INFO', 'Login form submitted', { 
      email, 
      remember, 
      isTWA,
      formAutoComplete: e.currentTarget?.getAttribute('autocomplete'),
      emailAutoComplete: document.getElementById('email')?.getAttribute('autocomplete'),
      passwordAutoComplete: document.getElementById('password')?.getAttribute('autocomplete')
    });
    
    try {
      await login(email, password, remember);
      toast.success("Successfully logged in!");
      navigate("/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to login. Please try again.';
      debugLogger.logAuth('ERROR', 'Login form error', error);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-2xl font-bold text-center">Login to VibeTales</h2>
          {isTWA && (
            <p className="text-sm text-muted-foreground text-center">
              🍎 App mode detected - enhanced login experience
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="off"
                data-form-type="other"
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked as boolean)}
                  disabled={isLoading}
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me {isTWA && '(recommended for app)'}
                </label>
              </div>
              <Button
                type="button"
                variant="link"
                className="text-sm"
                onClick={() => navigate("/reset-password")}
                disabled={isLoading}
              >
                Forgot password?
              </Button>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <Button
            variant="link"
            onClick={() => navigate("/register")}
            className="text-sm"
            disabled={isLoading}
          >
            Don't have an account? Register
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
