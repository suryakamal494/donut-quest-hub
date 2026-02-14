import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export const AutomationGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile?.automation_enabled) {
    return <Navigate to="/qa" replace />;
  }

  return <>{children}</>;
};
