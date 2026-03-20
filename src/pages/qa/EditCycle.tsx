import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCycleDetail } from "@/hooks/useCycleDetail";
import { CycleGroupEditor } from "@/components/qa/cycles/CycleGroupEditor";
import type { PriorityLevel } from "@/types/qa";
import type { CreateCycleGroupForm, CycleStatus } from "@/types/cycle";

export default function EditCycle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { cycle, groups: loadedGroups, loading } = useCycleDetail(id);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [name, setName] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("medium");
  const [status, setStatus] = useState<CycleStatus>("active");
  const [description, setDescription] = useState("");
  const [groups, setGroups] = useState<CreateCycleGroupForm[]>([]);

  // Populate form when data loads
  useEffect(() => {
    if (cycle && loadedGroups.length >= 0 && !initialized) {
      setName(cycle.name);
      setPriority(cycle.priority);
      setStatus(cycle.status);
      setDescription(cycle.description || "");
      setGroups(
        loadedGroups.map((g, gIdx) => ({
          id: g.id,
          name: g.name,
          description: g.description || "",
          order_index: g.order_index,
          scenarios: (g.scenarios || []).map((s, sIdx) => ({
            id: s.id,
            scenario_code: s.scenario_code,
            title: s.title,
            description: s.description || "",
            order_index: s.order_index,
            has_steps: s.has_steps,
            steps: Array.isArray(s.steps) ? s.steps : [],
          })),
        }))
      );
      setInitialized(true);
    }
  }, [cycle, loadedGroups, initialized]);

  const handleSave = async () => {
    if (!user || !cycle) return;
    try {
      setSaving(true);

      // Update cycle
      const { error: cycleError } = await supabase
        .from("test_cycles")
        .update({ name, description: description || null, priority, status: status as any })
        .eq("id", cycle.id);
      if (cycleError) throw cycleError;

      // Delete existing groups (cascade deletes scenarios)
      const { error: deleteError } = await supabase
        .from("cycle_groups")
        .delete()
        .eq("cycle_id", cycle.id);
      if (deleteError) throw deleteError;

      // Re-create groups + scenarios
      for (let gIdx = 0; gIdx < groups.length; gIdx++) {
        const group = groups[gIdx];
        const { data: createdGroup, error: groupError } = await supabase
          .from("cycle_groups")
          .insert({
            cycle_id: cycle.id,
            name: group.name,
            description: group.description || null,
            order_index: gIdx,
          })
          .select()
          .single();
        if (groupError) throw groupError;

        if (group.scenarios.length > 0) {
          const { error: scenarioError } = await supabase
            .from("cycle_scenarios")
            .insert(
              group.scenarios.map((s, sIdx) => ({
                group_id: createdGroup.id,
                scenario_code: s.scenario_code,
                title: s.title,
                description: s.description || null,
                order_index: sIdx,
                has_steps: s.has_steps,
                steps: s.has_steps && s.steps.length > 0 ? (s.steps as unknown as any) : null,
              }))
            );
          if (scenarioError) throw scenarioError;
        }
      }

      toast({ title: "Cycle updated", description: `${cycle.cycle_code} — ${name}` });
      navigate(`/qa/cycles/${cycle.id}`);
    } catch (error: any) {
      console.error("Error updating cycle:", error);
      toast({ title: "Error updating cycle", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !initialized) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Edit Cycle</h1>
          <p className="text-sm text-muted-foreground">{cycle?.cycle_code}</p>
        </div>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label>Cycle Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as PriorityLevel)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["critical", "high", "medium", "low"] as PriorityLevel[]).map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CycleStatus)}>
              <SelectTrigger className="mt-1.5 w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Context & Theory</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              className="mt-1.5 resize-y"
            />
          </div>
        </CardContent>
      </Card>

      {/* Groups */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Scenario Groups</Label>
        <CycleGroupEditor groups={groups} setGroups={setGroups} />
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
