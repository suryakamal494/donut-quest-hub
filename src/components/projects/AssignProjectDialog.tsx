import { useState, useEffect } from "react";
import { Loader2, FolderKanban, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/types/project";

interface AssignProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onSuccess?: () => void;
}

export function AssignProjectDialog({ 
  open, 
  onOpenChange, 
  userId, 
  userName,
  onSuccess 
}: AssignProjectDialogProps) {
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [existingAccess, setExistingAccess] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all projects
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .order("created_at");

      setProjects(projectsData || []);

      // Fetch user's existing project access
      const { data: accessData } = await supabase
        .from("user_project_access")
        .select("project_id")
        .eq("user_id", userId);

      const accessSet = new Set((accessData || []).map(a => a.project_id));
      setExistingAccess(accessSet);
      setSelectedProjects(new Set(accessSet));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleSave = async () => {
    if (selectedProjects.size === 0) {
      toast({
        title: "No projects selected",
        description: "Please select at least one project to assign",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Find projects to add and remove
      const toAdd = [...selectedProjects].filter(id => !existingAccess.has(id));
      const toRemove = [...existingAccess].filter(id => !selectedProjects.has(id));

      // Remove access
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from("user_project_access")
          .delete()
          .eq("user_id", userId)
          .in("project_id", toRemove);

        if (removeError) throw removeError;
      }

      // Add access
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from("user_project_access")
          .insert(
            toAdd.map(projectId => ({
              user_id: userId,
              project_id: projectId,
            }))
          );

        if (addError) throw addError;
      }

      toast({
        title: "Projects updated",
        description: `${userName} now has access to ${selectedProjects.size} project(s)`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating projects:", error);
      toast({
        title: "Error updating projects",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            Assign Projects
          </DialogTitle>
          <DialogDescription>
            Select projects to assign to <span className="font-medium">{userName}</span>
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderKanban className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No projects available</p>
            <p className="text-sm">Create a project first</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-3 py-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedProjects.has(project.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                  onClick={() => toggleProject(project.id)}
                >
                  <Checkbox
                    checked={selectedProjects.has(project.id)}
                    onCheckedChange={() => toggleProject(project.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{project.name}</p>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  {existingAccess.has(project.id) && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save ({selectedProjects.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
