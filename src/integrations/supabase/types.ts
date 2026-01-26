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
      features: {
        Row: {
          created_at: string
          description: string | null
          id: string
          login_type: Database["public"]["Enums"]["login_type"]
          name: string
          order_index: number
          sub_modules: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          login_type: Database["public"]["Enums"]["login_type"]
          name: string
          order_index?: number
          sub_modules?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          login_type?: Database["public"]["Enums"]["login_type"]
          name?: string
          order_index?: number
          sub_modules?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_cases: {
        Row: {
          case_code: string
          content_types: string[] | null
          created_at: string
          created_by: string | null
          dependencies: string[] | null
          description: string | null
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
          bug_reference: string | null
          executed_at: string | null
          executed_by: string | null
          id: string
          notes: string | null
          run_id: string
          status: Database["public"]["Enums"]["test_status"]
          test_case_id: string
        }
        Insert: {
          actual_result?: string | null
          bug_reference?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          notes?: string | null
          run_id: string
          status?: Database["public"]["Enums"]["test_status"]
          test_case_id: string
        }
        Update: {
          actual_result?: string | null
          bug_reference?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          notes?: string | null
          run_id?: string
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
          run_code?: string
          run_type?: string
          scenario_ids?: string[] | null
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
        }
        Relationships: []
      }
      test_scenarios: {
        Row: {
          business_impact: string | null
          created_at: string
          created_by: string | null
          description: string | null
          feature_id: string | null
          id: string
          login_types: Database["public"]["Enums"]["login_type"][]
          name: string
          priority: Database["public"]["Enums"]["priority_level"]
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
          feature_id?: string | null
          id?: string
          login_types: Database["public"]["Enums"]["login_type"][]
          name: string
          priority?: Database["public"]["Enums"]["priority_level"]
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
          feature_id?: string | null
          id?: string
          login_types?: Database["public"]["Enums"]["login_type"][]
          name?: string
          priority?: Database["public"]["Enums"]["priority_level"]
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
      get_approval_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["approval_status"]
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
      app_role: "admin" | "user"
      approval_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "user"],
      approval_status: ["pending", "approved", "rejected"],
      login_type: ["super_admin", "institute", "teacher", "student"],
      priority_level: ["critical", "high", "medium", "low"],
      run_status: ["in_progress", "completed", "aborted"],
      scenario_type: ["smoke", "intra_login", "inter_login"],
      test_frequency: ["one_time", "regression", "release"],
      test_status: ["pass", "fail", "blocked", "skipped", "pending"],
    },
  },
} as const
