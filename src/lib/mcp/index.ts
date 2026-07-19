import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listProjects from "./tools/list-projects";
import listCycles from "./tools/list-cycles";
import getCycle from "./tools/get-cycle";
import getScenarioVerdicts from "./tools/get-scenario-verdicts";
import listPendingScenarios from "./tools/list-pending-scenarios";
import getTesterActivity from "./tools/get-tester-activity";
import listBugs from "./tools/list-bugs";
import getBug from "./tools/get-bug";
import listTimesheets from "./tools/list-timesheets";
import listTesters from "./tools/list-testers";
import flagVerdictForRetest from "./tools/flag-verdict-for-retest";
import assignScenarios from "./tools/assign-scenarios";
import postScenarioComment from "./tools/post-scenario-comment";
import createCycle from "./tools/create-cycle";

// Supabase project ref is inlined by Vite at build time. Kept safe for manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "qa-platform-mcp",
  title: "QA Platform MCP",
  version: "0.1.0",
  instructions: [
    "Tools for managing the QA platform: read test cycles, verdicts, comments, bugs, and timesheets;",
    "flag weak verdicts for re-test; assign scenarios to testers; create new test cycles.",
    "All tools require the admin role. Start with list_projects to get a project_id.",
    "Judge verdict comment quality using the full comment text returned by get_scenario_verdicts.",
  ].join(" "),
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listProjects,
    listCycles,
    getCycle,
    getScenarioVerdicts,
    listPendingScenarios,
    getTesterActivity,
    listBugs,
    getBug,
    listTimesheets,
    listTesters,
    flagVerdictForRetest,
    assignScenarios,
    postScenarioComment,
    createCycle,
  ],
});
