import { ChevronDown, FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { CreateProjectDialog } from "./CreateProjectDialog";

export function ProjectSelector() {
  const { currentProject, projects, setCurrentProject, isLoading } = useProject();
  const { role } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg animate-pulse">
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
        <FolderKanban className="h-4 w-4 text-amber-600" />
        <span className="text-sm text-amber-700">No projects</span>
        {role === "admin" && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCreateDialog(true)}
              className="h-6 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-100"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create
            </Button>
            <CreateProjectDialog 
              open={showCreateDialog} 
              onOpenChange={setShowCreateDialog}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 px-3 py-1.5 h-auto bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg"
          >
            <FolderKanban className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium max-w-[150px] truncate">
              {currentProject?.name || "Select Project"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-background z-[100]">
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => setCurrentProject(project)}
              className={`cursor-pointer ${
                currentProject?.id === project.id ? "bg-primary/10 text-primary" : ""
              }`}
            >
              <FolderKanban className="h-4 w-4 mr-2" />
              <span className="truncate">{project.name}</span>
            </DropdownMenuItem>
          ))}
          
          {role === "admin" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowCreateDialog(true)}
                className="cursor-pointer text-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Project
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <CreateProjectDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
}
