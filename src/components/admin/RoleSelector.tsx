import { useState, useEffect } from "react";
import { Loader2, Shield, User, Code } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppRole = "admin" | "user" | "developer";

interface RoleSelectorProps {
  userId: string;
  currentRole?: AppRole;
  onRoleChange?: (newRole: AppRole) => void;
  disabled?: boolean;
}

const ROLE_CONFIG: Record<AppRole, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "text-primary" },
  user: { label: "QA Tester", icon: User, color: "text-emerald-600" },
  developer: { label: "Developer", icon: Code, color: "text-violet-600" },
};

export function RoleSelector({ userId, currentRole, onRoleChange, disabled }: RoleSelectorProps) {
  const [role, setRole] = useState<AppRole | undefined>(currentRole);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!currentRole);

  useEffect(() => {
    if (!currentRole) {
      fetchRole();
    }
  }, [currentRole, userId]);

  const fetchRole = async () => {
    try {
      setInitialLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setRole(data?.role as AppRole || "user");
    } catch (error) {
      console.error("Error fetching role:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleRoleChange = async (newRole: AppRole) => {
    if (newRole === role) return;

    try {
      setLoading(true);

      // Check if user already has a role entry
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      setRole(newRole);
      toast.success(`Role updated to ${ROLE_CONFIG[newRole].label}`);
      onRoleChange?.(newRole);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  const currentConfig = role ? ROLE_CONFIG[role] : ROLE_CONFIG.user;
  const Icon = currentConfig.icon;

  return (
    <Select
      value={role}
      onValueChange={(value) => handleRoleChange(value as AppRole)}
      disabled={disabled || loading}
    >
      <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <SelectValue>
            <div className="flex items-center gap-1.5">
              <Icon className={`h-3.5 w-3.5 ${currentConfig.color}`} />
              <span>{currentConfig.label}</span>
            </div>
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(ROLE_CONFIG) as [AppRole, typeof ROLE_CONFIG.admin][]).map(
          ([roleKey, config]) => {
            const RoleIcon = config.icon;
            return (
              <SelectItem key={roleKey} value={roleKey}>
                <div className="flex items-center gap-2">
                  <RoleIcon className={`h-4 w-4 ${config.color}`} />
                  <span>{config.label}</span>
                </div>
              </SelectItem>
            );
          }
        )}
      </SelectContent>
    </Select>
  );
}
