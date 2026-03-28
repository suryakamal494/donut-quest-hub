

# Generate Bug Audit CSV + Summary

## What Will Be Delivered

Two files in `/mnt/documents/`:

1. **bug_audit_report.csv** — All 163 active bugs with audit columns:
   - `bug_code`, `title`, `login_type`, `severity`, `status`, `bug_type`, `feature`, `sub_module`
   - `is_duplicate` (yes/no)
   - `duplicate_cluster` (cluster name, e.g. "PDF Upload Failures")
   - `primary_bug` (the bug_code to keep if duplicate)
   - `recommendation` (keep / close as duplicate / merge)

2. **bug_audit_summary.csv** — Per-login-type summary with unique vs repetitive counts and cluster names

## How

- Query all 163 active bugs with feature names joined
- Apply the duplicate cluster mappings identified in the audit (19 clusters, 50 overlapping bugs)
- Tag each bug row with its cluster assignment and recommendation
- Write both CSVs to `/mnt/documents/`

## Files Generated

| File | Description |
|------|-------------|
| `/mnt/documents/bug_audit_report.csv` | Full 163-bug audit with duplicate tags |
| `/mnt/documents/bug_audit_summary.csv` | Per-login-type breakdown |

