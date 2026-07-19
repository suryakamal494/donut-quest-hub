import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "get_tester_activity",
  title: "Get tester activity",
  description:
    "Per-tester day-wise activity within a date range: scenarios verdicted, bugs raised, timesheet entries. If tester_id omitted, returns activity for all testers in the project.",
  inputSchema: {
    project_id: z.string().uuid(),
    from_date: z.string().describe("ISO date, e.g. 2026-07-01"),
    to_date: z.string().describe("ISO date, inclusive"),
    tester_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id, from_date, to_date, tester_id }, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    const supabase = getSupabaseForUser(ctx);

    const fromISO = new Date(from_date).toISOString();
    const toISO = new Date(new Date(to_date).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

    // Get project cycles
    const { data: cycles } = await supabase
      .from("test_cycles")
      .select("id")
      .eq("project_id", project_id);
    const cycleIds = (cycles ?? []).map((c) => c.id);

    // Verdicts
    let vQ = supabase
      .from("cycle_scenario_verdicts")
      .select("user_id, status, comment, created_at, scenario_id, cycle_id")
      .gte("created_at", fromISO)
      .lte("created_at", toISO);
    if (cycleIds.length) vQ = vQ.in("cycle_id", cycleIds);
    if (tester_id) vQ = vQ.eq("user_id", tester_id);
    const { data: verdicts } = await vQ;

    // Bugs
    let bQ = supabase
      .from("bugs")
      .select("id, bug_code, created_by, created_at, status")
      .eq("project_id", project_id)
      .gte("created_at", fromISO)
      .lte("created_at", toISO);
    if (tester_id) bQ = bQ.eq("created_by", tester_id);
    const { data: bugs } = await bQ;

    // Timesheets
    let tQ = supabase
      .from("qa_timesheets")
      .select("user_id, work_date, bug_ids, content_items, summary")
      .eq("project_id", project_id)
      .gte("work_date", from_date)
      .lte("work_date", to_date);
    if (tester_id) tQ = tQ.eq("user_id", tester_id);
    const { data: timesheets } = await tQ;

    // Aggregate per tester per day
    type Bucket = {
      tester_id: string;
      date: string;
      verdicts_total: number;
      pass: number;
      fail: number;
      review: number;
      bugs_raised: number;
      timesheet: null | { bugs: number; content_items: number; has_summary: boolean };
    };
    const key = (u: string, d: string) => `${u}|${d}`;
    const buckets = new Map<string, Bucket>();
    const ensure = (u: string, d: string) => {
      const k = key(u, d);
      let b = buckets.get(k);
      if (!b) {
        b = {
          tester_id: u,
          date: d,
          verdicts_total: 0,
          pass: 0,
          fail: 0,
          review: 0,
          bugs_raised: 0,
          timesheet: null,
        };
        buckets.set(k, b);
      }
      return b;
    };

    (verdicts ?? []).forEach((v) => {
      const d = v.created_at.slice(0, 10);
      const b = ensure(v.user_id, d);
      b.verdicts_total += 1;
      if (v.status === "pass") b.pass += 1;
      else if (v.status === "fail") b.fail += 1;
      else if (v.status === "review") b.review += 1;
    });
    (bugs ?? []).forEach((bug) => {
      if (!bug.created_by) return;
      const d = bug.created_at.slice(0, 10);
      ensure(bug.created_by, d).bugs_raised += 1;
    });
    (timesheets ?? []).forEach((t) => {
      const b = ensure(t.user_id, t.work_date);
      const bugCount = Array.isArray(t.bug_ids) ? t.bug_ids.length : 0;
      const contentCount = Array.isArray(t.content_items) ? t.content_items.length : 0;
      b.timesheet = {
        bugs: bugCount,
        content_items: contentCount,
        has_summary: !!(t.summary && t.summary.trim()),
      };
    });

    // Resolve tester names
    const userIds = Array.from(new Set(Array.from(buckets.values()).map((b) => b.tester_id)));
    const nameById: Record<string, string> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      (profs ?? []).forEach((p) => (nameById[p.user_id] = p.full_name || p.email));
    }

    const rows = Array.from(buckets.values())
      .map((b) => ({ ...b, tester_name: nameById[b.tester_id] ?? null }))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    return jsonResult({
      range: { from: from_date, to: to_date },
      activity: rows,
    });
  },
});
