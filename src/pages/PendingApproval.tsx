import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, RefreshCw, ClipboardCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PendingApproval: React.FC = () => {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
    
    toast({
      title: "Status checked",
      description: "Your approval status has been refreshed.",
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // If approved, redirect
  React.useEffect(() => {
    if (profile?.approval_status === "approved") {
      navigate("/dashboard");
    } else if (profile?.approval_status === "rejected") {
      navigate("/access-denied");
    }
  }, [profile, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-warm px-4 py-8">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-primary shadow-warm">
            <ClipboardCheck className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-8 shadow-warm text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
          </div>

          {/* Content */}
          <h1 className="text-2xl font-bold text-foreground mb-2">Pending Approval</h1>
          <p className="text-muted-foreground mb-6">
            Your account is awaiting administrator approval
          </p>

          <p className="text-sm text-muted-foreground mb-6">
            Thank you for registering! An administrator will review your account 
            and approve your access to the QA Platform.
          </p>

          {/* User Info */}
          {profile && (
            <div className="bg-muted/50 rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Registered as</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                  {profile.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <p className="font-medium text-foreground">{profile.full_name}</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl border-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-smooth" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Check Status
            </Button>
            <Button 
              variant="ghost" 
              className="w-full h-12 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth" 
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
