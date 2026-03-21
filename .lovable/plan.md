

# Add Content to Testing Guide — Curriculum Scope QA Cycle

## What We're Doing
Updating the Testing Guide (stored as HTML in the `test_cycles.description` field) for cycle `a1b2c3d4-e5f6-7890-abcd-ef1234567890` with three new content blocks.

## Insertion Points (based on current HTML structure)

### Addition 1 — Course Rule Note
**After:** The Golden Rule paragraph (`<h3>The Golden Rule</h3>` + its `<p>` block)
**Insert:** A `<blockquote>` note explaining the rule applies equally to courses, with references to related QA docs.

### Addition 2 — Class-Agnostic Course Note
**After:** The Entity Relationship Model section (which covers batch creation with curriculum/subject assignments). This is the closest match to "Batch Creation section" in the current guide — insert right after the `</code></pre>` that ends the Entity Relationship Model diagram, before the Teacher Filtering Logic heading.
**Insert:** A `<blockquote>` note explaining courses are class-agnostic during batch creation.

### Addition 3 — Related Documents Section
**Before:** The final summary section (`<h2>What "Working Correctly" Looks Like — Summary</h2>`).
**Insert:** A new `<h2>Related Documents</h2>` section with a list linking to the two QA documents.

## Implementation
Single database migration to update the `description` column with the enriched HTML content, inserting the three blocks at their respective positions.

