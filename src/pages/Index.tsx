import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Index: React.FC = () => {
  const { user, profile, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    // Check approval status
    if (profile?.approval_status === "pending") {
      navigate("/pending-approval");
      return;
    }

    if (profile?.approval_status === "rejected") {
      navigate("/access-denied");
      return;
    }

    // All approved users go directly to QA dashboard
    navigate("/qa");
  }, [user, profile, role, isLoading, navigate]);

  // Show retry after 10 seconds of loading
  useEffect(() => {
    if (!isLoading) {
      setShowRetry(false);
      return;
    }
    const timer = setTimeout(() => setShowRetry(true), 10000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (showRetry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <div className="mx-auto mb-2">
              <WifiOff className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">Unable to Connect</CardTitle>
            <CardDescription>
              The server is taking too long to respond. Please check your internet connection and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
