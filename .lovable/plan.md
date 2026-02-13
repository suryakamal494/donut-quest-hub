

# 1. Password Reset & 2. Share Links for Scenarios and Bugs

---

## Feature 1: Password Reset

### The Situation
Your platform uses Lovable Cloud's built-in authentication with email auto-confirm (no email verification). This matters because the standard "forgot password" flow sends a reset link via email.

### Your Options

| Option | How It Works | Pros | Cons |
|--------|-------------|------|------|
| **A. Admin Reset (Recommended)** | Admin goes to Admin Dashboard, clicks "Reset Password" next to a user. The system sets a temporary password and the admin shares it with the user directly. | No email setup needed. Works today. Simple. | Requires admin involvement each time. |
| **B. Built-in Email Reset** | Add a "Forgot Password?" link on the login page. Uses the authentication system's built-in `resetPasswordForEmail()` which sends a magic link to the user's email. | Self-service. Industry standard. | Requires email delivery to actually work -- your current setup has auto-confirm enabled, so transactional emails should already be functional via the built-in email provider. |

**My recommendation**: Go with **Option B** (email-based reset). Since your platform already has email auto-confirm working, the built-in email sender can deliver password reset links too. It requires no third-party email service -- it works out of the box. We just need to add:
- A "Forgot Password?" link on the Login page
- A simple Reset Password page where users enter their email
- An Update Password page that handles the reset link callback

### How Option B Works (user flow)

1. User clicks "Forgot Password?" on login page
2. Enters their email on the reset page
3. Receives an email with a reset link
4. Clicks the link, lands on the "Set New Password" page
5. Enters new password, done

---

## Feature 2: Share Links for Scenarios and Bugs

### How It Works
Add a **Share button** to both the Scenario Detail page and the Bug Detail page. When clicked, it copies the direct URL to the clipboard (e.g., `https://qa.thedonutai.com/qa/scenarios/abc-123` or `https://qa.thedonutai.com/bugs/xyz-456`).

The routing already exists -- `/qa/scenarios/:id` and `/bugs/:id` are already defined routes. So the links will just work. If the recipient is logged in, they see the page directly. If not, the `ProtectedRoute` wrapper redirects them to login first.

---

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `src/pages/ForgotPassword.tsx` | Email input form that triggers password reset email |
| `src/pages/ResetPassword.tsx` | New password form (shown after clicking the email link) |

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/Login.tsx` | Add "Forgot Password?" link below the password field |
| `src/App.tsx` | Add routes for `/forgot-password` and `/reset-password` |
| `src/components/qa/scenario-detail/ScenarioDetailHeader.tsx` | Add Share button that copies scenario URL to clipboard |
| `src/pages/bugs/BugDetail.tsx` | Add Share button that copies bug URL to clipboard |

### Share Button Behavior
- Uses the `Share2` icon from lucide-react
- On click: copies `window.location.origin + /qa/scenarios/{id}` or `/bugs/{id}` to clipboard
- Shows a toast: "Link copied to clipboard"
- On mobile: uses the native `navigator.share()` API if available for a better experience (share to WhatsApp, etc.)

### Password Reset Flow
- `ForgotPassword.tsx`: Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`
- `ResetPassword.tsx`: Listens for `PASSWORD_RECOVERY` auth event, then calls `supabase.auth.updateUser({ password })`
- Both pages use the same warm branding/styling as the existing Login page

