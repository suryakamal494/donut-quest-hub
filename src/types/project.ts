// Project Type Definitions

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProjectAccess {
  id: string;
  user_id: string;
  project_id: string;
  created_at: string;
  // Joined data
  project?: Project;
}

export interface CreateProjectForm {
  name: string;
  description: string;
}
