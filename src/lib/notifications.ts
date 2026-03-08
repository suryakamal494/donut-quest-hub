import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  whatsApp?: {
    templateName: string;
    templateParams: Record<string, string>;
    projectId?: string;
    notificationType: string;
  };
}

async function sendWhatsAppNotification(
  userId: string,
  templateName: string,
  templateParams: Record<string, string>,
  projectId?: string,
  notificationType: string = "general"
): Promise<void> {
  if (!projectId) {
    console.log("WhatsApp skipped: no projectId provided (data isolation)");
    return;
  }
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

// ── Helpers for common notification types ──

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
      templateParams: { test_name: testCaseTitle },
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
      templateParams: { bug_code: bugCode, bug_title: bugTitle },
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

export async function notifyBugFixed(
  reporterId: string,
  bugCode: string,
  bugTitle: string,
  bugId: string,
  projectId?: string
): Promise<boolean> {
  return createNotification({
    userId: reporterId,
    title: "Bug Fixed — Re-test Required",
    message: `${bugCode}: "${bugTitle}" has been marked as fixed. Please re-test and verify.`,
    type: "success",
    link: `/bugs/${bugId}`,
    whatsApp: {
      templateName: "bug_fixed",
      templateParams: { bug_code: bugCode, bug_title: bugTitle },
      projectId,
      notificationType: "bug_fixed",
    },
  });
}

export async function notifyBugVerified(
  developerId: string,
  bugCode: string,
  bugTitle: string,
  bugId: string,
  projectId?: string
): Promise<boolean> {
  return createNotification({
    userId: developerId,
    title: "Bug Verified",
    message: `${bugCode}: "${bugTitle}" has been verified and closed.`,
    type: "success",
    link: `/bugs/${bugId}`,
    whatsApp: {
      templateName: "bug_verified",
      templateParams: { bug_code: bugCode, bug_title: bugTitle },
      projectId,
      notificationType: "bug_verified",
    },
  });
}

export async function notifyBugStatusChanged(
  userId: string,
  bugCode: string,
  bugTitle: string,
  bugId: string,
  newStatus: string,
  projectId?: string
): Promise<boolean> {
  return createNotification({
    userId,
    title: "Bug Status Updated",
    message: `${bugCode}: "${bugTitle}" status changed to ${newStatus.replace("_", " ")}`,
    type: newStatus === "resolved" ? "success" : "info",
    link: `/bugs/${bugId}`,
    whatsApp: {
      templateName: "bug_status_changed",
      templateParams: {
        bug_code: bugCode,
        bug_title: bugTitle,
        new_status: newStatus.replace("_", " "),
      },
      projectId,
      notificationType: "bug_status_changed",
    },
  });
}
