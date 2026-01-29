import { useState } from "react";
import { PlayCircle, Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScenarioClaimButtonProps {
  scenarioId: string;
  currentClaimer?: {
    user_id: string;
    user_name: string;
    started_at: string;
  } | null;
  onClaim?: () => void;
  onRelease?: () => void;
}

export function ScenarioClaimButton({
  scenarioId,
  currentClaimer,
  onClaim,
  onRelease,
}: ScenarioClaimButtonProps) {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);

  const isClaimedByMe = currentClaimer?.user_id === user?.id;
  const isClaimedByOther = currentClaimer && !isClaimedByMe;

  const handleClaim = async () => {
    if (!user || !currentProject) return;

    try {
      setLoading(true);

      // First expire any stale activity
      await supabase.rpc("expire_stale_test_activity");

      // Check if scenario is already claimed
      const { data: existing } = await supabase
        .from("test_activity")
        .select("id, user_id")
        .eq("scenario_id", scenarioId)
        .eq("status", "active")
        .maybeSingle();

      if (existing && existing.user_id !== user.id) {
        toast.error("This scenario is being tested by someone else");
        return;
      }

      if (existing && existing.user_id === user.id) {
        // Update last_active_at
        await supabase
          .from("test_activity")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        // Create new claim
        const { error } = await supabase.from("test_activity").insert({
          user_id: user.id,
          scenario_id: scenarioId,
          project_id: currentProject.id,
          status: "active",
        });

        if (error) throw error;
      }

      toast.success("You're now testing this scenario");
      onClaim?.();
    } catch (error) {
      console.error("Error claiming scenario:", error);
      toast.error("Failed to claim scenario");
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("test_activity")
        .update({ status: "completed" })
        .eq("scenario_id", scenarioId)
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;

      toast.success("Testing session completed");
      onRelease?.();
    } catch (error) {
      console.error("Error releasing scenario:", error);
      toast.error("Failed to complete session");
    } finally {
      setLoading(false);
    }
  };

  if (isClaimedByOther) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
        <UserCheck className="h-4 w-4 text-amber-600" />
        <span className="text-amber-700">
          Being tested by <strong>{currentClaimer.user_name}</strong>
        </span>
      </div>
    );
  }

  if (isClaimedByMe) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleRelease}
        disabled={loading}
        className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <UserCheck className="h-4 w-4 mr-2" />
        )}
        I'm Done Testing
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClaim}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <PlayCircle className="h-4 w-4 mr-2" />
      )}
      I'm Testing This
    </Button>
  );
}
