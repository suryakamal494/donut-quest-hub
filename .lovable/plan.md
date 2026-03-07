

## Reopen Count — Make It Stand Out

### The Problem
The reopen badge (`🔄 1x Reopened`) sits inline with severity/type badges in the top row, making it blend in and get lost visually. The count (1x, 4x, 5x) needs to pop.

### Proposal: Standalone Floating Counter

Remove the reopen badge from the badges row entirely. Instead, render it as a **standalone, bold numeric indicator** positioned on the right side of the card, between the status area and the age badge. This uses the existing whitespace on the right column.

**Design:**
- A circular or rounded-pill element showing just the number in large bold text: **`4x`**
- Smaller "Reopened" label underneath
- Red/orange gradient background with a subtle glow shadow
- No pulse animation (distracting) — the size and color contrast alone will draw attention
- Only shown when `reopenCount > 0`

**Visual hierarchy on the right column (top to bottom):**
1. Status badge + action icons (existing)
2. **Reopen counter** (new — large `4x` with "Reopened" subtitle)
3. Fix status badge (existing)
4. Age badge (existing)

### Changes

**`src/components/bugs/BugCard.tsx`:**
- Remove the reopen badge from lines 57-61 (the badges row)
- Add a new block in the right column (between lines 101-104), rendering:
  ```
  <div className="flex flex-col items-center bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-lg px-2 py-1 shadow-lg">
    <span className="text-lg font-black leading-none">{reopenCount}x</span>
    <span className="text-[9px] font-medium opacity-90">Reopened</span>
  </div>
  ```
- This makes the number impossible to miss — bold white text on a red-orange gradient, sitting alone in its own visual block.

Single file change: `src/components/bugs/BugCard.tsx`.

