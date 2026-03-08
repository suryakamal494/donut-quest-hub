import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ClearTestDataDialog } from "@/components/qa/ClearTestDataDialog";
import { CreateProjectDialog, AssignProjectDialog } from "@/components/projects";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { PendingApprovalsSection } from "@/components/admin/PendingApprovalsSection";
import { UserListSection } from "@/components/admin/UserListSection";
import { WhatsAppProjectSettings } from "@/components/admin/WhatsAppProjectSettings";
import {
  LogOut, ClipboardCheck, Loader2,
  TestTube2, PlayCircle, BarChart3, Settings,
  FolderKanban, Plus, FolderOpen, Key,
} from "lucide-react";
import type { Project } from "@/types/project";

interface ProjectWithWhatsApp extends Project {
  whatsapp_notifications_enabled: boolean;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  approval_status: "pending" | "approved" | "rejected";
  automation_enabled: boolean;
  docs_enabled: boolean;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<ProjectWithWhatsApp[]>([]);
  const [userProjectCounts, setUserProjectCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [assignProjectUser, setAssignProjectUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) { toast({ variant: "destructive", title: "Error", description: "Failed to load users" }); return; }
      setUsers(data || []);
    } catch (error) { console.error("Error:", error); } finally { setIsLoading(false); }
  };

  const fetchProjects = async () => {
    try {
      const { data } = await supabase.from("projects").select("*").order("created_at");
      setProjects((data || []) as ProjectWithWhatsApp[]);
    } catch (error) { console.error("Error:", error); }
  };

  const fetchUserProjectCounts = async () => {
    try {
      const { data } = await supabase.from("user_project_access").select("user_id, project_id");
      const counts = new Map<string, number>();
      (data || []).forEach(access => { counts.set(access.user_id, (counts.get(access.user_id) || 0) + 1); });
      setUserProjectCounts(counts);
    } catch (error) { console.error("Error:", error); }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([fetchUsers(), fetchProjects(), fetchUserProjectCounts()]);
    setIsLoading(false);
  };

  useEffect(() => { loadAllData(); }, []);

  const handleApproval = async (userId: string, newStatus: "approved" | "rejected") => {
    setActionLoading(userId);
    try {
      const { error } = await supabase.from("profiles").update({ approval_status: newStatus }).eq("user_id", userId);
      if (error) { toast({ variant: "destructive", title: "Error", description: "Failed to update user status" }); return; }
      toast({ title: "Success", description: `User has been ${newStatus}` });
      fetchUsers();
    } catch (error) { console.error("Error:", error); } finally { setActionLoading(null); }
  };

  const pendingUsers = users.filter(u => u.approval_status === "pending");
  const approvedUsers = users.filter(u => u.approval_status === "approved");
  const rejectedUsers = users.filter(u => u.approval_status === "rejected");

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
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/login"); }} className="rounded-xl border-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-smooth">
              <LogOut className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <AdminStatsCards pendingCount={pendingUsers.length} approvedCount={approvedUsers.length} rejectedCount={rejectedUsers.length} />

        {/* Projects */}
        <div className="glass-card rounded-2xl shadow-warm mb-6 md:mb-8 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><FolderKanban className="h-5 w-5 text-primary" /></div>
                <div><h2 className="font-semibold text-lg text-foreground">Projects</h2><p className="text-sm text-muted-foreground hidden sm:block">Manage QA testing projects</p></div>
              </div>
              <Button onClick={() => setShowCreateProject(true)} className="rounded-xl"><Plus className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Create Project</span><span className="sm:hidden">New</span></Button>
            </div>
          </div>
          <div className="p-4 md:p-6">
            {projects.length === 0 ? (
              <div className="text-center py-8"><FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">No projects yet</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <div key={project.id} className="p-4 rounded-xl border-2 border-border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer" onClick={() => navigate("/qa")}>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><FolderOpen className="h-5 w-5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{project.name}</h3>
                        {project.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{project.description}</p>}
                        <p className="text-xs text-muted-foreground mt-2">Created {new Date(project.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* QA Quick Access */}
        <div className="glass-card rounded-2xl shadow-warm mb-6 md:mb-8 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><TestTube2 className="h-5 w-5 text-primary" /></div>
              <div><h2 className="font-semibold text-lg text-foreground">QA Testing Module</h2><p className="text-sm text-muted-foreground hidden sm:block">Manage test scenarios and track execution</p></div>
            </div>
          </div>
          <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: BarChart3, label: "Dashboard", desc: "Overview & stats", path: "/qa" },
              { icon: TestTube2, label: "Scenarios", desc: "Manage test cases", path: "/qa/scenarios" },
              { icon: PlayCircle, label: "Test Runs", desc: "Execute & track", path: "/qa/runs" },
              { icon: Key, label: "API Keys", desc: "External bug widget", path: "/bugs/api-keys" },
            ].map(item => (
              <Button key={item.path} variant="outline" onClick={() => navigate(item.path)} className="h-auto py-4 px-4 rounded-xl border-2 hover:border-primary/30 hover:bg-primary/5 justify-start">
                <item.icon className="h-5 w-5 mr-3 text-primary" />
                <div className="text-left"><p className="font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
              </Button>
            ))}
          </div>
        </div>

        {/* Admin Settings */}
        <div className="glass-card rounded-2xl shadow-warm mb-6 md:mb-8 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center"><Settings className="h-5 w-5 text-destructive" /></div>
              <div><h2 className="font-semibold text-lg text-foreground">Admin Settings</h2><p className="text-sm text-muted-foreground hidden sm:block">Dangerous actions - use with caution</p></div>
            </div>
          </div>
          <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
              <div><p className="font-medium text-foreground">Clear All Test Data</p><p className="text-sm text-muted-foreground">Permanently delete all test scenarios, cases, runs, and results</p></div>
              <ClearTestDataDialog />
            </div>
          </div>
        </div>

        {/* WhatsApp Notification Settings */}
        <div className="mb-6 md:mb-8">
          <WhatsAppProjectSettings projects={projects} onUpdate={fetchProjects} />
        </div>

        <PendingApprovalsSection pendingUsers={pendingUsers} actionLoading={actionLoading} onApproval={handleApproval} />

        <UserListSection
          users={users}
          isLoading={isLoading}
          actionLoading={actionLoading}
          userProjectCounts={userProjectCounts}
          onApproval={handleApproval}
          onAssignProject={setAssignProjectUser}
        />
      </main>

      <CreateProjectDialog open={showCreateProject} onOpenChange={(open) => { setShowCreateProject(open); if (!open) loadAllData(); }} />
      {assignProjectUser && (
        <AssignProjectDialog
          open={!!assignProjectUser}
          onOpenChange={(open) => { if (!open) setAssignProjectUser(null); }}
          userId={assignProjectUser.user_id}
          userName={assignProjectUser.full_name}
          onSuccess={loadAllData}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
