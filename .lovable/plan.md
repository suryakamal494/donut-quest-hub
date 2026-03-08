

# Template Management UI for WhatsApp Notifications

## What We're Building

An admin UI component that lets admins view, create, edit, and toggle WhatsApp message templates per notification type and per project. This will be added to the Admin Dashboard below the existing WhatsApp Project Settings section.

## Component: `NotificationTemplateManager`

**Location:** `src/components/admin/NotificationTemplateManager.tsx`

### Features
- Lists all templates from `notification_templates` table grouped by project
- Each row shows: notification type, WhatsApp template name, enabled/disabled toggle
- "Add Template" dialog to create new templates (select project, notification type, enter Meta template name)
- Delete button per template
- Pre-seeded notification types derived from existing code: `test_run_completed`, `test_failed`, `bug_assigned`, `fix_ready`, `bug_reopened`, `daily_digest`

### UI Layout
- Card with header "Notification Templates"
- Project filter dropdown (or "Global" for null project_id)
- Table: Notification Type | Template Name | Enabled | Actions
- Add Template button opens a Dialog with form fields:
  - Project (select from projects list, or "Global")
  - Notification Type (select from predefined list)
  - WhatsApp Template Name (text input — must match Meta-approved template)
  - Enabled toggle

### Integration
- Add the component to `AdminDashboard.tsx` between the WhatsApp Project Settings and Pending Approvals sections
- Pass `projects` prop for the project selector

### Technical Details
- Uses `supabase.from("notification_templates")` for CRUD
- RLS already configured: admins have full access, users have read access for their projects
- No database changes needed — `notification_templates` table already exists with correct schema (`id`, `project_id`, `notification_type`, `whatsapp_template_name`, `is_enabled`, `created_at`, `updated_at`)

