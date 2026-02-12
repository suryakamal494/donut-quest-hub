import type { ScenarioType } from "@/types/qa";

/**
 * Check if a scenario type uses the workflow execution model
 * (single test case with many steps, one Pass/Fail verdict)
 */
export function isWorkflowType(scenarioType: ScenarioType): boolean {
  return scenarioType === "intra_login" || scenarioType === "inter_login";
}
