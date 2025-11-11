# Phase 8.1 Testing Guide - Multi-Tenant RBAC

## Testing Overview

This guide walks through testing all Phase 8.1 features:
- User roles and permissions
- Invite system
- Admin pages
- Role-based access control
- Tenant isolation

---

## Prerequisites

1. **Dev server running**: `npm run dev`
2. **Database migrated**: Migrations 00001-00005 applied
3. **At least one user logged in**: You need a tenant admin account

---

## Test 1: User Roles & Permissions

### 1.1 Check Your Current Role

**Steps:**
1. Log in to the app: http://localhost:3000/login
2. Navigate to sidebar - check for "Admin" section
3. If you see "Admin" section → You have admin role ✅
4. If not → You need to be assigned a role (see "Setup Admin User" below)

**Expected Result:**
- Admin section visible in sidebar with:
  - Users
  - Facilities  
  - Invites

---

### 1.2 Setup Admin User (If Needed)

If you don't have admin access, run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Get your user ID
SELECT id, email FROM auth.users;

-- Insert tenant admin role for your user
INSERT INTO user_roles (user_id, tenant_id, role)
VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with your user ID from above
  (SELECT id FROM tenants WHERE subdomain = 'default' LIMIT 1),
  'tenant_admin'
);
```

**Verify:**
1. Refresh the app
2. Admin section should now appear in sidebar ✅

---

## Test 2: Admin Users Page

### 2.1 View Users List

**Steps:**
1. Click **Admin → Users** in sidebar
2. Should see table of users

**Expected Result:**
- Table shows:
  - User ID
  - Email (if available)
  - Role badge (Tenant Admin / Facility Admin / User)
  - Facility name (for facility_admin/user roles)
  - Action buttons (Edit Role, Remove)
- Header shows: "X user(s) in your organization"
- "Invite User" button visible ✅

**Screenshot Checkpoint:** Users list with role badges

---

### 2.2 Edit User Role

**Steps:**
1. Click **"Edit Role"** button for any user
2. Dialog opens with role dropdown
3. Select "Facility Admin" role
4. Facility dropdown appears
5. Select a facility
6. Click "Update Role"

**Expected Result:**
- Dialog closes
- User's role badge updates ✅
- Facility name shown in table
- Success message/refresh

**Edge Cases:**
- Selecting "Tenant Admin" → No facility dropdown (correct)
- Selecting "User" → Facility dropdown required (correct)

---

### 2.3 Remove User

**Steps:**
1. Click **"Remove"** button for a user
2. Confirm deletion dialog appears
3. Click "Remove"

**Expected Result:**
- User removed from list ✅
- User count decreases
- User can no longer log in (unless re-invited)

**Warning:** Don't remove yourself if you're the only tenant admin!

---

## Test 3: Invite System

### 3.1 Send Invite (Development Mode)

**Steps:**
1. Click **Admin → Invites** in sidebar
2. Click **"Invite New User"** button
3. Fill form:
   - Email: `test@example.com`
   - Role: `Facility Admin`
   - Facility: Select one
4. Click **"Send Invite"**

**Expected Result in Terminal:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 INVITE EMAIL (Development Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: test@example.com
Subject: You've been invited to Wound EHR

[Email content with invite link]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Email not sent (Resend not configured). Link: http://localhost:3000/signup?invite=...
```

**UI Result:**
- Success message appears ✅
- Invite appears in pending invites table
- Copy Link button available

---

### 3.2 Copy Invite Link

**Steps:**
1. Find invite in pending invites table
2. Click **"Copy Link"** button
3. Check clipboard

**Expected Result:**
- Link copied to clipboard ✅
- Format: `http://localhost:3000/signup?invite={64-char-token}`
- "Link copied!" message appears briefly

---

### 3.3 Accept Invite (New User Signup)

**Steps:**
1. Copy invite link from previous test
2. Open link in **incognito/private browser window**
   - Example: `http://localhost:3000/signup?invite=156a459c370fc9bd49a730d641ddba77...`
3. Should see signup page with:
   - "Accept Invitation" title
   - "You've been invited to join an organization" message
   - Email notification banner
4. Fill signup form:
   - Full Name: `Test User`
   - Email: `test@example.com` (must match invite email)
   - Password: `password123`
5. Click **"Create account"**

**Expected Result:**
- Account created ✅
- User automatically assigned:
  - Role from invite (Facility Admin)
  - Facility from invite
  - Tenant from invite
- Redirected to dashboard
- Invite marked as "accepted" in invites table

**Test Wrong Email:**
- Try signing up with different email → Should fail
- Error: "Invite email does not match user email"

---

### 3.4 Cancel Invite

**Steps:**
1. Go to **Admin → Invites**
2. Find pending invite
3. Click **"Cancel"** button
4. Confirm deletion

**Expected Result:**
- Invite removed from list ✅
- Invite link no longer works
- Count decreases

---

## Test 4: Role-Based Access Control

### 4.1 Test Tenant Admin Access

**As Tenant Admin:**
1. Can access: ✅
   - `/dashboard/admin/users`
   - `/dashboard/admin/facilities`
   - `/dashboard/admin/invites`
2. Can invite: ✅
   - Tenant Admins
   - Facility Admins
   - Users
3. Can manage: ✅
   - All facilities
   - All users in tenant

---

### 4.2 Test Facility Admin Access

**Setup:**
1. Create facility admin user via invite
2. Log in as facility admin

**As Facility Admin:**
1. Can access: ✅
   - `/dashboard/admin/invites` (limited)
   - `/dashboard/admin/facilities` ❌ (redirected)
2. Can invite: ✅
   - Users only (to their facility)
3. Cannot invite: ❌
   - Tenant Admins
   - Facility Admins
4. Can only see: ✅
   - Patients in their facility
   - Visits in their facility

**Test Redirect:**
- Try accessing `/dashboard/admin/facilities` → Should redirect to `/dashboard?error=unauthorized`

---

### 4.3 Test Regular User Access

**Setup:**
1. Create user via invite (role: User)
2. Log in as user

**As User:**
1. Cannot see: ❌
   - Admin section in sidebar
2. Redirected from: ❌
   - `/dashboard/admin/*` routes
3. Can access: ✅
   - Dashboard
   - Patients (in their facilities)
   - Visits
   - Calendar

---

## Test 5: Facilities Management

### 5.1 View Facilities (Tenant Admin Only)

**Steps:**
1. Log in as **Tenant Admin**
2. Click **Admin → Facilities**
3. Should see facilities table

**Expected Result:**
- List of all facilities in tenant ✅
- Facility details: name, address, contact
- Edit/Delete buttons

---

### 5.2 Create Facility

**Steps:**
1. Click **"Add Facility"** button
2. Fill form with facility details
3. Save

**Expected Result:**
- New facility appears in list ✅
- Automatically linked to current tenant
- Available for assignment in user invites

---

## Test 6: Tenant Isolation

### 6.1 Verify Data Isolation

**Setup:**
1. Create second tenant (SQL):
```sql
INSERT INTO tenants (name, subdomain, is_active)
VALUES ('Test Clinic 2', 'clinic2', true);
```

2. Create user in second tenant:
```sql
INSERT INTO user_roles (user_id, tenant_id, role)
VALUES (
  'ANOTHER_USER_ID',
  (SELECT id FROM tenants WHERE subdomain = 'clinic2'),
  'tenant_admin'
);
```

**Test:**
1. Log in as user from Tenant 1
2. View patients list
3. Log out
4. Log in as user from Tenant 2
5. View patients list

**Expected Result:**
- Tenant 1 user sees **only** Tenant 1 data ✅
- Tenant 2 user sees **only** Tenant 2 data ✅
- No cross-tenant data visible

---

## Test 7: Email System (Production)

### 7.1 Setup Resend (Optional)

If you want to test actual email sending:

1. Sign up at https://resend.com (free tier: 100 emails/day)
2. Get API key from dashboard
3. Add to `.env.local`:
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
```
4. Restart dev server

---

### 7.2 Send Real Email

**Steps:**
1. Send invite with your real email address
2. Check your inbox

**Expected Result:**
- Professional HTML email received ✅
- Teal gradient header with Wound EHR logo
- Role and facility information included
- "Accept Invitation" button works
- Link is valid (64-char token)

---

## Test 8: Edge Cases & Errors

### 8.1 Expired Invite

**Setup:**
1. Send invite
2. Wait 7 days (or manually update expires_at in database to past date)
3. Try to use invite link

**Expected Result:**
- Error: "Invite has expired" ❌

---

### 8.2 Already Used Invite

**Setup:**
1. Send invite
2. Accept invite (signup)
3. Try to use same invite link again

**Expected Result:**
- Error: "Invalid or expired invite" ❌

---

### 8.3 No Role Assignment

**Setup:**
1. Create user without role in database
2. Try to log in

**Expected Result:**
- Redirected to `/dashboard?error=no_role` ❌
- Error message: "No role assigned"

---

## Test 9: Performance & UX

### 9.1 Check Page Load Times

**Steps:**
1. Navigate to each admin page
2. Check Network tab in DevTools

**Expected Times:**
- `/dashboard/admin/users` - < 2s ✅
- `/dashboard/admin/facilities` - < 2s ✅
- `/dashboard/admin/invites` - < 2s ✅

---

### 9.2 Test Responsive Design

**Steps:**
1. Open admin pages
2. Resize browser window (mobile/tablet/desktop)

**Expected Result:**
- Tables stack properly on mobile ✅
- Buttons remain accessible
- No horizontal scroll

---

## Common Issues & Fixes

### Issue: "No role found" error

**Fix:**
```sql
-- Check user roles
SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID';

-- If empty, add role:
INSERT INTO user_roles (user_id, tenant_id, role)
VALUES (
  'YOUR_USER_ID',
  (SELECT id FROM tenants LIMIT 1),
  'tenant_admin'
);
```

---

### Issue: Admin section not visible

**Fix:**
1. Clear browser cache
2. Log out and log back in
3. Check user_roles table (see above)

---

### Issue: "Unauthorized" error on admin pages

**Fix:**
- Verify role in database
- Check proxy.ts is running (restart dev server)
- Ensure user has correct role for the page

---

### Issue: Invite link doesn't work

**Fix:**
- Check invite hasn't expired (expires_at)
- Check invite hasn't been accepted (accepted_at should be null)
- Verify token is complete (64 characters)
- Check email matches invite email exactly

---

## Testing Checklist

Use this checklist to verify Phase 8.1 is working:

- [ ] Can log in as admin user
- [ ] Admin section visible in sidebar
- [ ] Users page loads and shows users
- [ ] Can edit user role with facility selection
- [ ] Can remove user from tenant
- [ ] Can send invite (see in terminal)
- [ ] Can copy invite link
- [ ] Invite link works (signup flow)
- [ ] User gets correct role after accepting invite
- [ ] Can cancel pending invite
- [ ] Facilities page loads (tenant admin only)
- [ ] Facility admin cannot access facilities page
- [ ] Regular user cannot see admin section
- [ ] Tenant isolation works (users only see their tenant data)
- [ ] Role badges display correctly
- [ ] Email template looks professional (in terminal)

---

## Success Criteria

✅ **Phase 8.1 is working if:**
1. All three roles (tenant_admin, facility_admin, user) function correctly
2. Invite system sends invites and accepts them properly
3. Admin pages load and display data
4. Role-based access control blocks unauthorized access
5. Tenant isolation prevents cross-tenant data access
6. UI shows role badges and facility assignments
7. Email system works (console logs in dev, sends in production)

---

## Next Steps

After confirming Phase 8.1 works:
1. Test with multiple users and facilities
2. Optional: Set up Resend for production email
3. Optional: Re-enable RLS policies (remove 00004 migration)
4. Move to Phase 8.3 - Wound-Based Visit Assessment

---

## Need Help?

If any tests fail:
1. Check browser console for errors
2. Check terminal for server errors
3. Check Supabase logs
4. Verify database schema with: `SELECT * FROM user_roles LIMIT 5;`
5. Verify migrations applied: Check `supabase/migrations/` folder
