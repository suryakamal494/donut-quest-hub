import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  ClipboardCheck,
  ClipboardList,
  Bug,
  CheckCircle2,
  ChevronRight,
  Sparkles
} from "lucide-react";

const UserDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-warm">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg text-foreground">QA Platform</h1>
              <p className="text-xs text-muted-foreground">User Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden md:block">
              Welcome, <span className="font-medium text-foreground">{profile?.full_name}</span>
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="rounded-xl border-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-smooth"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Welcome Section */}
        <div className="glass-card rounded-2xl p-6 md:p-8 shadow-warm mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-gradient-primary flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-glow-primary">
              {profile?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                Welcome back, {profile?.full_name?.split(" ")[0]}! 👋
              </h2>
              <p className="text-muted-foreground">
                Your account is active and ready to use. Start testing today!
              </p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="glass-card rounded-2xl p-4 md:p-6 shadow-warm mb-6 md:mb-8 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-800">Account Active</h3>
              <p className="text-sm text-emerald-600">You have full access to all user features</p>
            </div>
          </div>
        </div>

        {/* Module Cards */}
        <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Available Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Test Cases Module - Now Active */}
          <div 
            onClick={() => navigate("/qa")}
            className="glass-card rounded-2xl p-6 shadow-warm cursor-pointer group hover:border-primary/30 hover:shadow-glow-primary transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                <ClipboardList className="h-7 w-7 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground">Test Cases</h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-xs font-medium text-emerald-700">
                    Active
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Create, manage, and execute test cases for inter-login testing scenarios.
                </p>
                <div className="flex items-center text-sm text-blue-600 font-medium group-hover:text-blue-700">
                  Open Module
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          {/* Bug Reporting Module */}
          <div className="glass-card rounded-2xl p-6 shadow-warm opacity-70 cursor-not-allowed group">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <Bug className="h-7 w-7 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground">Bug Reporting</h4>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Report, track, and manage bugs discovered during testing.
                </p>
                <div className="flex items-center text-sm text-red-600 font-medium">
                  Learn more
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Message */}
        <div className="glass-card rounded-2xl p-6 mt-6 md:mt-8 shadow-warm text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground">
            The Test Cases and Bug Reporting modules will be available in the next update.
            <br className="hidden sm:block" />
            Stay tuned for new features!
          </p>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
