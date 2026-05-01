
## My Understanding (in plain words)

CYC-009 already has **real tester work** attached:
- 28 scenarios across 4 groups (A. Upload Prerequisites · B. AI Parse & Manual Review · C. Validation · D. Embed Conflict)
- **16 comments**, **16 verdicts**, **2 bugs** linked to specific scenarios

The current titles/descriptions are thin one-liners and don't convey the real test intent. The uploaded `timetable-upload-qa_1.md` has the rich 3-block format (*What this is / What to try / Expected*) we want — the same treatment we just did for CYC-008.

**But CYC-009 is NOT a CYC-008-style copy job**, because:
1. The uploaded doc has **8 groups (A–H)** with **~46 scenarios**, while the cycle has **4 groups (A–D)** with **28 scenarios**. Codes like `A1, B1, C1, D1` exist in BOTH places but **mean different things** in each.
   - Example: cycle `D1` is currently *"Embed Into Empty Workspace"*, while doc `D1` is *"Teacher Not Found In Institute Must Block Embed"*.
2. So matching by `scenario_code` alone (the CYC-008 approach) would attach the wrong rich content to scenarios that already have comments and bugs — exactly the corruption you want to avoid.

**The job, restated:**
- Refresh cycle description + every scenario's title/description from the doc.
- Existing comments, verdicts, and bugs must continue to make sense under the new content (they reference `scenario_id`, which never changes — but the *meaning* of that scenario must not drift).
- That means **every scenario gets a deliberate, semantic mapping** to a passage in the doc, reviewed by you before any database write. No blind code-matching.

---

## Plan

### Phase 1 — Build & Show You The Mapping (no DB writes)

I will produce one mapping table covering all 28 scenarios. Each row will show:

| Cycle code | Current title | Existing activity | → Proposed doc source | Proposed new title |
|---|---|---|---|---|
| A1 | Batch Required Before Upload | 1 cmt, 1 verd | (no direct doc match — keep current intent, rewrite in 3-block format from existing description) | Batch Required Before Upload |
| A4 | Unsupported File Type | 1 cmt, 1 verd | doc A1+A2+A3 (consolidated rejection coverage) | Unsupported File Types Must Be Rejected At The File Picker |
| B2 | Low Confidence Cell | **1 bug**, 1 cmt, 1 verd | doc C1 (Low-Confidence Entries Must Be Visibly Flagged) | Low-Confidence Entries Must Be Visibly Flagged In The Parsed Grid |
| D1 | Embed Into Empty Workspace | **1 bug**, 1 cmt, 1 verd | doc E1 (Embedding Into An Empty Week…) | Embedding Into An Empty Week Should Insert All Entries Cleanly |
| … | … | … | … | … |

For the **two scenarios with bugs** (`B2`, `D1`) I will additionally fetch the bug title + description and explicitly call out *"the bug is about X — does the proposed new content still describe a scenario where this bug makes sense? Yes/No"* so you can sign off.

For the **16 scenarios with comments**, I will fetch each comment text and apply the same sanity check.

Where the cycle has a scenario but the doc has no clean equivalent (e.g. cycle `A1: Batch Required Before Upload` — the doc assumes a batch is already selected), I will **keep the cycle's current intent** and just rewrite the existing description in the 3-block format. I will not invent doc content for it.

Where the doc has a great scenario the cycle doesn't cover (e.g. doc E5 *Cancelling The Conflict Dialog Must Make Zero Changes* maps cleanly to cycle `D5: Cancel Embed Conflict Dialog` — that is a direct hit), I'll mark it as a direct mapping.

### Phase 2 — Your Review Gate

I'll present the full 28-row mapping table in chat. **Nothing is written until you approve it.** You can:
- Approve as-is, OR
- Reassign any row ("for B2, use doc C2 instead, not C1"), OR
- Tell me to keep a scenario's original wording and just reformat it.

### Phase 3 — Apply (after approval)

Once the mapping is locked:
1. **One** `UPDATE test_cycles` for the cycle-level description (rewritten from the doc's *Before You Begin / What "Good" Upload Means / 7 Failure Modes / Critical Bugs / Suggested Execution Order* sections).
2. **28** scoped `UPDATE cycle_scenarios SET title = …, description = …` statements, each filtered by `scenario_code` AND `group_id IN (SELECT id FROM cycle_groups WHERE cycle_id = 'e1f2a3b4-…-09')` to make absolutely sure no other cycle is touched.
3. **No structural changes**: no inserts, no deletes, no `order_index` reshuffles, no group renames. The 4 group names (A. Upload Prerequisites, B. AI Parse & Manual Review, C. Validation, D. Embed Conflict) stay as they are — they correctly describe the cycle's existing 4-section organization, even though the doc uses 8 sections internally.

### Phase 4 — Post-Write Audit

After the writes, I will run:
- A scenario count check (must still be exactly 28).
- A comment/verdict/bug count check (must still be exactly **16 / 16 / 2** — proves nothing was orphaned).
- Spot-check the two bug-bearing scenarios (`B2`, `D1`) by reading their new title/description back and confirming the linked bug still makes sense.

---

## Why This Is Safe

- All preserved data (`bug_comments`-equivalent: `cycle_scenario_comments`, `cycle_scenario_verdicts`, `bugs.cycle_scenario_id`) references `cycle_scenarios.id` — a UUID we never touch. Comments/verdicts/bugs cannot detach.
- The risk is purely **semantic drift** (a comment saying "this failed because the file picker accepted PDF" sitting under a scenario newly retitled to talk about Excel files). Phase 1 + Phase 2 exist solely to prevent that.

---

## Out of Scope

- No structural restructuring of CYC-009 to mirror the doc's 8-group layout. (That would require deletions and break bug/comment links. If you want that later, it's a separate, much bigger job.)
- No code or UI changes — `EditCycle` and `CycleDetail` already render markdown.
- Other cycles (CYC-008, CYC-010, etc.) are not touched.

---

## Deliverable On Approval

When you say "go", my next message will contain the full 28-row mapping table (Phase 1) for your review — no DB writes yet.
