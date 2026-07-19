
# QA Platform MCP Server — Claude as your QA Manager

Expose this app as an MCP server that **you (admin)** connect to Claude. Claude reads live data (cycles, verdicts, comments, bugs, timesheets), applies whatever judgment/instructions you give it in Claude, and can then act back on the platform (assign scenarios, flag verdicts for re-test, create new cycles). All quality-of-comment judgment lives in Claude — the server just exposes clean data and safe write tools.

## Approach

- Add an app-hosted MCP server via `@lovable.dev/mcp-js` (Supabase Edge Function at `/functions/v1/mcp`).
- Auth: Supabase OAuth 2.1 — only users with the `admin` role can call any tool. A guard runs in every tool handler; non-admins get an error.
- All DB access goes through the caller's Supabase JWT so existing RLS (`has_project_access`, admin bypass) still applies. No service-role key.
- Add a small `/connect` page in the app with the MCP URL and click-by-click connect steps for Claude.

## Tools exposed to Claude (v1)

**Read (monitoring / quality review):**

| Tool | Purpose |
|---|---|
| `list_projects` | All projects you can see, with ids. |
| `list_cycles` | Cycles in a project with progress: total scenarios, pass/fail/review/untested counts, last activity. |
| `get_cycle` | One cycle: groups, scenarios, and per-scenario latest verdict + comment + tester. |
| `get_scenario_verdicts` | Full verdict history for a scenario (all testers, all comments, timestamps) — Claude reads this to judge comment quality. |
| `list_pending_scenarios` | Scenarios in active cycles with no verdict yet, optionally filtered by tester. |
| `get_tester_activity` | Per-tester day-wise counts: scenarios verdicted, comments written, bugs raised, timesheet entries. Date range param. |
| `list_bugs` | Bugs with filters (status, fix_status, assignee, project, date range, login_type, feature). |
| `get_bug` | One bug: full description, comments, history, attachments-URLs, reopen_count, SLA. |
| `list_timesheets` | Timesheet entries by user + date range: bugs raised, content items, summary. |
| `list_testers` | Approved QA users in a project (id, name, role) so Claude can pick assignees. |

**Write (management actions):**

| Tool | Purpose |
|---|---|
| `flag_verdict_for_retest` | Marks a specific verdict as needing re-test with Claude's reason. Implemented via a new `retest_flags` table + reverts `feature_health_status` to `needs_retest` (reusing the existing pattern). Shows up in the tester's dashboard. |
| `assign_scenarios_to_tester` | Assigns one or more cycle scenarios to a named tester (new `scenario_assignments` table), creates in-app notifications, appears in "My Pending Scenarios". |
| `create_cycle` | Creates a full cycle: cycle row + groups + scenarios (mirrors the CYC-011..015 seeding shape) in one call. Claude passes the whole tree. |
| `add_scenarios_to_cycle` | Adds groups/scenarios to an existing cycle. |
| `post_scenario_comment` | Adds a comment to a scenario verdict thread as the admin (e.g. "Claude flagged: comment too vague, please re-test with specific inputs"). |

Every write tool records `created_by = admin user id` (from the OAuth token) so audit trails stay intact. No tool can delete data in v1.

## What Claude does with these (example loop, all logic in Claude)

1. Morning: Claude calls `get_tester_activity` for the last 3 days.
2. For each tester, calls `get_scenario_verdicts` on their recent scenarios, reads the comments, and — using your instructions in the Claude project — decides which are weak/incomplete.
3. For weak ones: calls `flag_verdict_for_retest` + `post_scenario_comment` with a specific reason.
4. Calls `list_pending_scenarios`, picks the next batch per tester priority, and calls `assign_scenarios_to_tester`.
5. When you paste a new checklist in Claude, it calls `create_cycle` with the parsed groups/scenarios — same shape we've been seeding manually.

## Files & DB changes

**New files (build phase):**
- `src/lib/mcp/index.ts` — `defineMcp` entry, OAuth issuer wired to Supabase.
- `src/lib/mcp/tools/*.ts` — one file per tool above (~15 files, each small).
- `src/lib/mcp/shared/auth.ts` — `requireAdmin(ctx)` helper (checks `has_role(user_id, 'admin')`).
- `src/lib/mcp/shared/supabase.ts` — per-request Supabase client using `ctx.getToken()`.
- `src/pages/OAuthConsent.tsx` at route `/.lovable/oauth/consent` — admin-only consent screen.
- `src/pages/Connect.tsx` at route `/connect` — MCP URL + Claude connect/refresh steps, linked from admin nav.
- `vite.config.ts` — add `mcpPlugin()`.

**Migrations:**
- `retest_flags` table: `id, verdict_id, cycle_id, scenario_id, tester_id, reason, flagged_by, resolved_at, created_at` + RLS (admin write, tester read own, project members read via `has_project_access`).
- `scenario_assignments` table: `id, cycle_id, scenario_id, assigned_to, assigned_by, note, completed_at, created_at` + RLS (admin write, assignee read own, project members read). Feeds `MyPendingScenarios` widget.
- Both tables get standard GRANTs (`authenticated`, `service_role`) per project conventions.

**Config:**
- `supabase/config.toml`: add `[functions.mcp]` with `verify_jwt = false` (mcp-js validates the OAuth token itself).
- Call `supabase--configure_oauth_server` to activate the OAuth 2.1 authorization server.

## Security posture

- Admin-only: `requireAdmin` runs first in every handler. Non-admin token → tool returns `isError: true`, "Admin role required".
- Since only you (admin) will connect for now, this matches your "Only you connects" answer. Adding per-user connections later is just relaxing the `requireAdmin` on read tools.
- All queries go through the caller's JWT → RLS enforced. No service-role client anywhere in `src/lib/mcp/`.
- Deploy the `mcp` edge function after every tool change; the manifest extractor validates the entry before deploy.

## Out of scope (v1, can add later)

- Bug triage writes (assign bug, change fix_status, comment on bug). Read-only for bugs in v1.
- Deleting cycles/scenarios/verdicts.
- Per-user (non-admin) connections.
- Automatic scheduled runs — Claude runs when you prompt it; no cron.

## Verification

- `code--exec` smoke test: call `list_cycles` and `get_tester_activity` via curl with a real admin OAuth token, confirm shapes.
- Connect Claude to the MCP URL from `/connect`, ask it "Which cycles were tested this week and which comments look weak?" — it should read verdicts and reply with a list.
- Test a write path: ask Claude to flag one specific verdict, confirm the row appears in `retest_flags` and the tester sees it.

