import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { startOfDay, endOfDay, subDays, differenceInDays, format, parseISO } from "date-fns";

interface DateRange {
  from: Date;
  to: Date;
}

export interface CycleHealth {
  id: string;
  name: string;
  cycle_code: string;
  status: string;
  total_scenarios: number;
  passed: number;
  failed: number;
  untested: number;
  pass_rate: number;
  bug_count: number;
  open_bug_count: number;
  days_since_activity: number | null;
  last_activity: string | null;
}

export interface PersonContribution {
  user_id: string;
  full_name: string;
  pass_count: number;
  fail_count: number;
  total_verdicts: number;
  comments_posted: number;
  bugs_reported: number;
  last_active: string | null;
}

export interface TrendPoint {
  date: string;
  label: string;
  pass: number;
  fail: number;
  cumulative_pass: number;
  cumulative_fail: number;
}

export interface CycleComparison {
  id: string;
  name: string;
  cycle_code: string;
  pass_rate: number;
  bug_density: number;
  total_verdicts: number;
  total_scenarios: number;
}

export interface OverviewKPIs {
  totalCycles: number;
  activeCycles: number;
  avgPassRate: number;
  totalVerdictsThisWeek: number;
  totalBugsFromCycles: number;
}

export interface UserActivity {
  user_id: string;
  full_name: string;
  total_actions: number;
  estimated_hours: number;
  session_count: number;
  first_action: string | null;
  last_action: string | null;
  verdict_count: number;
  comment_count: number;
  bug_count: number;
  daily_breakdown: { date: string; hours: number; actions: number }[];
}

const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes
const MIN_SESSION_MS = 5 * 60 * 1000;  // 5 minutes minimum

function clusterIntoSessions(timestamps: number[]): { count: number; totalMs: number } {
  if (timestamps.length === 0) return { count: 0, totalMs: 0 };
  const sorted = [...timestamps].sort((a, b) => a - b);
  let sessionCount = 1;
  let totalMs = 0;
  let sessionStart = sorted[0];
  let sessionEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sessionEnd > SESSION_GAP_MS) {
      totalMs += Math.max(sessionEnd - sessionStart, MIN_SESSION_MS);
      sessionStart = sorted[i];
      sessionEnd = sorted[i];
      sessionCount++;
    } else {
      sessionEnd = sorted[i];
    }
  }
  totalMs += Math.max(sessionEnd - sessionStart, MIN_SESSION_MS);
  return { count: sessionCount, totalMs };
}

export const QUICK_RANGES = [
  { label: "Last 7 days", getDates: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Last 14 days", getDates: () => ({ from: subDays(new Date(), 13), to: new Date() }) },
  { label: "Last 30 days", getDates: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "Last 90 days", getDates: () => ({ from: subDays(new Date(), 89), to: new Date() }) },
];

export function useCycleInsights() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [cycleHealth, setCycleHealth] = useState<CycleHealth[]>([]);
  const [personContributions, setPersonContributions] = useState<PersonContribution[]>([]);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [cycleComparisons, setCycleComparisons] = useState<CycleComparison[]>([]);
  const [overviewKPIs, setOverviewKPIs] = useState<OverviewKPIs>({
    totalCycles: 0, activeCycles: 0, avgPassRate: 0, totalVerdictsThisWeek: 0, totalBugsFromCycles: 0,
  });
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [selectedCycleId, setSelectedCycleId] = useState<string>("all");

  const loadData = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);

    try {
      const rangeStart = startOfDay(dateRange.from).toISOString();
      const rangeEnd = endOfDay(dateRange.to).toISOString();

      // Fetch all cycles for this project
      const { data: cycles } = await supabase
        .from("test_cycles")
        .select("id, name, cycle_code, status, created_at")
        .eq("project_id", currentProject.id)
        .order("cycle_code", { ascending: true });

      if (!cycles || cycles.length === 0) {
        setLoading(false);
        return;
      }

      const cycleIds = cycles.map(c => c.id);

      // Fetch all groups and scenarios
      const { data: groups } = await supabase
        .from("cycle_groups")
        .select("id, cycle_id")
        .in("cycle_id", cycleIds);

      const groupIds = (groups || []).map(g => g.id);
      const { data: scenarios } = groupIds.length > 0
        ? await supabase.from("cycle_scenarios").select("id, group_id").in("group_id", groupIds)
        : { data: [] };

      // Map scenario → cycle
      const groupToCycle: Record<string, string> = {};
      (groups || []).forEach(g => { groupToCycle[g.id] = g.cycle_id; });
      const scenarioToCycle: Record<string, string> = {};
      (scenarios || []).forEach(s => { scenarioToCycle[s.id] = groupToCycle[s.group_id]; });

      const scenarioIds = (scenarios || []).map(s => s.id);

      // Fetch all verdicts
      const { data: allVerdicts } = await supabase
        .from("cycle_scenario_verdicts")
        .select("id, cycle_id, scenario_id, user_id, status, comment, created_at")
        .in("cycle_id", cycleIds);

      // Fetch verdicts in date range for person-wise and trends
      const verdictsInRange = (allVerdicts || []).filter(v => v.created_at >= rangeStart && v.created_at <= rangeEnd);

      // Fetch comments in date range
      const { data: commentsInRange } = await supabase
        .from("cycle_scenario_comments")
        .select("id, cycle_id, scenario_id, user_id, created_at")
        .in("cycle_id", cycleIds)
        .gte("created_at", rangeStart)
        .lte("created_at", rangeEnd);

      // Fetch bugs from cycles
      const { data: cycleBugs } = scenarioIds.length > 0
        ? await supabase
            .from("bugs")
            .select("id, cycle_scenario_id, reported_by, status, created_at")
            .eq("project_id", currentProject.id)
            .not("cycle_scenario_id", "is", null)
        : { data: [] };

      const bugsInRange = (cycleBugs || []).filter(b => b.created_at >= rangeStart && b.created_at <= rangeEnd);

      // Fetch profiles for user names
      const userIds = [...new Set([
        ...(allVerdicts || []).map(v => v.user_id),
        ...(commentsInRange || []).map(c => c.user_id),
        ...(cycleBugs || []).map(b => b.reported_by).filter(Boolean),
      ])];
      
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
        : { data: [] };
      
      const profileMap: Record<string, string> = {};
      (profiles || []).forEach(p => { profileMap[p.user_id] = p.full_name; });

      // --- BUILD CYCLE HEALTH ---
      const scenariosPerCycle: Record<string, Set<string>> = {};
      (scenarios || []).forEach(s => {
        const cid = scenarioToCycle[s.id];
        if (!scenariosPerCycle[cid]) scenariosPerCycle[cid] = new Set();
        scenariosPerCycle[cid].add(s.id);
      });

      // Latest verdict per scenario per cycle
      const latestVerdicts: Record<string, Record<string, string>> = {};
      const sortedVerdicts = [...(allVerdicts || [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
      sortedVerdicts.forEach(v => {
        if (!latestVerdicts[v.cycle_id]) latestVerdicts[v.cycle_id] = {};
        latestVerdicts[v.cycle_id][v.scenario_id] = v.status;
      });

      // Latest activity per cycle
      const latestActivity: Record<string, string> = {};
      sortedVerdicts.forEach(v => { latestActivity[v.cycle_id] = v.created_at; });
      (commentsInRange || []).forEach(c => {
        if (!latestActivity[c.cycle_id] || c.created_at > latestActivity[c.cycle_id]) {
          latestActivity[c.cycle_id] = c.created_at;
        }
      });

      // Bugs per cycle
      const bugsPerCycle: Record<string, { total: number; open: number }> = {};
      (cycleBugs || []).forEach(b => {
        const cid = b.cycle_scenario_id ? scenarioToCycle[b.cycle_scenario_id] : null;
        if (!cid) return;
        if (!bugsPerCycle[cid]) bugsPerCycle[cid] = { total: 0, open: 0 };
        bugsPerCycle[cid].total++;
        if (b.status === "open" || b.status === "in_progress") bugsPerCycle[cid].open++;
      });

      const healthData: CycleHealth[] = cycles.map(c => {
        const totalScenarios = scenariosPerCycle[c.id]?.size || 0;
        const verdictMap = latestVerdicts[c.id] || {};
        let passed = 0, failed = 0;
        Object.values(verdictMap).forEach(s => { if (s === "pass") passed++; else if (s === "fail") failed++; });
        const untested = totalScenarios - passed - failed;
        const passRate = totalScenarios > 0 ? Math.round((passed / totalScenarios) * 100) : 0;
        const lastAct = latestActivity[c.id] || null;
        const daysSince = lastAct ? differenceInDays(new Date(), parseISO(lastAct)) : null;

        return {
          id: c.id, name: c.name, cycle_code: c.cycle_code, status: c.status,
          total_scenarios: totalScenarios, passed, failed, untested, pass_rate: passRate,
          bug_count: bugsPerCycle[c.id]?.total || 0, open_bug_count: bugsPerCycle[c.id]?.open || 0,
          days_since_activity: daysSince, last_activity: lastAct,
        };
      });
      setCycleHealth(healthData);

      // --- OVERVIEW KPIs ---
      const weekStart = startOfDay(subDays(new Date(), 6)).toISOString();
      const verdictsThisWeek = (allVerdicts || []).filter(v => v.created_at >= weekStart).length;
      const activeCyclesCount = cycles.filter(c => c.status === "active").length;
      const activeHealth = healthData.filter(h => h.status === "active");
      const avgPass = activeHealth.length > 0 ? Math.round(activeHealth.reduce((s, h) => s + h.pass_rate, 0) / activeHealth.length) : 0;

      setOverviewKPIs({
        totalCycles: cycles.length,
        activeCycles: activeCyclesCount,
        avgPassRate: avgPass,
        totalVerdictsThisWeek: verdictsThisWeek,
        totalBugsFromCycles: (cycleBugs || []).length,
      });

      // --- PERSON-WISE ---
      const filteredVerdicts = selectedCycleId === "all"
        ? verdictsInRange
        : verdictsInRange.filter(v => v.cycle_id === selectedCycleId);
      const filteredComments = selectedCycleId === "all"
        ? (commentsInRange || [])
        : (commentsInRange || []).filter(c => c.cycle_id === selectedCycleId);
      const filteredBugs = selectedCycleId === "all"
        ? bugsInRange
        : bugsInRange.filter(b => {
            const cid = b.cycle_scenario_id ? scenarioToCycle[b.cycle_scenario_id] : null;
            return cid === selectedCycleId;
          });

      const personMap: Record<string, PersonContribution> = {};
      filteredVerdicts.forEach(v => {
        if (!personMap[v.user_id]) {
          personMap[v.user_id] = {
            user_id: v.user_id,
            full_name: profileMap[v.user_id] || "Unknown",
            pass_count: 0, fail_count: 0, total_verdicts: 0,
            comments_posted: 0, bugs_reported: 0, last_active: null,
          };
        }
        const p = personMap[v.user_id];
        p.total_verdicts++;
        if (v.status === "pass") p.pass_count++;
        else p.fail_count++;
        if (!p.last_active || v.created_at > p.last_active) p.last_active = v.created_at;
      });

      filteredComments.forEach(c => {
        if (!personMap[c.user_id]) {
          personMap[c.user_id] = {
            user_id: c.user_id,
            full_name: profileMap[c.user_id] || "Unknown",
            pass_count: 0, fail_count: 0, total_verdicts: 0,
            comments_posted: 0, bugs_reported: 0, last_active: null,
          };
        }
        personMap[c.user_id].comments_posted++;
        if (!personMap[c.user_id].last_active || c.created_at > personMap[c.user_id].last_active!) {
          personMap[c.user_id].last_active = c.created_at;
        }
      });

      filteredBugs.forEach(b => {
        const uid = b.reported_by;
        if (!uid) return;
        if (!personMap[uid]) {
          personMap[uid] = {
            user_id: uid,
            full_name: profileMap[uid] || "Unknown",
            pass_count: 0, fail_count: 0, total_verdicts: 0,
            comments_posted: 0, bugs_reported: 0, last_active: null,
          };
        }
        personMap[uid].bugs_reported++;
      });

      setPersonContributions(Object.values(personMap).sort((a, b) => b.total_verdicts - a.total_verdicts));

      // --- TRENDS ---
      const days = differenceInDays(dateRange.to, dateRange.from) + 1;
      const trendPoints: TrendPoint[] = [];
      let cumPass = 0, cumFail = 0;

      for (let i = 0; i < days; i++) {
        const day = subDays(dateRange.to, days - 1 - i);
        const dayStr = format(day, "yyyy-MM-dd");
        const dayLabel = format(day, "MMM dd");
        const dayVerdicts = filteredVerdicts.filter(v => format(parseISO(v.created_at), "yyyy-MM-dd") === dayStr);
        const passCount = dayVerdicts.filter(v => v.status === "pass").length;
        const failCount = dayVerdicts.filter(v => v.status === "fail").length;
        cumPass += passCount;
        cumFail += failCount;
        trendPoints.push({ date: dayStr, label: dayLabel, pass: passCount, fail: failCount, cumulative_pass: cumPass, cumulative_fail: cumFail });
      }
      setTrendData(trendPoints);

      // --- COMPARISON ---
      const compData: CycleComparison[] = healthData
        .filter(h => h.status === "active")
        .map(h => ({
          id: h.id, name: h.name, cycle_code: h.cycle_code,
          pass_rate: h.pass_rate,
          bug_density: h.total_scenarios > 0 ? Math.round((h.bug_count / h.total_scenarios) * 100) / 100 : 0,
          total_verdicts: (allVerdicts || []).filter(v => v.cycle_id === h.id).length,
          total_scenarios: h.total_scenarios,
        }));
      setCycleComparisons(compData);

    } catch (err) {
      console.error("Failed to load cycle insights:", err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, dateRange, selectedCycleId]);

  useEffect(() => { loadData(); }, [loadData]);

  return {
    loading, cycleHealth, personContributions, trendData, cycleComparisons, overviewKPIs,
    dateRange, setDateRange, selectedCycleId, setSelectedCycleId,
    refresh: loadData,
  };
}
