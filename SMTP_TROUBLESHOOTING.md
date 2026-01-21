# SMTP Configuration Troubleshooting

## Current Status
✅ SMTP is configured in Supabase with:
- Host: `smtp.sendgrid.net`
- Port: `587`
- Username: `apikey`
- Password: [SendGrid API key - masked]

## Still Getting Gmail Spam Warnings?

If emails are still being flagged, check these:

### 1. Verify SendGrid API Key is Correct
- The password field should contain your **SendGrid API key** (not a regular password)
- Go to SendGrid Dashboard → Settings → API Keys
- Verify the API key has "Mail Send" permissions
- If unsure, create a new API key and update it in Supabase

### 2. Check Sender Email Verification
In Supabase SMTP settings, you need to also set:
- **Sender Email**: Should be `tobi@ojocoachingacademy.com` or a verified sender in SendGrid
- **Sender Name**: `Coach Tobi - OJO Coaching Academy`

**To verify in SendGrid:**
1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Check if `tobi@ojocoachingacademy.com` is verified
3. If not, verify it or use a verified sender email

### 3. Domain Authentication (CRITICAL)
This is likely the main issue. Gmail requires SPF/DKIM/DMARC records:

**Check in SendGrid:**
1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Look for "Domain Authentication" section
3. Check if `ojocoachingacademy.com` is authenticated
4. If not, click "Authenticate Your Domain" and follow the wizard

**What to add to DNS:**
- **SPF Record**: `v=spf1 include:sendgrid.net ~all`
- **DKIM Records**: 3 CNAME records (SendGrid will provide these)
- **DMARC Record**: `v=DMARC1; p=none; rua=mailto:dmarc@ojocoachingacademy.com`

**Verify DNS records are live:**
- Use https://mxtoolbox.com/spf.aspx to check SPF
- Use https://mxtoolbox.com/dkim.aspx to check DKIM
- Wait 24-48 hours after adding DNS records for propagation

### 4. Test SMTP Connection
In Supabase, after saving SMTP settings:
1. Look for a "Test Connection" or "Send Test Email" button
2. Send a test email to yourself
3. Check if it arrives and if Gmail still shows warnings

### 5. Check SendGrid Activity
1. Go to SendGrid Dashboard → Activity
2. Look for recent emails sent
3. Check for any errors or bounces
4. Verify emails are being sent through SendGrid (not Supabase default)

### 6. Email Template Issues
Even with SMTP configured, check the email template:
1. Go to Supabase → Authentication → Email Templates → Reset password
2. Ensure the template uses `{{ .ConfirmationURL }}` correctly
3. The link should be in an `<a>` tag: `<a href="{{ .ConfirmationURL }}">Reset Password</a>`

### 7. Check Supabase Logs
1. Go to Supabase Dashboard → Logs
2. Filter for "auth" or "email"
3. Look for SMTP connection errors
4. Check if emails are being sent via SMTP or default service

## Quick Diagnostic Checklist

- [ ] SendGrid API key is correct and has Mail Send permissions
- [ ] Sender email is verified in SendGrid
- [ ] Domain `ojocoachingacademy.com` is authenticated in SendGrid
- [ ] SPF record is added to DNS and verified
- [ ] DKIM records are added to DNS and verified
- [ ] DMARC record is added (optional but recommended)
- [ ] DNS records have propagated (wait 24-48 hours)
- [ ] Test email sent successfully from Supabase
- [ ] Email arrives in inbox (not spam folder)
- [ ] No Gmail security warnings
- [ ] Reset link is clickable

## If Still Not Working

### Option 1: Verify API Key
1. Create a new SendGrid API key
2. Update it in Supabase SMTP settings
3. Test again

### Option 2: Check Sender Email
1. In Supabase SMTP settings, ensure "Sender Email" is set
2. Use an email that's verified in SendGrid
3. Common format: `noreply@ojocoachingacademy.com` or `tobi@ojocoachingacademy.com`

### Option 3: Try Different Port
- Current: Port `587` (TLS)
- Alternative: Port `465` (SSL)
- Update in Supabase and test

### Option 4: Check SendGrid Account Status
- Ensure SendGrid account is active
- Check if there are any account limitations
- Verify you haven't exceeded sending limits

## Expected Result After Fix

Once everything is configured correctly:
- ✅ Emails arrive in inbox (not spam)
- ✅ No Gmail security warnings
- ✅ Reset link is clickable and works
- ✅ Professional email appearance
- ✅ Better deliverability overall

## Need Help?

If still having issues:
1. Check SendGrid Activity logs for errors
2. Check Supabase Logs for SMTP errors
3. Verify DNS records using MXToolbox
4. Test with a different email provider (not Gmail) to isolate the issue
