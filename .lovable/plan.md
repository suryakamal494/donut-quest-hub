

# Notification System Audit & WhatsApp Business API Integration Plan

## Current State Audit

### Existing Notification Triggers
| Event | Recipient | Trigger Location |
|-------|-----------|------------------|
| Test Run Completed | Run executor | `useExecuteTestRun.ts` |
| Test Failed | All admins | `useExecuteTestRun.ts` |
| Bug Assigned | Assignee | `BugDetail.tsx` |
| Bug Status Changed | Reporter + Assignee | `BugDetail.tsx` |
| Bug Fixed (needs retest) | Reporter | `BugFixActions.tsx`, `InlineFixAction.tsx` |
| Bug Verified | Developer | `BugFixActions.tsx` |
| Bug Reopened | Developer | `BugFixActions.tsx`, `PendingRetest.tsx` |
| Fix Ready for Verification | Original tester | `useFailures.ts` |
| Automation Test Failed | Run creator | `automation-webhook/index.ts` |

### Gaps Identified
1. **No digest/summary notifications** — Every event is instant; no daily rollups
2. **No pending retest reminders** — QA not notified if fix awaits verification >24h
3. **No pending assignment reminders** — Developer not reminded of unresolved bugs
4. **No mobile number field** — `profiles` table lacks phone number
5. **No WhatsApp channel** — All notifications are in-app only
6. **No project-level notification settings** — Admin can't toggle WhatsApp per project

---

## Proposed Architecture

### Phase 1: Database Schema Updates

**Add to `profiles` table:**
- `phone_number` (text, nullable) — WhatsApp-enabled number with country code
- `whatsapp_enabled` (boolean, default false) — User-level opt-in

**Add to `projects` table:**
- `whatsapp_notifications_enabled` (boolean, default false) — Project-level toggle

**New table: `notification_templates`:**
```
id, project_id, notification_type, whatsapp_template_name, is_enabled
```

### Phase 2: Enhanced Notification Types (Role-Based)

**For Developers:**
- Bug assigned to you
- Bug reopened (fix failed verification)
- Daily digest: X bugs assigned, Y pending >24h

**For QA Testers:**
- Fix ready for verification (instant)
- Daily reminder: X fixes awaiting your verification >24h
- Test run completed summary

**For Admins:**
- Daily summary: X bugs reported, Y fixed, Z verified
- Stale bugs alert (no activity >48h)
- New user registration pending approval

### Phase 3: WhatsApp Business API Integration

**Edge Function: `send-whatsapp-notification`**
- Accepts: `{ user_id, template_name, template_params }`
- Checks: user has phone, user opted-in, project has WhatsApp enabled
- Calls Meta Business API with approved template

**Edge Function: `daily-notification-digest`**
- Scheduled via pg_cron (e.g., 9:00 AM daily)
- Queries pending retests, stale bugs, unassigned issues
- Sends digest to relevant users (in-app + WhatsApp if enabled)

### Phase 4: Registration & Admin UI Updates

**Registration page:**
- Add optional phone number field (with country code picker)
- Add WhatsApp opt-in checkbox

**Admin Dashboard:**
- Toggle WhatsApp notifications per project
- View/edit user phone numbers
- Manage notification templates

**User Profile:**
- Update phone number
- Toggle personal WhatsApp preference

---

## Implementation Summary

| Task | Type |
|------|------|
| Add `phone_number`, `whatsapp_enabled` to `profiles` | Migration |
| Add `whatsapp_notifications_enabled` to `projects` | Migration |
| Create `notification_templates` table | Migration |
| Update Registration form with phone field | Frontend |
| Create `send-whatsapp-notification` edge function | Backend |
| Create `daily-notification-digest` edge function + cron | Backend |
| Add project notification settings in Admin | Frontend |
| Add user phone/WhatsApp settings in profile | Frontend |
| Extend `createNotification` to optionally trigger WhatsApp | Lib |

---

## Technical Notes

- Meta Business API requires pre-approved message templates
- Phone numbers must include country code (e.g., +91XXXXXXXXXX)
- WhatsApp integration will use an edge function that calls the Meta API
- API credentials will be stored as Supabase secrets (user provides later)
- RLS policies on new tables follow existing patterns

