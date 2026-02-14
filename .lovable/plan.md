

# Connect Playwright Runner to Your Platform

## What This Does

Right now, when you click "Automate" on a scenario, the platform prepares everything (AI instructions, test data, webhook secret) but stops there -- it returns the payload without sending it anywhere. This update will make the platform **automatically send the payload to your Railway runner**, completing the full automation loop.

## What Changes

### 1. Store the Runner URL as a secure secret
- Save `https://qa-playwright-runner-production.up.railway.app` as a backend secret called `PLAYWRIGHT_RUNNER_URL`
- This keeps the URL secure and easy to change later

### 2. Update the `prepare-automation` function
- After preparing the runner payload (line 279 in the current code), add a step that **sends the payload to your Railway runner's `/run` endpoint**
- Update the automation run status from `queued` to `running` once the runner accepts the job
- If the runner is unreachable, the function still returns success but logs the error (so you can retry manually)

## The Complete Flow After This Change

```text
You click "Automate" on a scenario
       |
       v
prepare-automation fetches test cases + generates AI instructions
       |
       v
Payload automatically sent to Railway runner  <-- NEW
       |
       v
Runner opens Chrome, executes steps, takes screenshots
       |
       v
Results sent back to automation-webhook
       |
       v
Dashboard updates, bugs auto-created for failures
```

## Impact
- **Before**: You click Automate, payload is prepared but nothing happens externally
- **After**: You click Automate, tests run automatically on your Railway server and results flow back in real-time

## Technical Details

Only two changes:
1. Add secret `PLAYWRIGHT_RUNNER_URL` = `https://qa-playwright-runner-production.up.railway.app`
2. Edit `supabase/functions/prepare-automation/index.ts` -- add ~20 lines after line 277 to POST the payload to the runner and update status to `running`

