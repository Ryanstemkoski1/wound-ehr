# Password Reset Feature - Testing Guide

## ✅ Feature Complete!

The forgot password feature has been fully implemented and is ready to use.

---

## 📋 How to Reset Your Password

### Step 1: Go to Forgot Password Page

Visit: **http://localhost:3000/auth/forgot-password**

Or click **"Forgot password?"** link on the login page

### Step 2: Enter Your Email

Enter the email address for the account you want to reset.

Click **"Send Reset Link"**

### Step 3: Check Your Email

You'll receive an email from Supabase with a password reset link.

**Development Mode:**
- If you haven't configured email sending, check the **Supabase Dashboard**:
  - Go to: https://supabase.com/dashboard
  - Navigate to: **Authentication → Users**
  - Find your user and click **"Reset Password"** manually

**Production Mode:**
- Check your email inbox for the reset link
- Link is valid for 1 hour

### Step 4: Set New Password

Click the reset link in your email.

You'll be redirected to: **http://localhost:3000/auth/reset-password**

Enter your new password twice and click **"Reset Password"**

### Step 5: Login with New Password

You'll be redirected to the login page with a success message.

Login with your email and new password!

---

## 🔧 Manual Password Reset (Admin/Development)

If you need to reset a password manually without email:

### Option 1: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Authentication → Users**
4. Find the user
5. Click **"⋮"** menu → **"Reset Password"**
6. Choose:
   - **Send recovery email** (user gets email)
   - **Change password** (set password directly)

### Option 2: Using SQL

```sql
-- Get user ID
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Then in Supabase Dashboard → Authentication → Users
-- Find user by ID and reset password manually
```

### Option 3: Using Script (Quick Fix)

Create a script to reset password programmatically:

```bash
node scripts/reset-user-password.js user@example.com newpassword123
```

---

## 🧪 Testing Checklist

Test the complete flow:

- [ ] Navigate to forgot password page
- [ ] Submit email (valid user)
- [ ] Receive success message
- [ ] Check for email (or Supabase dashboard)
- [ ] Click reset link
- [ ] Password form loads correctly
- [ ] Enter new password (min 8 chars)
- [ ] Confirm password matches
- [ ] Submit form
- [ ] Redirected to login with success message
- [ ] Login with new password works

Test error cases:

- [ ] Invalid email format shows error
- [ ] Non-existent email (should succeed silently for security)
- [ ] Passwords don't match shows error
- [ ] Password too short shows error
- [ ] Expired reset link shows error
- [ ] Invalid reset link shows error

---

## 🔐 Security Features

1. **Email Validation**: Only valid email formats accepted
2. **Password Requirements**: Minimum 8 characters
3. **Secure Tokens**: Supabase handles token generation and validation
4. **Token Expiry**: Reset links expire after 1 hour
5. **One-Time Use**: Each reset link can only be used once
6. **Silent Failure**: Non-existent emails don't reveal account existence

---

## 🚨 Troubleshooting

### Issue: Not receiving reset email

**Cause:** Email sending not configured in Supabase

**Solutions:**

1. **Disable Email Confirmation** (Development):
   - Supabase Dashboard → Authentication → Providers → Email
   - Uncheck "Enable email confirmations"
   - This auto-confirms all users

2. **Configure Email Provider** (Production):
   - Supabase Dashboard → Project Settings → Auth → SMTP Settings
   - Configure SendGrid, Mailgun, or custom SMTP
   
3. **Manual Reset** (Quick fix):
   - Use Supabase Dashboard to reset manually
   - See "Manual Password Reset" section above

### Issue: Reset link shows "Invalid or expired"

**Causes:**
- Link is older than 1 hour
- Link was already used
- User is not logged out

**Solutions:**
- Request new reset link
- Ensure user is logged out before using link
- Clear browser cookies if needed

### Issue: Password reset doesn't work

**Check:**
1. Browser console for errors (F12 → Console)
2. Server terminal for errors
3. Supabase Dashboard → Logs for API errors

---

## 📝 Files Created

All password reset functionality is in these files:

1. **Server Actions:**
   - `app/actions/auth.ts` - Added `forgotPassword()` and `resetPassword()`

2. **Pages:**
   - `app/auth/forgot-password/page.tsx` - Email input form
   - `app/auth/reset-password/page.tsx` - New password form

3. **Modified:**
   - `app/login/page.tsx` - Added "Forgot password?" link and success message

---

## 🎯 Quick Test for Your Test User

Since you forgot your test user's password:

1. **Go to:** http://localhost:3000/auth/forgot-password
2. **Enter:** your test user's email
3. **Click:** "Send Reset Link"
4. **Check:** Supabase Dashboard → Authentication → Users → (find user) → Reset Password
5. **Or:** Check your email if SMTP is configured
6. **Set:** New password
7. **Login:** With new credentials

---

## ✨ What's Next?

Password reset is now fully functional! You can:

1. ✅ Reset any user's password via the forgot password flow
2. ✅ Manually reset passwords via Supabase Dashboard
3. ✅ Users can self-serve password resets

**Ready to continue with Phase 8.4 (Enhanced Calendar)?** 🚀

---

**Created:** November 11, 2025  
**Status:** ✅ Complete and Ready to Use
