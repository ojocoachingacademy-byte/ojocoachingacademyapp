# Supabase Custom SMTP Setup Guide

## Why This Is Needed

Gmail is flagging password reset emails as dangerous because:
- Supabase's default email service lacks proper SPF/DKIM/DMARC authentication
- Poor sender reputation with email providers
- Gmail strips links from unauthenticated emails

## Solution: Configure SendGrid SMTP in Supabase

### Prerequisites
- SendGrid account (you already have this)
- SendGrid API key with "Mail Send" permissions
- Domain authenticated in SendGrid (ojocoachingacademy.com)

### Step-by-Step Instructions

#### 1. Get SendGrid SMTP Credentials

1. Log into SendGrid Dashboard: https://app.sendgrid.com
2. Go to **Settings** → **API Keys**
3. Create a new API key:
   - Click "Create API Key"
   - Name it: "Supabase SMTP"
   - Permissions: Select "Mail Send" → "Full Access"
   - Click "Create & View"
   - **COPY THE API KEY** (you won't see it again!)

#### 2. Configure SMTP in Supabase

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Authentication** → **Settings** (or **Configuration** → **SMTP Settings**)
4. Scroll to "SMTP Settings" section
5. Enable "Enable Custom SMTP"
6. Fill in the following:

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: [paste your SendGrid API key here]
Sender Email: tobi@ojocoachingacademy.com
Sender Name: Coach Tobi - OJO Coaching Academy
```

7. Click "Save" or "Update Settings"

#### 3. Verify SendGrid Domain Authentication

1. In SendGrid Dashboard, go to **Settings** → **Sender Authentication**
2. Click "Authenticate Your Domain"
3. Select `ojocoachingacademy.com`
4. Follow the wizard to add DNS records:
   - **SPF Record**: Add to your DNS
   - **DKIM Records**: Add 3 CNAME records to your DNS
   - **DMARC Record**: Add TXT record (optional but recommended)
5. Wait for verification (can take 24-48 hours)

**Note**: If your domain is already authenticated in SendGrid, skip this step.

#### 4. Test the Configuration

1. In Supabase Dashboard, go to **Authentication** → **Email Templates**
2. Click on "Reset password" template
3. Click "Send test email" (if available)
4. Or trigger a password reset from your app
5. Check the email:
   - Should arrive in inbox (not spam)
   - No Gmail warnings
   - Link should be clickable

### Troubleshooting

#### Emails Still Going to Spam
- Verify domain authentication is complete in SendGrid
- Check SPF/DKIM records using: https://mxtoolbox.com/spf.aspx
- Wait 24-48 hours for DNS propagation

#### SMTP Connection Failed
- Verify API key is correct
- Check that port 587 is not blocked
- Try port 465 with SSL instead
- Verify "apikey" is the correct username

#### Links Still Not Working
- Check email template includes `{{ .ConfirmationURL }}`
- Verify redirect URLs are whitelisted in Supabase
- Check SendGrid isn't modifying links (disable click tracking temporarily)

### Alternative: Direct SendGrid API Integration

If SMTP doesn't work, you can create a custom password reset flow using SendGrid API directly (similar to your other email functions). This would require:
1. Creating a Netlify function to handle password reset
2. Generating reset tokens manually
3. Sending emails via SendGrid API
4. Handling the reset flow in your app

This is more complex but gives you full control.

### Verification Checklist

- [ ] SendGrid API key created with Mail Send permissions
- [ ] SMTP configured in Supabase with correct credentials
- [ ] Domain authenticated in SendGrid (SPF, DKIM, DMARC)
- [ ] Test email sent successfully
- [ ] Email arrives in inbox (not spam)
- [ ] No Gmail security warnings
- [ ] Reset link is clickable and works
- [ ] Redirect URL whitelisted in Supabase

### Support Resources

- Supabase SMTP Docs: https://supabase.com/docs/guides/auth/auth-smtp
- SendGrid SMTP Setup: https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp
- Email Authentication: https://sendgrid.com/resource/email-authentication-guide/
