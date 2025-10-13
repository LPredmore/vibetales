import { useState, useEffect } from "react";
import { ArrowLeft, Save, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscribed: boolean;
    subscription_tier?: string;
    subscription_end?: string;
    error?: string;
  } | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile && !error) {
          // No profile exists, create one
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({ user_id: user.id, email: user.email });

          if (insertError) {
            console.error("Error creating profile:", insertError);
          }
          
          profileForm.setValue("email", user.email || "");
        } else if (error) {
          console.error("Error loading profile:", error);
          toast({
            title: "Error",
            description: "Failed to load profile data",
            variant: "destructive",
          });
        } else {
          profileForm.setValue("name", profile.name || "");
          profileForm.setValue("email", profile.email || user.email || "");
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      }
    };

    loadProfile();
    checkSubscriptionStatus();
  }, [user, profileForm, toast]);

  const checkSubscriptionStatus = async () => {
    try {
      setSubscriptionLoading(true);
      console.log('🔍 Profile: Starting subscription check');
      const { data: session } = await supabase.auth.getSession();
      
      console.log('🔍 Profile: Session data:', { 
        hasSession: !!session.session, 
        userId: session.session?.user?.id,
        email: session.session?.user?.email,
        accessToken: session.session?.access_token ? 'present' : 'missing'
      });
      
      if (!session.session) {
        console.log('⚠️ Profile: No session found, skipping subscription check');
        setSubscriptionStatus({ subscribed: false, error: 'No active session' });
        return;
      }

      console.log('🔍 Profile: Calling check-subscription function with token');
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        console.error('❌ Profile: Error checking subscription:', error);
        setSubscriptionStatus({ subscribed: false, error: error.message || 'Unknown error' });
        return;
      }

      console.log('✅ Profile: Subscription status received:', JSON.stringify(data, null, 2));
      console.log('🔍 Profile: Data type:', typeof data, 'Is object:', typeof data === 'object');
      
      // Ensure we have a valid response format
      if (data && typeof data === 'object') {
        setSubscriptionStatus(data);
        console.log('✅ Profile: Subscription status set successfully:', data);
      } else {
        console.log('⚠️ Profile: Invalid data format received:', data);
        setSubscriptionStatus({ subscribed: false, error: 'Invalid response format' });
      }
    } catch (error) {
      console.error('❌ Profile: Error checking subscription status:', error);
      setSubscriptionStatus({ subscribed: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        toast({
          title: "Authentication required",
          description: "Please log in to manage your subscription.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name: data.name,
          email: data.email,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Update auth email if changed
      if (data.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: data.email,
        });

        if (authError) throw authError;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      passwordForm.reset();
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-accent">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto space-y-6"
        >
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          </div>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and email address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    {...profileForm.register("name")}
                    placeholder="Enter your name"
                  />
                  {profileForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...profileForm.register("email")}
                    placeholder="Enter your email"
                  />
                  {profileForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      {...passwordForm.register("currentPassword")}
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      {...passwordForm.register("newPassword")}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      {...passwordForm.register("confirmPassword")}
                      placeholder="Confirm new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          {/* Data & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>
                Learn about how your data is handled and our privacy practices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => window.open("https://bestselfs.com/data", "_blank")}
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Data & Privacy Policy
              </Button>
            </CardContent>
          </Card>

          {/* Subscription Management Section */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Management</CardTitle>
              <CardDescription>
                Manage your subscription, billing, and cancel if needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Force Refresh Button */}
                <Button 
                  onClick={checkSubscriptionStatus}
                  disabled={subscriptionLoading}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {subscriptionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                      Checking...
                    </>
                  ) : (
                    'Check Subscription Status'
                  )}
                </Button>

                {/* Status Display */}
                {(() => {
                  console.log('🎨 Profile: Rendering subscription section, status:', subscriptionStatus);
                  
                  if (subscriptionLoading) {
                    return (
                      <div className="flex items-center space-x-2 p-4 border rounded-lg">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm text-muted-foreground">Checking subscription status...</span>
                      </div>
                    );
                  }
                  
                  if (!subscriptionStatus) {
                    console.log('🎨 Profile: No subscription status available');
                    return (
                      <div className="p-4 border rounded-lg border-yellow-200 bg-yellow-50">
                        <p className="text-sm text-yellow-800">
                          Subscription status not loaded yet. Click "Check Subscription Status" above.
                        </p>
                      </div>
                    );
                  }
                  
                  if (subscriptionStatus.error) {
                    console.log('🎨 Profile: Showing error state:', subscriptionStatus.error);
                    return (
                      <div className="p-4 border rounded-lg border-red-200 bg-red-50">
                        <p className="text-sm text-red-800">
                          Error loading subscription: {subscriptionStatus.error}
                        </p>
                      </div>
                    );
                  }

                  console.log('🎨 Profile: Showing subscription details for subscribed:', subscriptionStatus.subscribed);
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={subscriptionStatus.subscribed ? "default" : "secondary"}>
                          {subscriptionStatus.subscribed ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      {subscriptionStatus.subscription_tier && (
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Plan:</span>
                          <span className="text-sm text-muted-foreground">{subscriptionStatus.subscription_tier}</span>
                        </div>
                      )}
                      
                      {subscriptionStatus.subscription_end && (
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Next billing:</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(subscriptionStatus.subscription_end).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      
                      {subscriptionStatus.subscribed ? (
                        <Button 
                          onClick={handleManageSubscription}
                          disabled={portalLoading}
                          variant="destructive"
                          className="w-full"
                        >
                          {portalLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Opening portal...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Manage Subscription & Billing
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="p-4 border rounded-lg border-blue-200 bg-blue-50">
                          <p className="text-sm text-blue-800">
                            No active subscription found. You can subscribe to premium features on the main page.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Debug Information */}
                <details className="mt-4">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Debug Information (Click to expand)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono">
                    <div><strong>User:</strong> {user?.email || 'Not logged in'}</div>
                    <div><strong>Loading:</strong> {subscriptionLoading.toString()}</div>
                    <div><strong>Raw Status:</strong> {JSON.stringify(subscriptionStatus, null, 2)}</div>
                    <div><strong>Portal Loading:</strong> {portalLoading.toString()}</div>
                  </div>
                </details>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;