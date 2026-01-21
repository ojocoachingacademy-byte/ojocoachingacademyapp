# SendGrid Domain Authentication Fix

## Current Status
✅ You have authentication set up, but there's an issue:
- Domain Authentication: `em1640.ojocoachingacademy.com` (subdomain) ✓
- Single Sender: `tobi@ojocoachingacademy.com` ✓
- Link Branding: `url4154.ojocoachingacademy.com` ✓

## The Problem

Gmail is likely still flagging emails because:
1. **Root domain not authenticated**: You have `em1640.ojocoachingacademy.com` authenticated, but Gmail prefers the root domain `ojocoachingacademy.com` to be authenticated
2. **Subdomain vs Root**: While subdomain authentication works, root domain authentication is more trusted by email providers

## Solution: Authenticate Root Domain

### Step 1: Authenticate Root Domain in SendGrid

1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Click "Authenticate Your Domain" (even though you already have one)
3. Enter: `ojocoachingacademy.com` (without any subdomain prefix)
4. Follow the wizard to get DNS records

### Step 2: Add DNS Records

SendGrid will provide you with DNS records to add. You'll need to add these to your domain's DNS provider (wherever you manage DNS for `ojocoachingacademy.com`):

**Typical records needed:**
1. **SPF Record** (TXT record):
   - Name: `@` or `ojocoachingacademy.com`
   - Value: `v=spf1 include:sendgrid.net ~all`

2. **DKIM Records** (3 CNAME records):
   - SendGrid will provide specific values
   - Usually something like:
     - `s1._domainkey.ojocoachingacademy.com`
     - `s2._domainkey.ojocoachingacademy.com`
     - `s3._domainkey.ojocoachingacademy.com`

3. **DMARC Record** (TXT record - optional but recommended):
   - Name: `_dmarc`
   - Value: `v=DMARC1; p=none; rua=mailto:dmarc@ojocoachingacademy.com`

### Step 3: Verify DNS Records

After adding DNS records, verify they're live:

1. **SPF Check**: https://mxtoolbox.com/spf.aspx
   - Enter: `ojocoachingacademy.com`
   - Should show "Pass"

2. **DKIM Check**: https://mxtoolbox.com/dkim.aspx
   - Enter: `ojocoachingacademy.com`
   - Should show valid DKIM records

3. **Wait for SendGrid Verification**:
   - Go back to SendGrid → Sender Authentication
   - Wait for status to change to "Verified" (can take 24-48 hours)

### Step 4: Update Supabase Sender Email

Once root domain is authenticated:

1. Go to Supabase → Authentication → Email → SMTP Settings
2. Ensure "Sender Email" is set to: `tobi@ojocoachingacademy.com`
3. Save settings

### Step 5: Test

1. Send a password reset email
2. Check Gmail:
   - Should arrive in inbox (not spam)
   - No security warnings
   - Link should be clickable

## Why This Matters

- **Root domain authentication** (`ojocoachingacademy.com`) is more trusted than subdomain (`em1640.ojocoachingacademy.com`)
- Gmail specifically looks for root domain SPF/DKIM records
- Root domain authentication covers all emails from your domain, not just the subdomain

## Alternative: Use Single Sender (Quick Fix)

If you can't authenticate the root domain right away, you can use Single Sender Verification which you already have:

1. In Supabase SMTP settings, ensure "Sender Email" is exactly: `tobi@ojocoachingacademy.com`
2. This should work, but root domain authentication is still recommended for best deliverability

## Verification Checklist

- [ ] Root domain `ojocoachingacademy.com` authenticated in SendGrid
- [ ] SPF record added to DNS and verified (mxtoolbox.com)
- [ ] DKIM records added to DNS and verified
- [ ] DMARC record added (optional)
- [ ] SendGrid shows "Verified" status for root domain
- [ ] Supabase SMTP "Sender Email" set to `tobi@ojocoachingacademy.com`
- [ ] Test email sent and checked in Gmail
- [ ] No Gmail security warnings
- [ ] Reset link is clickable

## Expected Timeline

- DNS record addition: 5-10 minutes
- DNS propagation: 1-24 hours
- SendGrid verification: 24-48 hours after DNS propagation
- **Total: 1-3 days for full effect**

Once root domain is authenticated, Gmail should stop flagging your emails!
