import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ClearTestDataDialog } from "@/components/qa/ClearTestDataDialog";
import { CreateProjectDialog, AssignProjectDialog } from "@/components/projects";
import { 
  LogOut, 
  Users, 
  UserCheck, 
  UserX, 
  Clock,
  ClipboardCheck,
  Loader2,
  Check,
  X,
  Menu,
  ChevronRight,
  TestTube2,
  PlayCircle,
  BarChart3,
  Settings,
  FolderKanban,
  Plus,
  FolderOpen
} from "lucide-react";
import type { Project } from "@/types/project";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface UserProjectCount {
  user_id: string;
  count: number;
}

const AdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userProjectCounts, setUserProjectCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Dialogs
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [assignProjectUser, setAssignProjectUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load users",
        });
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at");

      if (error) {
        console.error("Error fetching projects:", error);
        return;
      }

      setProjects(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchUserProjectCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("user_project_access")
        .select("user_id, project_id");

      if (error) {
        console.error("Error fetching project counts:", error);
        return;
      }

      // Count projects per user
      const counts = new Map<string, number>();
      (data || []).forEach(access => {
        const current = counts.get(access.user_id) || 0;
        counts.set(access.user_id, current + 1);
      });
      setUserProjectCounts(counts);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([fetchUsers(), fetchProjects(), fetchUserProjectCounts()]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleApproval = async (userId: string, newStatus: "approved" | "rejected") => {
    setActionLoading(userId);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ approval_status: newStatus })
        .eq("user_id", userId);

      if (error) {
        console.error("Error updating status:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update user status",
        });
        return;
      }

      toast({
        title: "Success",
        description: `User has been ${newStatus}`,
      });

      fetchUsers();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const pendingUsers = users.filter(u => u.approval_status === "pending");
  const approvedUsers = users.filter(u => u.approval_status === "approved");
  const rejectedUsers = users.filter(u => u.approval_status === "rejected");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
            <Check className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
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
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="glass-card rounded-2xl p-4 md:p-6 shadow-warm">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
              </div>
              <span className="text-2xl md:text-3xl font-bold text-amber-600">{pendingUsers.length}</span>
            </div>
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Pending</p>
          </div>

          <div className="glass-card rounded-2xl p-4 md:p-6 shadow-warm">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
              </div>
              <span className="text-2xl md:text-3xl font-bold text-emerald-600">{approvedUsers.length}</span>
            </div>
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Approved</p>
          </div>

          <div className="glass-card rounded-2xl p-4 md:p-6 shadow-warm">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-red-100 flex items-center justify-center">
                <UserX className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
              </div>
              <span className="text-2xl md:text-3xl font-bold text-red-600">{rejectedUsers.length}</span>
            </div>
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Rejected</p>
          </div>
        </div>

        {/* Projects Management */}
        <div className="glass-card rounded-2xl shadow-warm mb-6 md:mb-8 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FolderKanban className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-foreground">Projects</h2>
                  <p className="text-sm text-muted-foreground hidden sm:block">Manage QA testing projects</p>
                </div>
              </div>
              <Button
                onClick={() => setShowCreateProject(true)}
                className="rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Create Project</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>
          <div className="p-4 md:p-6">
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No projects yet</p>
                <p className="text-sm text-muted-foreground">Create your first project to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-4 rounded-xl border-2 border-border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer"
                    onClick={() => navigate("/qa")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FolderOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {project.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Created {new Date(project.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* QA Module Quick Access */}
        <div className="glass-card rounded-2xl shadow-warm mb-6 md:mb-8 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TestTube2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg text-foreground">QA Testing Module</h2>
                <p className="text-sm text-muted-foreground hidden sm:block">Manage test scenarios and track execution</p>
              </div>
            </div>
          </div>
          <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/qa")}
              className="h-auto py-4 px-4 rounded-xl border-2 hover:border-primary/30 hover:bg-primary/5 justify-start"
            >
              <BarChart3 className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <p className="font-medium">Dashboard</p>
                <p className="text-xs text-muted-foreground">Overview & stats</p>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/qa/scenarios")}
              className="h-auto py-4 px-4 rounded-xl border-2 hover:border-primary/30 hover:bg-primary/5 justify-start"
            >
              <TestTube2 className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <p className="font-medium">Scenarios</p>
                <p className="text-xs text-muted-foreground">Manage test cases</p>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/qa/runs")}
              className="h-auto py-4 px-4 rounded-xl border-2 hover:border-primary/30 hover:bg-primary/5 justify-start"
            >
              <PlayCircle className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <p className="font-medium">Test Runs</p>
                <p className="text-xs text-muted-foreground">Execute & track</p>
              </div>
            </Button>
          </div>
        </div>

        {/* Admin Settings */}
        <div className="glass-card rounded-2xl shadow-warm mb-6 md:mb-8 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-semibold text-lg text-foreground">Admin Settings</h2>
                <p className="text-sm text-muted-foreground hidden sm:block">Dangerous actions - use with caution</p>
              </div>
            </div>
          </div>
          <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
              <div>
                <p className="font-medium text-foreground">Clear All Test Data</p>
                <p className="text-sm text-muted-foreground">Permanently delete all test scenarios, cases, runs, and results</p>
              </div>
              <ClearTestDataDialog />
            </div>
          </div>
        </div>

        {/* Pending Approvals Section */}
        {pendingUsers.length > 0 && (
          <div className="glass-card rounded-2xl shadow-warm mb-6 md:mb-8 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-foreground">Pending Approvals</h2>
                  <p className="text-sm text-muted-foreground hidden sm:block">Users awaiting your approval</p>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-border/50">
              {pendingUsers.map((user) => (
                <div key={user.id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs text-muted-foreground hidden md:block">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleApproval(user.user_id, "approved")}
                      disabled={actionLoading === user.user_id}
                      className="flex-1 sm:flex-none rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-smooth"
                    >
                      {actionLoading === user.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApproval(user.user_id, "rejected")}
                      disabled={actionLoading === user.user_id}
                      className="flex-1 sm:flex-none rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-smooth"
                    >
                      {actionLoading === user.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Users Section */}
        <div className="glass-card rounded-2xl shadow-warm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg text-foreground">All Users</h2>
                <p className="text-sm text-muted-foreground hidden sm:block">Complete list of registered users</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No users registered yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {users.map((user) => (
                <div key={user.id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold shrink-0">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{user.full_name}</p>
                          {getStatusBadge(user.approval_status)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-13 sm:pl-0">
                    {/* Project count badge */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssignProjectUser(user);
                      }}
                      className="rounded-xl text-xs"
                    >
                      <FolderKanban className="h-3.5 w-3.5 mr-1" />
                      {userProjectCounts.get(user.user_id) || 0} Projects
                    </Button>
                    
                    <span className="text-xs text-muted-foreground hidden md:block">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                    {user.approval_status !== "approved" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleApproval(user.user_id, "approved")}
                        disabled={actionLoading === user.user_id}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl"
                      >
                        {actionLoading === user.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {user.approval_status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleApproval(user.user_id, "rejected")}
                        disabled={actionLoading === user.user_id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                      >
                        {actionLoading === user.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* Dialogs */}
      <CreateProjectDialog 
        open={showCreateProject} 
        onOpenChange={(open) => {
          setShowCreateProject(open);
          if (!open) loadAllData();
        }}
      />
      
      {assignProjectUser && (
        <AssignProjectDialog
          open={!!assignProjectUser}
          onOpenChange={(open) => {
            if (!open) setAssignProjectUser(null);
          }}
          userId={assignProjectUser.user_id}
          userName={assignProjectUser.full_name}
          onSuccess={() => {
            loadAllData();
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
