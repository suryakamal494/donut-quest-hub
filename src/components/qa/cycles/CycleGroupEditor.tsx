import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { CreateCycleGroupForm, CreateCycleScenarioForm, CycleStep } from "@/types/cycle";

interface CycleGroupEditorProps {
  groups: CreateCycleGroupForm[];
  setGroups: (groups: CreateCycleGroupForm[]) => void;
}

// Group letter labels: A, B, C, ...
const groupLabel = (index: number) => String.fromCharCode(65 + index);

export function CycleGroupEditor({ groups, setGroups }: CycleGroupEditorProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

  const toggleGroup = (idx: number) => {
    setExpandedGroups(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const addGroup = () => {
    const newIndex = groups.length;
    setGroups([
      ...groups,
      {
        name: "",
        description: "",
        order_index: newIndex,
        scenarios: [{ scenario_code: `${groupLabel(newIndex)}1`, title: "", description: "", order_index: 0, has_steps: false, steps: [] }],
      },
    ]);
    setExpandedGroups(prev => ({ ...prev, [newIndex]: true }));
  };

  const removeGroup = (idx: number) => {
    const updated = groups.filter((_, i) => i !== idx).map((g, i) => ({
      ...g,
      order_index: i,
      scenarios: g.scenarios.map((s, si) => ({ ...s, scenario_code: `${groupLabel(i)}${si + 1}` })),
    }));
    setGroups(updated);
  };

  const updateGroup = (idx: number, field: keyof CreateCycleGroupForm, value: any) => {
    const updated = [...groups];
    (updated[idx] as any)[field] = value;
    setGroups(updated);
  };

  const addScenario = (groupIdx: number) => {
    const updated = [...groups];
    const scenarioIndex = updated[groupIdx].scenarios.length;
    updated[groupIdx].scenarios.push({
      scenario_code: `${groupLabel(groupIdx)}${scenarioIndex + 1}`,
      title: "",
      description: "",
      order_index: scenarioIndex,
      has_steps: false,
      steps: [],
    });
    setGroups(updated);
  };

  const removeScenario = (groupIdx: number, scenarioIdx: number) => {
    const updated = [...groups];
    updated[groupIdx].scenarios = updated[groupIdx].scenarios
      .filter((_, i) => i !== scenarioIdx)
      .map((s, i) => ({ ...s, order_index: i, scenario_code: `${groupLabel(groupIdx)}${i + 1}` }));
    setGroups(updated);
  };

  const updateScenario = (groupIdx: number, scenarioIdx: number, field: keyof CreateCycleScenarioForm, value: any) => {
    const updated = [...groups];
    (updated[groupIdx].scenarios[scenarioIdx] as any)[field] = value;
    setGroups(updated);
  };

  const addStep = (groupIdx: number, scenarioIdx: number) => {
    const updated = [...groups];
    updated[groupIdx].scenarios[scenarioIdx].steps.push({ action: "", expected_outcome: "" });
    setGroups(updated);
  };

  const updateStep = (groupIdx: number, scenarioIdx: number, stepIdx: number, field: keyof CycleStep, value: string) => {
    const updated = [...groups];
    (updated[groupIdx].scenarios[scenarioIdx].steps[stepIdx] as any)[field] = value;
    setGroups(updated);
  };

  const removeStep = (groupIdx: number, scenarioIdx: number, stepIdx: number) => {
    const updated = [...groups];
    updated[groupIdx].scenarios[scenarioIdx].steps = updated[groupIdx].scenarios[scenarioIdx].steps.filter((_, i) => i !== stepIdx);
    setGroups(updated);
  };

  return (
    <div className="space-y-4">
      {groups.map((group, gIdx) => {
        const isExpanded = expandedGroups[gIdx] !== false; // default expanded
        return (
          <Card key={gIdx} className="border-border">
            {/* Group header */}
            <div
              className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
              onClick={() => toggleGroup(gIdx)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Badge variant="outline" className="font-mono text-xs">
                Group {groupLabel(gIdx)}
              </Badge>
              <span className="flex-1 font-medium text-sm truncate">
                {group.name || "Untitled Group"}
              </span>
              <span className="text-xs text-muted-foreground">
                {group.scenarios.length} scenario{group.scenarios.length !== 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); removeGroup(gIdx); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>

            {/* Group content */}
            <div className={cn("overflow-hidden transition-all", isExpanded ? "max-h-[10000px]" : "max-h-0")}>
              <CardContent className="pt-0 px-4 pb-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Group Name *</Label>
                    <Input
                      placeholder="e.g., Batch Configuration"
                      value={group.name}
                      onChange={(e) => updateGroup(gIdx, "name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Group Description</Label>
                    <Input
                      placeholder="Brief description of this group"
                      value={group.description}
                      onChange={(e) => updateGroup(gIdx, "description", e.target.value)}
                    />
                  </div>
                </div>

                {/* Scenarios */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Scenarios</Label>
                  </div>

                  {group.scenarios.map((scenario, sIdx) => (
                    <div key={sIdx} className="border rounded-lg p-3 space-y-3 bg-muted/30">
                      <div className="flex items-start gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px] mt-1 flex-shrink-0">
                          {scenario.scenario_code}
                        </Badge>
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Scenario title *"
                            value={scenario.title}
                            onChange={(e) => updateScenario(gIdx, sIdx, "title", e.target.value)}
                          />
                          <Textarea
                            placeholder="Describe the scenario in plain language — what should the tester verify?"
                            value={scenario.description}
                            onChange={(e) => updateScenario(gIdx, sIdx, "description", e.target.value)}
                            rows={3}
                            className="resize-none"
                          />

                          {/* Optional steps toggle */}
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`steps-${gIdx}-${sIdx}`}
                              checked={scenario.has_steps}
                              onCheckedChange={(checked) => {
                                updateScenario(gIdx, sIdx, "has_steps", checked);
                                if (checked && scenario.steps.length === 0) {
                                  addStep(gIdx, sIdx);
                                }
                              }}
                            />
                            <Label htmlFor={`steps-${gIdx}-${sIdx}`} className="text-xs text-muted-foreground cursor-pointer">
                              Enable detailed steps
                            </Label>
                          </div>

                          {/* Steps (optional) */}
                          {scenario.has_steps && (
                            <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                              {scenario.steps.map((step, stIdx) => (
                                <div key={stIdx} className="flex gap-2 items-start">
                                  <span className="text-[10px] text-muted-foreground font-mono mt-2.5 w-4 flex-shrink-0">{stIdx + 1}</span>
                                  <div className="flex-1 grid gap-2 sm:grid-cols-2">
                                    <Input
                                      placeholder="Action"
                                      value={step.action}
                                      onChange={(e) => updateStep(gIdx, sIdx, stIdx, "action", e.target.value)}
                                      className="text-sm"
                                    />
                                    <Input
                                      placeholder="Expected outcome"
                                      value={step.expected_outcome}
                                      onChange={(e) => updateStep(gIdx, sIdx, stIdx, "expected_outcome", e.target.value)}
                                      className="text-sm"
                                    />
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive"
                                    onClick={() => removeStep(gIdx, sIdx, stIdx)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <Button variant="ghost" size="sm" onClick={() => addStep(gIdx, sIdx)} className="text-xs">
                                <Plus className="h-3 w-3 mr-1" /> Add Step
                              </Button>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive flex-shrink-0"
                          onClick={() => removeScenario(gIdx, sIdx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" size="sm" onClick={() => addScenario(gIdx)} className="w-full">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Scenario
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        );
      })}

      <Button variant="outline" onClick={addGroup} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-2" /> Add Group
      </Button>
    </div>
  );
}
