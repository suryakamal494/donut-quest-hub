import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LogOut, 
  ClipboardCheck,
  ClipboardList,
  Bug,
  CheckCircle2
} from "lucide-react";

const UserDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">QA Platform</h1>
              <p className="text-xs text-muted-foreground">User Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.full_name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Welcome, {profile?.full_name}!
          </h2>
          <p className="text-muted-foreground">
            Your account has been approved. You can now access the QA Platform features.
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-8 border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800">Account Active</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-green-700 text-sm">
              Your account is fully approved and active. You have access to all user features.
            </p>
          </CardContent>
        </Card>

        {/* Module Cards */}
        <h3 className="text-lg font-semibold mb-4">Available Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test Cases Module */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ClipboardList className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Test Cases</CardTitle>
                  <CardDescription>Coming Soon</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create, manage, and execute test cases for inter-login testing scenarios. 
                Track test coverage across Super Admin, Institute Teacher, and Student logins.
              </p>
            </CardContent>
          </Card>

          {/* Bug Reporting Module */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <Bug className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle>Bug Reporting</CardTitle>
                  <CardDescription>Coming Soon</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Report, track, and manage bugs discovered during testing. 
                Link bugs to test cases and monitor resolution status.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Message */}
        <Card className="mt-8 bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              The Test Cases and Bug Reporting modules will be available in the next update. 
              Stay tuned!
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UserDashboard;
