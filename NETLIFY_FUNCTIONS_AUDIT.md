# Netlify Functions Audit & Timezone Guide

## Issues Fixed

### 1. Relationship Ambiguity Errors (PGRST201)
**Fixed in:**
- ✅ `send-wednesday-checkins.js` - Split query to avoid ambiguous relationships
- ✅ `send-lesson-recap.js` - Split query to avoid ambiguous relationships  
- ✅ `get-testimonials.js` - Split query to avoid ambiguous relationships

**Issue:** Using `students!inner` and `profiles!inner` caused Supabase to fail when multiple relationships exist.

**Solution:** Fetch data in separate queries and combine in JavaScript using explicit foreign keys (`profiles!students_id_fkey`).

### 2. `.single()` Error Handling
**Fixed in:**
- ✅ `calcom-webhook.js` - Changed to `.maybeSingle()` and added null checks

**Issue:** `.single()` throws error when no rows found.

**Solution:** Use `.maybeSingle()` which returns `null` instead of throwing.

### 3. Timezone Configuration

**Current Scheduled Functions:**

| Function | Current Schedule | UTC Time | PST Time | PDT Time | Status |
|----------|-----------------|----------|----------|----------|--------|
| `send-wednesday-checkins` | `0 20 * * 3` | 8pm UTC Wed | 12pm PST | 1pm PDT | ✅ Correct |
| `send-lesson-recap` | `0 2 * * 1` | 2am UTC Mon | 6pm PST Sun | 7pm PDT Sun | ✅ Updated |
| `scheduled-calendar-sync` | `*/30 * * * *` | Every 30 min | Every 30 min | Every 30 min | ✅ OK |
| `process-scheduled-notifications` | `*/10 * * * *` | Every 10 min | Every 10 min | Every 10 min | ✅ OK |

**Timezone Notes:**
- Netlify scheduled functions use **UTC time**
- PST = UTC-8, PDT = UTC-7
- All times are now configured for PST/PDT

## Functions Status

### ✅ Working Functions
- `send-wednesday-checkins.js` - Fixed relationship issue
- `send-lesson-recap.js` - Fixed relationship issue
- `get-testimonials.js` - Fixed relationship issue
- `calcom-webhook.js` - Fixed `.single()` usage
- `process-scheduled-notifications.js` - No issues found
- `scheduled-calendar-sync.js` - No issues found
- `sync-google-calendar.js` - No issues found

### ⚠️ Functions to Review
- `delete-auth-user.js` - Uses `.maybeSingle()` correctly
- `delayed-onboarding-notification.js` - No relationship queries
- `send-email.js` - No database queries
- `generate-lesson-plan.js` - Review if used
- `generate-practice-plan.js` - Review if used
- `refine-lesson-plan.js` - Review if used
- `notify-lesson-plan-ready.js` - Review if used
- `send-testimonial-email.js` - Review if used

## Testing Checklist

After deployment, test:
- [ ] Wednesday check-in emails send at 12pm PST
- [ ] Lesson recap emails send at 6pm PST Sunday
- [ ] Calendar sync runs every 30 minutes
- [ ] Scheduled notifications process every 10 minutes
- [ ] All functions handle missing data gracefully

## Timezone Conversion Reference

**PST (Pacific Standard Time) = UTC-8**
- 12pm PST = 8pm UTC (20:00)
- 6pm PST = 2am UTC next day (02:00)

**PDT (Pacific Daylight Time) = UTC-7**
- 12pm PDT = 7pm UTC (19:00)
- 6pm PDT = 1am UTC next day (01:00)

**Current Configuration:**
- Wednesday emails: `0 20 * * 3` = 12pm PST / 1pm PDT
- Sunday recap: `0 2 * * 1` = 6pm PST Sunday / 7pm PDT Sunday
