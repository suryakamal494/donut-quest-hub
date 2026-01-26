import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { XCircle, LogOut, ClipboardCheck, Mail } from "lucide-react";

const AccessDenied: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-warm px-4 py-8">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-100/20 rounded-full blur-3xl" />
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
            <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
          </div>

          {/* Content */}
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            Your account registration has been declined
          </p>

          <p className="text-sm text-muted-foreground mb-6">
            Unfortunately, your account request has been rejected by an administrator. 
            If you believe this was a mistake, please contact your system administrator.
          </p>

          {/* Contact Info */}
          <div className="bg-muted/50 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Contact your administrator for assistance</span>
            </div>
          </div>

          {/* Action */}
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl border-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-smooth" 
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
