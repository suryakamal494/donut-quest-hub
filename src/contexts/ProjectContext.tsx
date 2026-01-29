import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type { Project } from "@/types/project";

const PROJECT_STORAGE_KEY = "qa_selected_project";

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  setCurrentProject: (project: Project | null) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setCurrentProjectState(null);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch projects the user has access to
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching projects:", error);
        setProjects([]);
        return;
      }

      const projectsList = data || [];
      setProjects(projectsList);

      // Restore last selected project from localStorage
      const savedProjectId = localStorage.getItem(PROJECT_STORAGE_KEY);
      
      if (savedProjectId) {
        const savedProject = projectsList.find(p => p.id === savedProjectId);
        if (savedProject) {
          setCurrentProjectState(savedProject);
        } else if (projectsList.length > 0) {
          // If saved project not found, select first available
          setCurrentProjectState(projectsList[0]);
          localStorage.setItem(PROJECT_STORAGE_KEY, projectsList[0].id);
        }
      } else if (projectsList.length > 0) {
        // No saved project, select first
        setCurrentProjectState(projectsList[0]);
        localStorage.setItem(PROJECT_STORAGE_KEY, projectsList[0].id);
      }
    } catch (error) {
      console.error("Error in fetchProjects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const setCurrentProject = (project: Project | null) => {
    setCurrentProjectState(project);
    if (project) {
      localStorage.setItem(PROJECT_STORAGE_KEY, project.id);
    } else {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
    }
  };

  const refreshProjects = async () => {
    await fetchProjects();
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projects,
        isLoading,
        setCurrentProject,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
