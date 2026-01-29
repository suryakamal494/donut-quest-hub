import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproval?: boolean;
  allowedRoles?: ("admin" | "user" | "developer")[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireApproval = true,
  allowedRoles,
}) => {
  const { user, profile, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user needs approval but is still pending
  if (requireApproval && profile?.approval_status === "pending") {
    return <Navigate to="/pending-approval" replace />;
  }

  // Check if user has been rejected
  if (profile?.approval_status === "rejected") {
    return <Navigate to="/access-denied" replace />;
  }

  // Check role-based access
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    if (role === "admin") {
      return <Navigate to="/admin" replace />;
    } else if (role === "developer") {
      return <Navigate to="/qa/failures" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
