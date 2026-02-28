

## Plan: Make URLs clickable links across the platform

### Problem
URLs pasted into bug descriptions, expected/actual behavior, developer responses, and comments are rendered as plain text instead of clickable links.

### Solution
Add URL auto-linking to the `MarkdownRenderer` component and use `MarkdownRenderer` in places that currently render text with plain `<p>` tags.

### Implementation steps

1. **Update `src/components/bugs/MarkdownRenderer.tsx`**
   - After HTML escaping but before bold/italic processing, detect URLs using a regex pattern (`https?://...` and `www.…`)
   - Convert them to `<a href="..." target="_blank" rel="noopener noreferrer" class="text-emerald-600 hover:underline">...</a>` tags
   - Add Tailwind styles for link appearance: `[&_a]:text-emerald-600 [&_a]:hover:underline [&_a]:cursor-pointer`

2. **Update `src/pages/bugs/BugDetail.tsx`**
   - Replace `<p>` rendering of `developer_response` (line 382) with `<MarkdownRenderer>` so links there are also clickable

3. **Update `src/components/bugs/BugComments.tsx`**
   - Replace plain text rendering of comment body with `<MarkdownRenderer>` so comment links are clickable too

### Technical detail
- URL regex: `/(https?:\/\/[^\s<]+|www\.[^\s<]+)/g`
- The regex runs after HTML entity escaping, so `&amp;` in URLs will be handled correctly
- Links open in new tab via `target="_blank"` with `rel="noopener noreferrer"` for security
- Green color (`text-emerald-600`) to match user's request for green clickable links

