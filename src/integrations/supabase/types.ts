export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      automation_results: {
        Row: {
          actual_result: string | null
          ai_script: string | null
          automation_run_id: string
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          failed_step: number | null
          id: string
          screenshots: string[] | null
          status: string
          test_case_id: string
          test_result_id: string | null
        }
        Insert: {
          actual_result?: string | null
          ai_script?: string | null
          automation_run_id: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          failed_step?: number | null
          id?: string
          screenshots?: string[] | null
          status?: string
          test_case_id: string
          test_result_id?: string | null
        }
        Update: {
          actual_result?: string | null
          ai_script?: string | null
          automation_run_id?: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          failed_step?: number | null
          id?: string
          screenshots?: string[] | null
          status?: string
          test_case_id?: string
          test_result_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_results_automation_run_id_fkey"
            columns: ["automation_run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_results_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_results_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          completed_at: string | null
          completed_cases: number
          created_at: string
          created_by: string | null
          credentials: Json | null
          error_message: string | null
          execution_log: Json | null
          id: string
          project_id: string | null
          started_at: string
          status: string
          target_url: string
          test_run_id: string | null
          total_cases: number
          webhook_secret: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_cases?: number
          created_at?: string
          created_by?: string | null
          credentials?: Json | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          project_id?: string | null
          started_at?: string
          status?: string
          target_url: string
          test_run_id?: string | null
          total_cases?: number
          webhook_secret?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_cases?: number
          created_at?: string
          created_by?: string | null
          credentials?: Json | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          project_id?: string | null
          started_at?: string
          status?: string
          target_url?: string
          test_run_id?: string | null
          total_cases?: number
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_comments: {
        Row: {
          bug_id: string
          comment: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          bug_id: string
          comment: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          bug_id?: string
          comment?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_comments_bug_id_fkey"
            columns: ["bug_id"]
            isOneToOne: false
            referencedRelation: "bugs"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_history: {
        Row: {
          bug_id: string
          changed_by: string
          created_at: string
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          bug_id: string
          changed_by: string
          created_at?: string
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          bug_id?: string
          changed_by?: string
          created_at?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bug_history_bug_id_fkey"
            columns: ["bug_id"]
            isOneToOne: false
            referencedRelation: "bugs"
            referencedColumns: ["id"]
          },
        ]
      }
      bugs: {
        Row: {
          actual_behavior: string | null
          assigned_to: string | null
          attachments: string[] | null
          bug_code: string
          bug_type: Database["public"]["Enums"]["bug_type"] | null
          created_at: string
          description: string | null
          developer_response: string | null
          environment: string | null
          expected_behavior: string | null
          feature_id: string | null
          fix_status: string | null
          id: string
          login_type: Database["public"]["Enums"]["login_type"] | null
          project_id: string | null
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          scenario_id: string | null
          severity: Database["public"]["Enums"]["bug_severity"]
          status: Database["public"]["Enums"]["bug_status"]
          steps_to_reproduce: string[] | null
          sub_module: string | null
          test_result_id: string | null
          title: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          actual_behavior?: string | null
          assigned_to?: string | null
          attachments?: string[] | null
          bug_code: string
          bug_type?: Database["public"]["Enums"]["bug_type"] | null
          created_at?: string
          description?: string | null
          developer_response?: string | null
          environment?: string | null
          expected_behavior?: string | null
          feature_id?: string | null
          fix_status?: string | null
          id?: string
          login_type?: Database["public"]["Enums"]["login_type"] | null
          project_id?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scenario_id?: string | null
          severity?: Database["public"]["Enums"]["bug_severity"]
          status?: Database["public"]["Enums"]["bug_status"]
          steps_to_reproduce?: string[] | null
          sub_module?: string | null
          test_result_id?: string | null
          title: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          actual_behavior?: string | null
          assigned_to?: string | null
          attachments?: string[] | null
          bug_code?: string
          bug_type?: Database["public"]["Enums"]["bug_type"] | null
          created_at?: string
          description?: string | null
          developer_response?: string | null
          environment?: string | null
          expected_behavior?: string | null
          feature_id?: string | null
          fix_status?: string | null
          id?: string
          login_type?: Database["public"]["Enums"]["login_type"] | null
          project_id?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scenario_id?: string | null
          severity?: Database["public"]["Enums"]["bug_severity"]
          status?: Database["public"]["Enums"]["bug_status"]
          steps_to_reproduce?: string[] | null
          sub_module?: string | null
          test_result_id?: string | null
          title?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bugs_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bugs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bugs_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "test_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bugs_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          created_at: string
          description: string | null
          id: string
          login_type: Database["public"]["Enums"]["login_type"]
          name: string
          order_index: number
          project_id: string | null
          sub_modules: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          login_type: Database["public"]["Enums"]["login_type"]
          name: string
          order_index?: number
          project_id?: string | null
          sub_modules?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          login_type?: Database["public"]["Enums"]["login_type"]
          name?: string
          order_index?: number
          project_id?: string | null
          sub_modules?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "features_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          automation_enabled: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          automation_enabled?: boolean
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          automation_enabled?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_activity: {
        Row: {
          id: string
          last_active_at: string
          project_id: string | null
          scenario_id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          last_active_at?: string
          project_id?: string | null
          scenario_id: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          last_active_at?: string
          project_id?: string | null
          scenario_id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_activity_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "test_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cases: {
        Row: {
          case_code: string
          content_types: string[] | null
          created_at: string
          created_by: string | null
          dependencies: string[] | null
          description: string | null
          enriched_steps: Json | null
          expected_result: string
          id: string
          is_regression: boolean
          login_type: Database["public"]["Enums"]["login_type"]
          order_index: number
          preconditions: string[] | null
          scenario_id: string
          title: string
          updated_at: string
        }
        Insert: {
          case_code: string
          content_types?: string[] | null
          created_at?: string
          created_by?: string | null
          dependencies?: string[] | null
          description?: string | null
          enriched_steps?: Json | null
          expected_result: string
          id?: string
          is_regression?: boolean
          login_type: Database["public"]["Enums"]["login_type"]
          order_index?: number
          preconditions?: string[] | null
          scenario_id: string
          title: string
          updated_at?: string
        }
        Update: {
          case_code?: string
          content_types?: string[] | null
          created_at?: string
          created_by?: string | null
          dependencies?: string[] | null
          description?: string | null
          enriched_steps?: Json | null
          expected_result?: string
          id?: string
          is_regression?: boolean
          login_type?: Database["public"]["Enums"]["login_type"]
          order_index?: number
          preconditions?: string[] | null
          scenario_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_cases_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "test_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          actual_result: string | null
          attachments: string[] | null
          bug_reference: string | null
          developer_response: string | null
          due_date: string | null
          executed_at: string | null
          executed_by: string | null
          fix_status: string | null
          fixed_at: string | null
          fixed_by: string | null
          id: string
          notes: string | null
          run_id: string
          sla_status: string | null
          status: Database["public"]["Enums"]["test_status"]
          test_case_id: string
        }
        Insert: {
          actual_result?: string | null
          attachments?: string[] | null
          bug_reference?: string | null
          developer_response?: string | null
          due_date?: string | null
          executed_at?: string | null
          executed_by?: string | null
          fix_status?: string | null
          fixed_at?: string | null
          fixed_by?: string | null
          id?: string
          notes?: string | null
          run_id: string
          sla_status?: string | null
          status?: Database["public"]["Enums"]["test_status"]
          test_case_id: string
        }
        Update: {
          actual_result?: string | null
          attachments?: string[] | null
          bug_reference?: string | null
          developer_response?: string | null
          due_date?: string | null
          executed_at?: string | null
          executed_by?: string | null
          fix_status?: string | null
          fixed_at?: string | null
          fixed_by?: string | null
          id?: string
          notes?: string | null
          run_id?: string
          sla_status?: string | null
          status?: Database["public"]["Enums"]["test_status"]
          test_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_runs: {
        Row: {
          completed_at: string | null
          executed_by: string | null
          id: string
          name: string
          project_id: string | null
          run_code: string
          run_type: string
          scenario_ids: string[] | null
          started_at: string
          status: Database["public"]["Enums"]["run_status"]
        }
        Insert: {
          completed_at?: string | null
          executed_by?: string | null
          id?: string
          name: string
          project_id?: string | null
          run_code: string
          run_type?: string
          scenario_ids?: string[] | null
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
        }
        Update: {
          completed_at?: string | null
          executed_by?: string | null
          id?: string
          name?: string
          project_id?: string | null
          run_code?: string
          run_type?: string
          scenario_ids?: string[] | null
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
        }
        Relationships: [
          {
            foreignKeyName: "test_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      test_scenarios: {
        Row: {
          business_impact: string | null
          created_at: string
          created_by: string | null
          description: string | null
          execution_count: number
          feature_id: string | null
          id: string
          last_tested_at: string | null
          last_tested_by: string | null
          login_types: Database["public"]["Enums"]["login_type"][]
          name: string
          pending_failures: number
          priority: Database["public"]["Enums"]["priority_level"]
          project_id: string | null
          scenario_code: string
          scenario_type: Database["public"]["Enums"]["scenario_type"]
          sub_module: string | null
          test_frequency: Database["public"]["Enums"]["test_frequency"]
          updated_at: string
        }
        Insert: {
          business_impact?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number
          feature_id?: string | null
          id?: string
          last_tested_at?: string | null
          last_tested_by?: string | null
          login_types: Database["public"]["Enums"]["login_type"][]
          name: string
          pending_failures?: number
          priority?: Database["public"]["Enums"]["priority_level"]
          project_id?: string | null
          scenario_code: string
          scenario_type: Database["public"]["Enums"]["scenario_type"]
          sub_module?: string | null
          test_frequency?: Database["public"]["Enums"]["test_frequency"]
          updated_at?: string
        }
        Update: {
          business_impact?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number
          feature_id?: string | null
          id?: string
          last_tested_at?: string | null
          last_tested_by?: string | null
          login_types?: Database["public"]["Enums"]["login_type"][]
          name?: string
          pending_failures?: number
          priority?: Database["public"]["Enums"]["priority_level"]
          project_id?: string | null
          scenario_code?: string
          scenario_type?: Database["public"]["Enums"]["scenario_type"]
          sub_module?: string | null
          test_frequency?: Database["public"]["Enums"]["test_frequency"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_scenarios_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_scenarios_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      test_steps: {
        Row: {
          action: string
          expected_outcome: string
          id: string
          order_index: number
          test_case_id: string
        }
        Insert: {
          action: string
          expected_outcome: string
          id?: string
          order_index?: number
          test_case_id: string
        }
        Update: {
          action?: string
          expected_outcome?: string
          id?: string
          order_index?: number
          test_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_steps_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_project_access: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_project_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_test_step: {
        Args: { _test_case_id: string }
        Returns: boolean
      }
      expire_stale_test_activity: { Args: never; Returns: undefined }
      get_approval_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["approval_status"]
      }
      has_project_access: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "developer"
      approval_status: "pending" | "approved" | "rejected"
      bug_severity: "critical" | "major" | "minor" | "trivial"
      bug_status: "open" | "in_progress" | "resolved" | "closed" | "wont_fix"
      bug_type:
        | "ui"
        | "functional"
        | "performance"
        | "data"
        | "security"
        | "other"
      login_type: "super_admin" | "institute" | "teacher" | "student"
      priority_level: "critical" | "high" | "medium" | "low"
      run_status: "in_progress" | "completed" | "aborted"
      scenario_type: "smoke" | "intra_login" | "inter_login"
      test_frequency: "one_time" | "regression" | "release"
      test_status: "pass" | "fail" | "blocked" | "skipped" | "pending"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "developer"],
      approval_status: ["pending", "approved", "rejected"],
      bug_severity: ["critical", "major", "minor", "trivial"],
      bug_status: ["open", "in_progress", "resolved", "closed", "wont_fix"],
      bug_type: [
        "ui",
        "functional",
        "performance",
        "data",
        "security",
        "other",
      ],
      login_type: ["super_admin", "institute", "teacher", "student"],
      priority_level: ["critical", "high", "medium", "low"],
      run_status: ["in_progress", "completed", "aborted"],
      scenario_type: ["smoke", "intra_login", "inter_login"],
      test_frequency: ["one_time", "regression", "release"],
      test_status: ["pass", "fail", "blocked", "skipped", "pending"],
    },
  },
} as const
