import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  // Optional: trigger WhatsApp notification
  whatsApp?: {
    templateName: string;
    templateParams: Record<string, string>;
    projectId?: string;
    notificationType: string;
  };
}

/**
 * Sends WhatsApp notification via edge function
 * Will silently fail if WhatsApp is not configured or user hasn't opted in
 */
async function sendWhatsAppNotification(
  userId: string,
  templateName: string,
  templateParams: Record<string, string>,
  projectId?: string,
  notificationType: string = "general"
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("send-whatsapp-notification", {
      body: {
        user_id: userId,
        template_name: templateName,
        template_params: templateParams,
        project_id: projectId,
        notification_type: notificationType,
      },
    });

    if (error) {
      console.log("WhatsApp notification skipped or failed:", error.message);
    }
  } catch (error) {
    console.log("WhatsApp notification error:", error);
  }
}

export async function createNotification({
  userId,
  title,
  message,
  type = "info",
  link,
  whatsApp,
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

    // Send WhatsApp notification if configured
    if (whatsApp) {
      await sendWhatsAppNotification(
        userId,
        whatsApp.templateName,
        whatsApp.templateParams,
        whatsApp.projectId,
        whatsApp.notificationType
      );
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
  failCount: number,
  projectId?: string
): Promise<boolean> {
  const total = passCount + failCount;
  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

  return createNotification({
    userId,
    title: "Test Run Completed",
    message: `${runName} finished with ${passRate}% pass rate (${passCount}/${total} tests)`,
    type: failCount > 0 ? "warning" : "success",
    link: `/qa/runs/${runId}`,
    whatsApp: {
      templateName: "test_run_completed",
      templateParams: {
        run_name: runName,
        pass_rate: `${passRate}%`,
        passed: String(passCount),
        total: String(total),
      },
      projectId,
      notificationType: "test_run_completed",
    },
  });
}

export async function notifyTestFailed(
  userId: string,
  testCaseTitle: string,
  runId: string,
  projectId?: string
): Promise<boolean> {
  return createNotification({
    userId,
    title: "Test Failed",
    message: `Test "${testCaseTitle}" failed and needs attention`,
    type: "error",
    link: `/qa/runs/${runId}`,
    whatsApp: {
      templateName: "test_failed",
      templateParams: {
        test_name: testCaseTitle,
      },
      projectId,
      notificationType: "test_failed",
    },
  });
}

export async function notifyBugAssigned(
  userId: string,
  bugCode: string,
  bugTitle: string,
  bugId: string,
  projectId?: string
): Promise<boolean> {
  return createNotification({
    userId,
    title: "Bug Assigned to You",
    message: `${bugCode}: ${bugTitle}`,
    type: "info",
    link: `/bugs/${bugId}`,
    whatsApp: {
      templateName: "bug_assigned",
      templateParams: {
        bug_code: bugCode,
        bug_title: bugTitle,
      },
      projectId,
      notificationType: "bug_assigned",
    },
  });
}

export async function notifyFixedForVerification(
  testerId: string,
  testCaseTitle: string,
  testCaseCode: string,
  fixDescription: string,
  fixerName: string,
  projectId?: string
): Promise<boolean> {
  return createNotification({
    userId: testerId,
    title: "Fix Ready for Verification",
    message: `${fixerName} fixed ${testCaseCode}: "${fixDescription.slice(0, 60)}${fixDescription.length > 60 ? '...' : ''}"`,
    type: "success",
    link: `/qa/failures`,
    whatsApp: {
      templateName: "fix_ready",
      templateParams: {
        fixer_name: fixerName,
        test_code: testCaseCode,
        description: fixDescription.slice(0, 100),
      },
      projectId,
      notificationType: "fix_ready",
    },
  });
}

export async function notifyBugReopened(
  developerId: string,
  bugCode: string,
  bugTitle: string,
  bugId: string,
  reopenReason?: string,
  projectId?: string
): Promise<boolean> {
  return createNotification({
    userId: developerId,
    title: "Bug Reopened",
    message: `${bugCode}: ${bugTitle} - Fix failed verification`,
    type: "warning",
    link: `/bugs/${bugId}`,
    whatsApp: {
      templateName: "bug_reopened",
      templateParams: {
        bug_code: bugCode,
        bug_title: bugTitle,
        reason: reopenReason || "Fix verification failed",
      },
      projectId,
      notificationType: "bug_reopened",
    },
  });
}
