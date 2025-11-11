# Email Invite Setup Guide

## Overview

The invite system now automatically sends email invitations to new users with a signup link.

## Features

- ✅ Professional HTML email template with branding
- ✅ Secure invite tokens (32-byte random)
- ✅ 7-day expiration
- ✅ Role and facility information included
- ✅ Works in development (console logging) and production (Resend)

## Development Mode (Current Setup)

**No configuration needed!** 

When you send an invite:
1. Invite is created in database
2. Email content is logged to terminal console
3. Invite link is shown in console
4. You can copy the link and test manually

Example console output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 INVITE EMAIL (Development Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: user@example.com
Subject: You've been invited to Wound EHR

[Full email text with invite link]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Production Setup (Optional)

For automatic email delivery in production, use **Resend** (recommended):

### Step 1: Create Resend Account

1. Go to https://resend.com
2. Sign up for free account (100 emails/day free)
3. Verify your domain (or use test domain)
4. Get API key from https://resend.com/api-keys

### Step 2: Add Environment Variables

Add to `.env.local` or `.env.production`:

```bash
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxx

# From email address (must match verified domain)
FROM_EMAIL=noreply@yourdomain.com

# App URL (for invite links)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Step 3: Verify Domain (Production)

In Resend dashboard:
1. Add your domain
2. Add DNS records (MX, TXT, CNAME)
3. Wait for verification (~10 minutes)
4. Use `noreply@yourdomain.com` as FROM_EMAIL

### Step 4: Test

Send an invite from Admin → Invites page. User should receive:
- Professional branded email
- Role and facility information
- Secure signup link with token
- 7-day expiration notice

## Email Template

The system sends:

**Subject:** You've been invited to Wound EHR

**Content:**
- Professional Wound EHR branding (teal gradient header)
- Personalized greeting with inviter name
- Role and facility information
- Large "Accept Invitation" button
- Backup link (for email clients that block buttons)
- Expiration notice (7 days)
- Footer with branding

## Technical Details

### Files Changed

1. **lib/email.ts** (NEW)
   - Email utility with Resend integration
   - HTML template with branding
   - Fallback to console logging in dev

2. **app/actions/admin.ts**
   - Added email sending to `inviteUser()` function
   - Fetches facility name for email
   - Continues if email fails (invite still created)

3. **Environment files**
   - `.env.example` - Added email config examples
   - `.env.local` - Added config with comments

### Security Features

- ✅ 32-byte cryptographic random tokens
- ✅ Single-use tokens (marked accepted after signup)
- ✅ 7-day expiration
- ✅ Email validation (must match invite)
- ✅ Tenant isolation
- ✅ RBAC permission checks

### Error Handling

- Email failure doesn't block invite creation
- Invite still works via copy link button
- Errors logged to console for debugging
- Graceful fallback if Resend not configured

## Alternatives to Resend

If you prefer a different email service:

1. **SendGrid** - `npm install @sendgrid/mail`
2. **Mailgun** - `npm install mailgun.js`
3. **AWS SES** - `npm install @aws-sdk/client-ses`
4. **Supabase Edge Functions** - Use Supabase's email API

Modify `lib/email.ts` to use your preferred service.

## Testing Checklist

- [ ] Send invite in dev mode
- [ ] Check terminal console for email content
- [ ] Copy invite link from console
- [ ] Open link in incognito browser
- [ ] Complete signup with invite token
- [ ] Verify user gets correct role and facility
- [ ] Verify invite marked as accepted in database

## Production Checklist

- [ ] Sign up for Resend account
- [ ] Verify domain in Resend
- [ ] Add RESEND_API_KEY to environment
- [ ] Set FROM_EMAIL to verified domain
- [ ] Set NEXT_PUBLIC_APP_URL to production URL
- [ ] Test send invite
- [ ] Check user receives email
- [ ] Verify invite link works
- [ ] Monitor Resend dashboard for delivery status

## Troubleshooting

**Email not sending in production:**
- Check RESEND_API_KEY is set correctly
- Verify FROM_EMAIL domain is verified in Resend
- Check Resend dashboard for errors
- Look at server logs for error messages

**Invite link broken:**
- Verify NEXT_PUBLIC_APP_URL is correct
- Check link format: `/signup?invite={token}`
- Ensure token is 64 characters (32 bytes hex)

**User not getting role after signup:**
- Check invite not expired (7 days)
- Verify email matches invite exactly
- Check `acceptInvite()` function logs
- Look for "Failed to accept invite" in console

## Cost

**Development:** FREE (console logging)

**Production (Resend):**
- Free tier: 100 emails/day, 3,000/month
- Pro: $20/month for 50,000 emails
- Business: $85/month for 100,000+ emails

Perfect for small-medium clinics on free tier!
