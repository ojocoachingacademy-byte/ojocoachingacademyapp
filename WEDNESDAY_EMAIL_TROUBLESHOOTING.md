# Wednesday Email Troubleshooting Guide

## Issue: Wednesday emails not being sent

### Current Configuration
- **Cron Schedule**: `0 12 * * 3` (12pm every Wednesday)
- **Function**: `netlify/functions/send-wednesday-checkins.js`

### Potential Issues & Solutions

#### 1. **Check Netlify Scheduled Functions Status**
- Go to Netlify Dashboard → Your Site → Functions
- Check if scheduled functions are enabled
- Verify the function is deployed and active

#### 2. **Check Function Logs**
- Go to Netlify Dashboard → Functions → `send-wednesday-checkins`
- Check the "Logs" tab for any errors
- Look for execution logs around 12pm on Wednesdays

#### 3. **Environment Variables**
Verify these are set in Netlify:
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`

#### 4. **Manual Trigger Test**
You can manually trigger the function to test:
- Go to Netlify Dashboard → Functions → `send-wednesday-checkins`
- Click "Trigger" or use the Netlify CLI:
  ```bash
  netlify functions:invoke send-wednesday-checkins
  ```

#### 5. **Check Supabase Query**
The function queries for:
- Lessons with `status = 'scheduled'`
- Lessons on the next Sunday
- Students with profiles

Verify:
- There are scheduled lessons for the upcoming Sunday
- Students have email addresses in their profiles
- The Supabase query is working correctly

#### 6. **Common Issues**

**Issue**: Function not executing
- **Solution**: Ensure scheduled functions are enabled in Netlify plan
- **Solution**: Redeploy the site to ensure function is deployed

**Issue**: Function executing but no emails sent
- **Check**: SendGrid API key is valid
- **Check**: SendGrid FROM email is verified
- **Check**: Function logs for SendGrid errors

**Issue**: Timezone mismatch
- **Note**: Netlify scheduled functions use UTC time
- **Current schedule**: `0 12 * * 3` = 12:00 UTC on Wednesday
- **If you're in PST/PDT**: 12:00 UTC = 4:00 AM PST / 5:00 AM PDT
- **If you want 12pm local time**, adjust the cron schedule

#### 7. **Fix Timezone Issue (if needed)**
If you want emails at 12pm PST (Pacific Time):
- PST is UTC-8, so 12pm PST = 8pm UTC (20:00)
- Update cron to: `0 20 * * 3` for 12pm PST
- Or for PDT (UTC-7): `0 19 * * 3` for 12pm PDT

#### 8. **Test the Function Locally**
```bash
# Install Netlify CLI if not installed
npm install -g netlify-cli

# Test the function
netlify functions:invoke send-wednesday-checkins --no-identity
```

#### 9. **Check Function Deployment**
Ensure the function file exists and is properly formatted:
- File path: `netlify/functions/send-wednesday-checkins.js`
- File exports a `handler` function
- Function is listed in `netlify.toml`

### Quick Fix: Update Cron Schedule
If the timezone is the issue, update `netlify.toml`:
```toml
[functions."send-wednesday-checkins"]
  schedule = "0 20 * * 3"  # 12pm PST (8pm UTC)
```

### Next Steps
1. Check Netlify function logs for errors
2. Verify environment variables are set
3. Manually trigger the function to test
4. Check if there are scheduled Sunday lessons
5. Verify SendGrid configuration
