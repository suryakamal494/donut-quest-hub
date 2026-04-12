import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ProductSuggestion {
  id: string;
  suggestion_code: string;
  title: string;
  description: string | null;
  category: "ux" | "feature" | "performance" | "workflow" | "other";
  priority: "critical" | "high" | "medium" | "low";
  status: "pending" | "approved" | "rejected";
  dev_status: "planned" | "in_progress" | "done" | "wont_do" | null;
  attachments: string[];
  created_by: string;
  project_id: string | null;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  dev_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSuggestions() {
  const { currentProject } = useProject();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const suggestionsQuery = useQuery({
    queryKey: ["product-suggestions", currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const { data, error } = await supabase
        .from("product_suggestions")
        .select("*")
        .eq("project_id", currentProject.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ProductSuggestion[];
    },
    enabled: !!currentProject?.id,
  });

  const createSuggestion = useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string;
      category: string;
      priority: string;
      attachments?: string[];
    }) => {
      if (!user || !currentProject) throw new Error("Not authenticated");
      const { error } = await supabase.from("product_suggestions").insert({
        title: values.title,
        description: values.description || null,
        category: values.category as any,
        priority: values.priority as any,
        attachments: values.attachments || [],
        created_by: user.id,
        project_id: currentProject.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-suggestions"] });
      toast.success("Suggestion submitted successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateSuggestion = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from("product_suggestions")
        .update(values as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-suggestions"] });
      toast.success("Suggestion updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteSuggestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_suggestions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-suggestions"] });
      toast.success("Suggestion deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return {
    suggestions: suggestionsQuery.data || [],
    isLoading: suggestionsQuery.isLoading,
    createSuggestion,
    updateSuggestion,
    deleteSuggestion,
    role,
  };
}
