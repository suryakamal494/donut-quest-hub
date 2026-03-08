import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@/types/project";

interface ProjectWithWhatsApp extends Project {
  whatsapp_notifications_enabled: boolean;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  approval_status: "pending" | "approved" | "rejected";
  automation_enabled: boolean;
  docs_enabled: boolean;
  created_at: string;
}

export function useAdminDashboard() {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<ProjectWithWhatsApp[]>([]);
  const [userProjectCounts, setUserProjectCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to load users" });
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
      const { data } = await supabase.from("projects").select("*").order("created_at");
      setProjects((data || []) as ProjectWithWhatsApp[]);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchUserProjectCounts = async () => {
    try {
      const { data } = await supabase.from("user_project_access").select("user_id, project_id");
      const counts = new Map<string, number>();
      (data || []).forEach(access => {
        counts.set(access.user_id, (counts.get(access.user_id) || 0) + 1);
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
      const { error } = await supabase.from("profiles").update({ approval_status: newStatus }).eq("user_id", userId);
      if (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to update user status" });
        return;
      }
      toast({ title: "Success", description: `User has been ${newStatus}` });
      fetchUsers();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingUsers = users.filter(u => u.approval_status === "pending");
  const approvedUsers = users.filter(u => u.approval_status === "approved");
  const rejectedUsers = users.filter(u => u.approval_status === "rejected");

  return {
    profile,
    signOut,
    users,
    projects,
    userProjectCounts,
    isLoading,
    actionLoading,
    pendingUsers,
    approvedUsers,
    rejectedUsers,
    handleApproval,
    loadAllData,
    fetchProjects,
  };
}
