import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut, RefreshCw } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Pending Approval</CardTitle>
          <CardDescription className="text-base">
            Your account is awaiting administrator approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Thank you for registering! An administrator will review your account and 
            approve your access to the QA Platform. You will be able to access the 
            platform once your account is approved.
          </p>
          {profile && (
            <div className="bg-muted rounded-lg p-4 text-left">
              <p className="text-sm text-muted-foreground">Registered as:</p>
              <p className="font-medium">{profile.full_name}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Check Status
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground" 
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PendingApproval;
