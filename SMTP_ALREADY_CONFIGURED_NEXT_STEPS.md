# SMTP Already Configured - Next Steps to Fix Gmail Warnings

## ✅ What's Already Done
- SMTP Host: `smtp.sendgrid.net` ✓
- Port: `587` ✓
- Username: `apikey` ✓
- Password: [SendGrid API key] ✓

## 🔍 What to Check Next

### 1. Verify Sender Email Settings (CRITICAL)
In Supabase SMTP settings, you need to also configure:
- **Sender Email**: Must be set to a verified email in SendGrid
- **Sender Name**: Optional but recommended

**To check/verify:**
1. In Supabase → Authentication → Email → SMTP Settings
2. Look for "Sender Email" field (might be in a different section)
3. Ensure it's set to: `tobi@ojocoachingacademy.com` or another verified sender
4. If not set, add it and save

### 2. Domain Authentication (MOST LIKELY ISSUE)
This is probably why Gmail is still flagging emails. Even with SMTP configured, Gmail needs SPF/DKIM/DMARC records.

**Check in SendGrid:**
1. Go to SendGrid Dashboard: https://app.sendgrid.com
2. Navigate to **Settings** → **Sender Authentication**
3. Look for "Domain Authentication" section
4. Check if `ojocoachingacademy.com` shows as "Authenticated" (green checkmark)

**If NOT authenticated:**
1. Click "Authenticate Your Domain"
2. Enter `ojocoachingacademy.com`
3. Follow the wizard - it will give you DNS records to add:
   - **SPF Record** (TXT record)
   - **DKIM Records** (3 CNAME records)
   - **DMARC Record** (TXT record - optional but recommended)
4. Add these records to your domain's DNS (wherever you manage DNS)
5. Wait 24-48 hours for verification

**To verify DNS records are live:**
- SPF: https://mxtoolbox.com/spf.aspx (enter your domain)
- DKIM: https://mxtoolbox.com/dkim.aspx (enter your domain)
- Should show "Pass" or "Valid"

### 3. Verify API Key is Correct
The password field should contain your SendGrid API key (not a regular password).

**To verify:**
1. Go to SendGrid Dashboard → Settings → API Keys
2. Check if you have an API key with "Mail Send" permissions
3. If unsure, create a new one:
   - Name: "Supabase SMTP"
   - Permissions: "Mail Send" → "Full Access"
   - Copy the key
4. Update it in Supabase SMTP settings
5. Save and test

### 4. Check SendGrid Activity
Verify emails are actually being sent through SendGrid:

1. Go to SendGrid Dashboard → Activity
2. Look for recent password reset emails
3. Check:
   - Are emails showing up? (If not, SMTP might not be working)
   - Any errors or bounces?
   - Delivery status

### 5. Test SMTP Connection
In Supabase, after verifying settings:
1. Look for a "Test Connection" or "Send Test Email" button
2. If available, send a test email
3. Check if it arrives and if Gmail still shows warnings

### 6. Check Email Template
Even with SMTP, the template needs to be correct:

1. Go to Supabase → Authentication → Email Templates
2. Click "Reset password"
3. Verify it has: `<a href="{{ .ConfirmationURL }}">Reset Password</a>`
4. The link should be in an `<a>` tag, not just plain text

## 🎯 Most Likely Fix

**Domain Authentication** is almost certainly the issue. Here's the quickest path:

1. **Go to SendGrid** → Settings → Sender Authentication
2. **Check if domain is authenticated**
3. **If not**, authenticate `ojocoachingacademy.com`
4. **Add the DNS records** SendGrid provides
5. **Wait 24-48 hours** for DNS propagation
6. **Test again** - Gmail warnings should disappear

## ⚡ Quick Test

After checking domain authentication:
1. Send a password reset email
2. Check Gmail:
   - If still showing warnings → Domain authentication not complete
   - If no warnings → Success! ✅

## 📋 Checklist

- [ ] Sender Email is set in Supabase SMTP settings
- [ ] SendGrid API key is correct (check in SendGrid dashboard)
- [ ] Domain `ojocoachingacademy.com` is authenticated in SendGrid
- [ ] SPF record added to DNS and verified (mxtoolbox.com)
- [ ] DKIM records added to DNS and verified
- [ ] DNS records have propagated (24-48 hours)
- [ ] SendGrid Activity shows emails being sent
- [ ] Test email sent and checked in Gmail

## 🚨 If Still Not Working

1. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs
   - Filter for "auth" or "email"
   - Look for SMTP errors

2. **Try Different Port**:
   - Current: 587
   - Try: 465 (SSL)
   - Update in Supabase and test

3. **Verify SendGrid Account**:
   - Check account status
   - Verify no sending limits exceeded
   - Check billing/subscription status

4. **Contact Support**:
   - SendGrid support if domain auth issues
   - Supabase support if SMTP connection issues
