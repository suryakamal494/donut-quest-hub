

## QA Platform - Phase 1: Authentication Foundation

### What We'll Build

**1. Single Login Page**
- Clean, professional login form with email and password
- Works for both Admin and User roles
- Form validation and error handling
- "Forgot Password" link (optional for later)

**2. User Registration Page**
- Self-registration form for new users
- Collects: Name, Email, Password
- New registrations are marked as "pending approval"
- Users cannot access the platform until admin approves

**3. Role-Based System**
- Two roles: **Admin** and **User**
- Your admin account (thedonut.ai@gmail.com) will be pre-configured
- Separate dashboards for Admin and User after login

**4. Admin Dashboard (Basic)**
- View list of pending user registrations
- Approve or reject new users
- View list of all approved users
- Simple welcome/placeholder for future analytics

**5. User Dashboard (Basic)**
- Placeholder page for users after login
- Shows "pending approval" message if not yet approved
- Once approved, shows welcome message (test cases & bug modules added later)

### Design Approach
- Clean, modern design suitable for a professional QA tool
- Responsive layout for desktop and mobile
- Light theme with subtle accents

### Database Structure
Using Lovable Cloud (Supabase):
- **profiles table**: User profiles with name and approval status
- **user_roles table**: Stores role assignments (admin/user)
- Proper Row-Level Security (RLS) policies for data protection

