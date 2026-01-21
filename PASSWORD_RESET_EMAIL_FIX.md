# Password Reset Email Issue - Troubleshooting Guide

## Issue
Users report that password reset emails don't contain a reset link.

## Root Cause
The issue is likely in the **Supabase Dashboard email template configuration**, not in the code. The `redirectTo` parameter is correctly set in the code, but Supabase's email template must include the reset link variable.

## Code Status
✅ The code is correct:
- `ForgotPassword.jsx` properly sets `redirectTo: ${window.location.origin}/reset-password`
- Error handling has been improved

## Required Supabase Dashboard Configuration

### Step 1: Check Email Template
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Find the **Reset Password** template
4. Ensure it includes one of these variables:
   - `{{ .ConfirmationURL }}` (most common)
   - `{{ .Token }}` (if using custom template)
   - Or the appropriate variable for your Supabase version

### Step 2: Verify Redirect URL Whitelist
1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, ensure your production URL is added:
   - `https://ojocoachingacademyapp.netlify.app/reset-password`
   - Or your custom domain if applicable
3. For local development, add:
   - `http://localhost:5173/reset-password` (or your dev port)

### Step 3: Check Email Provider Settings
If using a custom SMTP provider (SendGrid, etc.):
- Ensure click tracking is not breaking the link
- Check that HTML emails are enabled
- Verify the email template includes the link variable

### Step 4: Test Email Template
1. In Supabase Dashboard, use the **Preview** feature for the Reset Password template
2. Verify the link appears in the preview
3. Send a test email to yourself

## Example Email Template

The Reset Password template should look something like this:

**HTML Version:**
```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>Or copy this URL: {{ .ConfirmationURL }}</p>
<p>This link will expire in 1 hour.</p>
```

**Plain Text Version:**
```
Reset Your Password

Click the link below to reset your password:
{{ .ConfirmationURL }}

This link will expire in 1 hour.
```

## Verification Steps

1. ✅ Code correctly sets `redirectTo` parameter
2. ⚠️ **ACTION REQUIRED**: Verify Supabase email template includes `{{ .ConfirmationURL }}`
3. ⚠️ **ACTION REQUIRED**: Add redirect URL to Supabase whitelist
4. ⚠️ **ACTION REQUIRED**: Test with a real email

## CRITICAL: Gmail Spam Warnings & Link Not Working

### Problem
Gmail is showing "This message might be dangerous" warnings and the reset link appears as plain text (not clickable). This happens because:

1. **Supabase's default email service lacks proper authentication** - No SPF/DKIM/DMARC records
2. **Poor sender reputation** - Default Supabase emails often get flagged
3. **Gmail strips links** from emails it considers dangerous

### Solution: Configure Custom SMTP (SendGrid)

Since you're already using SendGrid for other emails, configure it for Supabase authentication emails:

#### Step 1: Get SendGrid SMTP Credentials
1. Go to SendGrid Dashboard → Settings → API Keys
2. Create a new API key with "Mail Send" permissions
3. Note your SendGrid username (usually "apikey")
4. Note your SendGrid password (the API key itself)

#### Step 2: Configure SMTP in Supabase
1. Go to Supabase Dashboard → Authentication → Settings
2. Scroll to "SMTP Settings"
3. Enable "Enable Custom SMTP"
4. Fill in:
   - **Host**: `smtp.sendgrid.net`
   - **Port**: `587` (or `465` for SSL)
   - **Username**: `apikey` (or your SendGrid username)
   - **Password**: Your SendGrid API key
   - **Sender email**: `tobi@ojocoachingacademy.com` (or your verified sender)
   - **Sender name**: `Coach Tobi - OJO Coaching Academy`
5. Click "Save"

#### Step 3: Verify SendGrid Domain Authentication
1. In SendGrid Dashboard → Settings → Sender Authentication
2. Authenticate your domain `ojocoachingacademy.com`:
   - Add SPF record
   - Add DKIM records
   - Add DMARC record (optional but recommended)
3. Wait for verification (can take up to 48 hours)

#### Step 4: Update Email Template
The template is already correct, but you can improve it:

```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background: #4B2C6C; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p style="word-break: break-all; color: #666;">{{ .ConfirmationURL }}</p>
<p style="color: #999; font-size: 0.9em;">This link will expire in 1 hour.</p>
<p style="color: #999; font-size: 0.9em;">If you didn't request this, please ignore this email.</p>
```

#### Step 5: Test
1. Send a test password reset email
2. Check Gmail - it should no longer show warnings
3. The link should be clickable

### Alternative: Use SendGrid API Directly (If SMTP doesn't work)

If Supabase SMTP configuration doesn't work, you can create a custom Netlify function to send password reset emails via SendGrid API (similar to your other email functions).

## If Issue Persists

1. Check Supabase logs for email sending errors
2. Verify the email isn't going to spam
3. Check if SendGrid (if used) is modifying links
4. Test with a different email provider (not Gmail)
5. Review Supabase documentation for your version
6. **Check SendGrid activity logs** to see if emails are being sent
7. **Verify domain authentication** in SendGrid dashboard

## Code Improvements Made

- Added better error messages for redirect URL issues
- Improved error handling in `ForgotPassword.jsx`
- Added validation for redirect URL
