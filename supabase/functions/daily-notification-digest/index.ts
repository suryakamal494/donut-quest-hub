import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DigestStats {
  project_id: string;
  project_name: string;
  bugs_reported_today: number;
  bugs_fixed_today: number;
  bugs_verified_today: number;
  pending_retests: number;
  stale_bugs_count: number;
  overdue_failures: number;
}

interface UserDigest {
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  whatsapp_enabled: boolean;
  role: string;
  assigned_bugs_count: number;
  pending_fixes_count: number;
  awaiting_verification_count: number;
  project_stats: DigestStats[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const staleThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const overdueThreshold = now.toISOString();

    // Get all approved users with their roles
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select(`user_id, full_name, email, phone_number, whatsapp_enabled`)
      .eq("approval_status", "approved");

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Get user roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

    // Get all projects
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, whatsapp_notifications_enabled");

    const digests: UserDigest[] = [];

    for (const user of users || []) {
      const userRole = roleMap.get(user.user_id) || "user";
      
      const { data: userProjects } = await supabase
        .from("user_project_access")
        .select("project_id")
        .eq("user_id", user.user_id);

      const projectIds = userProjects?.map((p) => p.project_id) || [];
      const isAdmin = userRole === "admin";
      const relevantProjectIds = isAdmin 
        ? projects?.map((p) => p.id) || []
        : projectIds;

      if (relevantProjectIds.length === 0) continue;

      // Get assigned bugs count scoped to relevant projects
      const { count: assignedBugsCount } = await supabase
        .from("bugs")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", user.user_id)
        .in("status", ["open", "in_progress"])
        .in("project_id", relevantProjectIds);

      // ISSUE 5 FIX: Scope awaiting_verification_count to relevant projects
      const { count: awaitingVerificationCount } = await supabase
        .from("test_results")
        .select(`
          *,
          test_cases!inner(
            scenario_id,
            test_scenarios!inner(project_id)
          )
        `, { count: "exact", head: true })
        .eq("executed_by", user.user_id)
        .eq("status", "fail")
        .eq("fix_status", "fixed")
        .in("test_cases.test_scenarios.project_id", relevantProjectIds);

      const projectStats: DigestStats[] = [];

      for (const projectId of relevantProjectIds) {
        const project = projects?.find((p) => p.id === projectId);
        if (!project) continue;

        const { count: bugsReportedToday } = await supabase
          .from("bugs")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId)
          .gte("created_at", todayStart);

        const { count: bugsFixedToday } = await supabase
          .from("bugs")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("fix_status", "fixed")
          .gte("resolved_at", todayStart);

        const { count: bugsVerifiedToday } = await supabase
          .from("bugs")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("fix_status", "verified")
          .gte("verified_at", todayStart);

        const { count: pendingRetests } = await supabase
          .from("bugs")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("fix_status", "fixed")
          .eq("status", "resolved");

        const { count: staleBugsCount } = await supabase
          .from("bugs")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId)
          .in("status", ["open", "in_progress"])
          .lt("updated_at", staleThreshold);

        const { count: overdueFailures } = await supabase
          .from("test_results")
          .select(`
            *,
            test_cases!inner(
              scenario_id,
              test_scenarios!inner(project_id)
            )
          `, { count: "exact", head: true })
          .eq("test_cases.test_scenarios.project_id", projectId)
          .eq("status", "fail")
          .neq("fix_status", "verified")
          .lt("due_date", overdueThreshold);

        projectStats.push({
          project_id: projectId,
          project_name: project.name,
          bugs_reported_today: bugsReportedToday || 0,
          bugs_fixed_today: bugsFixedToday || 0,
          bugs_verified_today: bugsVerifiedToday || 0,
          pending_retests: pendingRetests || 0,
          stale_bugs_count: staleBugsCount || 0,
          overdue_failures: overdueFailures || 0,
        });
      }

      digests.push({
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        whatsapp_enabled: user.whatsapp_enabled,
        role: userRole,
        assigned_bugs_count: assignedBugsCount || 0,
        pending_fixes_count: 0,
        awaiting_verification_count: awaitingVerificationCount || 0,
        project_stats: projectStats,
      });
    }

    // Create in-app notifications for users with relevant updates
    const notifications = [];

    for (const digest of digests) {
      const hasUpdates = digest.project_stats.some(
        (p) =>
          p.bugs_reported_today > 0 ||
          p.pending_retests > 0 ||
          p.stale_bugs_count > 0 ||
          p.overdue_failures > 0
      );

      if (!hasUpdates && digest.assigned_bugs_count === 0 && digest.awaiting_verification_count === 0) {
        continue;
      }

      let title = "Daily Summary";
      let message = "";

      if (digest.role === "admin") {
        const totalReported = digest.project_stats.reduce((s, p) => s + p.bugs_reported_today, 0);
        const totalFixed = digest.project_stats.reduce((s, p) => s + p.bugs_fixed_today, 0);
        const totalVerified = digest.project_stats.reduce((s, p) => s + p.bugs_verified_today, 0);
        const totalStale = digest.project_stats.reduce((s, p) => s + p.stale_bugs_count, 0);
        
        message = `Today: ${totalReported} bugs reported, ${totalFixed} fixed, ${totalVerified} verified.`;
        if (totalStale > 0) {
          message += ` ⚠️ ${totalStale} stale bugs need attention.`;
        }
      } else if (digest.role === "developer") {
        message = `You have ${digest.assigned_bugs_count} bugs assigned.`;
        const pending = digest.project_stats.reduce((s, p) => s + p.pending_retests, 0);
        if (pending > 0) {
          message += ` ${pending} fixes are awaiting QA verification.`;
        }
      } else {
        if (digest.awaiting_verification_count > 0) {
          message = `${digest.awaiting_verification_count} fixes are waiting for your verification.`;
        }
        const overdue = digest.project_stats.reduce((s, p) => s + p.overdue_failures, 0);
        if (overdue > 0) {
          message += ` ⚠️ ${overdue} failures are overdue.`;
        }
      }

      if (message) {
        notifications.push({
          user_id: digest.user_id,
          title,
          message,
          type: "digest",
          link: "/qa",
        });
      }

      // Send WhatsApp notification if enabled
      if (digest.whatsapp_enabled && digest.phone_number && message) {
        // Find projects with WhatsApp enabled for this user
        const whatsappProjects = digest.project_stats.filter((p) => {
          const proj = projects?.find((pr) => pr.id === p.project_id);
          return proj?.whatsapp_notifications_enabled;
        });

        // ISSUE 3 FIX: Check notification_templates for daily_digest before sending
        for (const wp of whatsappProjects) {
          const { data: templateConfig } = await supabase
            .from("notification_templates")
            .select("whatsapp_template_name, is_enabled")
            .or(`project_id.eq.${wp.project_id},project_id.is.null`)
            .eq("notification_type", "daily_digest")
            .eq("is_enabled", true)
            .order("project_id", { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle();

          if (!templateConfig) {
            console.log(`No enabled daily_digest template for project ${wp.project_id} — skipping WhatsApp`);
            continue;
          }

          try {
            await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                user_id: digest.user_id,
                template_name: templateConfig.whatsapp_template_name,
                template_params: {
                  name: digest.full_name,
                  summary: message,
                },
                project_id: wp.project_id,
                notification_type: "daily_digest",
              }),
            });
          } catch (e) {
            console.error("Failed to send WhatsApp digest:", e);
          }
          break; // Send only one WhatsApp digest per user
        }
      }
    }

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Failed to insert notifications:", insertError);
      }
    }

    console.log(`Daily digest completed: ${notifications.length} notifications sent`);

    return new Response(
      JSON.stringify({
        success: true,
        users_processed: digests.length,
        notifications_sent: notifications.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Daily digest error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
