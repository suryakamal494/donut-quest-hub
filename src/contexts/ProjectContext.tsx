import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { retryWithBackoff } from "@/lib/auth-resilience";
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
      const result = await retryWithBackoff(
        async () => {
          const res = await supabase.from("projects").select("*").order("created_at", { ascending: true });
          if (res.error) throw res.error;
          return res.data;
        },
        { maxRetries: 2, baseDelayMs: 1000 }
      );

      const projectsList = result || [];
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

  // Auto-recovery when network comes back online
  useEffect(() => {
    const handleOnline = () => {
      console.log("[ProjectContext] Network back online, re-fetching projects...");
      if (user) fetchProjects();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user, fetchProjects]);

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
