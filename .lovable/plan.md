

# Screenshot-Aware AI Script Enrichment for Test Automation

## Problem
Your test cases are written in simple business language (e.g., "Go to Curriculum, click Add Curriculum, save it"). But the actual UI requires navigating submenus, finding specific buttons labeled differently, filling forms, etc. The current `prepare-automation` edge function asks GPT-4o to guess the UI structure, which fails because the AI has never seen the app.

## Solution: "Enrich Script" Feature
Add a new capability where you upload screenshots of the UI flow alongside your simple test case, and AI (using Lovable AI's Gemini Vision) analyzes both to generate a detailed, step-by-step navigation script. This enriched script then replaces the guesswork in the automation pipeline.

## How It Works

**User Flow:**
1. Open a test scenario's detail page
2. Click a new "Enrich with Screenshots" button
3. Upload 3-8 screenshots showing the UI navigation flow (e.g., dashboard -> sidebar menu -> submenu -> form)
4. AI analyzes screenshots + your simple test steps and generates a detailed script
5. The enriched script is saved to the test case and used automatically during automation runs

**Example transformation:**

Simple test case step:
> "Add a new curriculum"

AI-enriched output (after seeing screenshots):
> 1. Click "Master Data" in the left sidebar
> 2. Click "Curriculum" in the submenu that appears
> 3. Click the "+" button in the top-right corner
> 4. Fill the "Curriculum Name" field with placeholder "Enter curriculum name"
> 5. Click "Save" button

## Technical Implementation

### 1. New Storage Bucket: `scenario-screenshots`
Create a storage bucket for uploading UI flow screenshots per scenario.

### 2. Database: Add `enriched_steps` column to `test_cases` table
A JSONB column to store the AI-generated detailed script alongside the original simple steps. The automation pipeline will prefer `enriched_steps` when available.

### 3. New Edge Function: `enrich-test-script`
- Accepts: scenario_id + array of screenshot URLs
- Fetches the test cases and their simple steps
- Sends screenshots + steps to Lovable AI (Gemini Vision -- supports image analysis natively, no extra API key needed)
- Returns detailed navigation script
- Saves enriched steps back to the `test_cases` table

**Key advantage**: Uses the already-configured `LOVABLE_API_KEY` with Gemini's vision capability -- no new API keys or external tools required.

### 4. New UI Component: `ScriptEnrichmentDialog`
- Screenshot uploader (reuses existing upload pattern from `AttachmentUploader`)
- Shows the original simple steps for reference
- Displays AI-generated enriched script for review/editing before saving
- Located on the Scenario Detail page

### 5. Update `prepare-automation` Edge Function
- Check if `enriched_steps` exist on test cases
- If yes, use those instead of asking GPT-4o to guess from simple steps
- Falls back to the current GPT-4o generation if no enriched steps exist

## Files to Create
- `supabase/functions/enrich-test-script/index.ts` -- Vision AI edge function
- `src/components/qa/automation/ScriptEnrichmentDialog.tsx` -- Upload + review UI

## Files to Modify
- `src/pages/qa/ScenarioDetail.tsx` -- Add "Enrich with Screenshots" button
- `supabase/functions/prepare-automation/index.ts` -- Prefer enriched steps when available
- `src/types/automation.ts` -- Add enriched step types

## Database Migration
- Add `enriched_steps JSONB` column to `test_cases` table
- Create `scenario-screenshots` storage bucket with appropriate policies

