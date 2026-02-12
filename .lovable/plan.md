

# Display Reporter Name on Bug Cards and Assign Existing Bugs to Akshay

## What I Understood

1. **Show reporter name on every bug card** -- Each bug in the list should display who reported/created it (e.g., "Reported by: V. Akshay").
2. **Assign all existing bugs to Akshay** -- All bugs currently in the platform were identified by Akshay (user: "V . Akshay", email: akshay.main263@gmail.com). There are 15 bugs with no reporter (NULL `reported_by`) that were imported via SQL, plus 27 bugs attributed to other admin accounts that should all be reassigned to Akshay.
3. **Future bugs auto-capture reporter** -- This already works: when a user creates a bug via the form, their user ID is saved as `reported_by`. The missing piece is just displaying the name on the card.

## What Changes

| Area | Current State | After Change |
|---|---|---|
| Bug card (grouped view) | Shows bug code, title, severity, status, age | Adds "Reported by: Name" text below the title |
| Bug card (flat view) | Shows bug code, title, badges | Adds reporter name |
| Existing bugs in DB | 15 bugs have NULL reported_by, 27 have other admin IDs | All 42 bugs updated to Akshay's user ID |
| Data fetching | `select("*")` -- no profile join | Join with profiles table to get reporter name |

## Implementation Plan

### Step 1: Update All Existing Bugs to Akshay

Run a SQL update to set `reported_by` to Akshay's user ID (`04694c92-745b-49e8-b8b3-2d699a0928f1`) for all existing bugs in the database.

### Step 2: Fetch Reporter Name with Bug Query

Modify the `loadBugs` query in `BugList.tsx` (and `ClosedBugs.tsx`) to join the `profiles` table:
- Change `select("*")` to `select("*, reporter:profiles!bugs_reported_by_fkey(full_name)")`
- Since there's no foreign key constraint, use a manual approach: fetch profiles separately and map by `reported_by` ID

### Step 3: Display Reporter Name on Bug Cards

- In the **grouped view** (feature accordion rows): Add a small "by Name" text next to the bug code
- In the **flat view** (BugCard component): Add "Reported by: Name" below the title
- Style: subtle `text-xs text-muted-foreground` to not clutter the card

## Technical Details

### Database Update
- SQL: `UPDATE bugs SET reported_by = '04694c92-745b-49e8-b8b3-2d699a0928f1'` for all existing bugs

### Files to Modify
1. **`src/pages/bugs/BugList.tsx`** -- Fetch profiles for reporters, display name on both grouped rows and flat cards
2. **`src/pages/bugs/ClosedBugs.tsx`** -- Same reporter name display

### Data Flow
Since `bugs.reported_by` has no foreign key to `profiles`, we will:
1. Fetch bugs as before
2. Collect unique `reported_by` IDs
3. Fetch matching profiles in a second query
4. Create a lookup map and render names on cards
