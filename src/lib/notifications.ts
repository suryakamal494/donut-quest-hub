import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

export async function createNotification({
  userId,
  title,
  message,
  type = "info",
  link,
}: CreateNotificationParams): Promise<boolean> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      link,
    } as any);

    if (error) {
      console.error("Error creating notification:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error creating notification:", error);
    return false;
  }
}

// Helper functions for common notification types
export async function notifyTestRunCompleted(
  userId: string,
  runName: string,
  runId: string,
  passCount: number,
  failCount: number
): Promise<boolean> {
  const total = passCount + failCount;
  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

  return createNotification({
    userId,
    title: "Test Run Completed",
    message: `${runName} finished with ${passRate}% pass rate (${passCount}/${total} tests)`,
    type: failCount > 0 ? "warning" : "success",
    link: `/qa/runs/${runId}`,
  });
}

export async function notifyTestFailed(
  userId: string,
  testCaseTitle: string,
  runId: string
): Promise<boolean> {
  return createNotification({
    userId,
    title: "Test Failed",
    message: `Test "${testCaseTitle}" failed and needs attention`,
    type: "error",
    link: `/qa/runs/${runId}`,
  });
}

export async function notifyBugAssigned(
  userId: string,
  bugCode: string,
  bugTitle: string,
  bugId: string
): Promise<boolean> {
  return createNotification({
    userId,
    title: "Bug Assigned to You",
    message: `${bugCode}: ${bugTitle}`,
    type: "info",
    link: `/bugs/${bugId}`,
  });
}

export async function notifyFixedForVerification(
  testerId: string,
  testCaseTitle: string,
  testCaseCode: string,
  fixDescription: string,
  fixerName: string
): Promise<boolean> {
  return createNotification({
    userId: testerId,
    title: "Fix Ready for Verification",
    message: `${fixerName} fixed ${testCaseCode}: "${fixDescription.slice(0, 60)}${fixDescription.length > 60 ? '...' : ''}"`,
    type: "success",
    link: `/qa/failures`,
  });
}
