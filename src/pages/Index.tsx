import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Index: React.FC = () => {
  const { user, profile, role, isLoading } = useAuth();
  const navigate = useNavigate();

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

    // Route based on role
    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  }, [user, profile, role, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
