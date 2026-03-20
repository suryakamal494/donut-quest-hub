

## Understanding of Your Requests

You've asked for 3 changes:

### 1. Create Cycle Form — Simplify steps and add rich text for Context

**Current state:** 4-step wizard: Metadata → Context → Scenarios → Review. Metadata has Cycle Name + Priority. Context uses a plain `<Textarea>`.

**What you want:**
- **Remove Priority** from the form entirely
- **Merge Metadata and Context into one step** — Step 1 has Cycle Name + Description (rich text)
- **Rich text editor for Context & Theory** — supports bold, underline, headings, subheadings, images/diagrams, and proper document-like formatting
- **CycleContextPanel** (display side) must also render rich HTML properly, not just plain text

**Plan:**
- Reduce steps from 4 to 3: **"Details" → "Scenarios" → "Review"**
- Step 1 ("Details"): Cycle Name input + rich text editor for description
- Remove the Priority `<Select>` and hardcode priority to `"medium"` on save
- Replace plain `<Textarea>` with a proper rich text editor using **TipTap** (a headless rich text framework for React that supports bold, italic, underline, headings, images, lists, etc.)
- Install `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-image`, `@tiptap/extension-heading`
- Create a reusable `RichTextEditor` component with a toolbar (bold, italic, underline, H1-H3, bullet/ordered lists, image upload)
- Store content as HTML string in the `description` field
- Update `CycleContextPanel` to render HTML via `dangerouslySetInnerHTML` with proper prose styling (similar to `MarkdownRenderer`)
- Apply same changes to `EditCycle.tsx`

### 2. Sidebar Navigation — Reorder and restructure

**Current order:** Dashboard → Bug Tracker → Test Scenarios → Test Cycles → Test Runs → Failures → Automation → Coverage → Insights

**What you want:**
- **New order:** Dashboard → Bug Tracker → **Test Cycles** → **Test Scenarios** → Test Runs → Failures → ...
- **Remove dropdown sub-items from Test Cycles** (no "All Cycles" / "Create New" sub-nav)
- **Bundle "Test Scenarios", "Test Runs", and "Failures" together** under a collapsible "Test Scenarios" parent — clicking expands/collapses to show sub-items (All Scenarios, Create New, Test Runs sub-items, Failures)

**Plan — QASidebar.tsx:**
- Reorder `navItems`: Dashboard → Bug Tracker → Test Cycles (no subItems) → Test Scenarios (with collapsible sub-items including All Scenarios, Create New, All Runs, Start Run, Failures) → Automation → Coverage → Insights
- Add expand/collapse toggle (chevron) on "Test Scenarios" that shows/hides its children
- Use `Collapsible` from radix or simple state toggle

**Plan — QABottomNav.tsx:**
- Update `mainNavItems` order to match: Dashboard → Bugs → Cycles → Scenarios
- Move Test Runs and Failures into the "More" menu

### 3. Files to modify

| File | Change |
|------|--------|
| `src/pages/qa/CreateCycle.tsx` | Remove Priority, merge Metadata+Context into 1 step, use rich text editor |
| `src/pages/qa/EditCycle.tsx` | Same changes as CreateCycle |
| `src/components/qa/cycles/CycleContextPanel.tsx` | Render HTML content instead of plain text |
| `src/components/qa/layout/QASidebar.tsx` | Reorder nav, remove Cycles sub-items, bundle Scenarios+Runs+Failures with collapse |
| `src/components/qa/layout/QABottomNav.tsx` | Reorder bottom nav items |
| New: `src/components/ui/rich-text-editor.tsx` | Reusable TipTap-based rich text editor component |
| `package.json` | Add TipTap dependencies |

