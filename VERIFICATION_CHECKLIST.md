# Referral Integration Verification Checklist

Use this checklist to verify your referral integration is working correctly.

## ✅ Prerequisites

- [ ] SQL script (`supabase_referral_integration.sql`) has been run in Supabase SQL Editor
- [ ] Netlify function (`sync-booking-to-supabase.js`) has been created in website repo
- [ ] Website `booking.js` has been updated to call sync function
- [ ] Environment variables set in Netlify Dashboard:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `@supabase/supabase-js` installed in website repo (`npm install`)

## ✅ Supabase Verification

### Check Tables Exist

1. Go to Supabase Dashboard → Table Editor
2. Verify these tables exist:
   - [ ] `bookings`
   - [ ] `referrals`
   - [ ] `referral_redemptions`

### Check Table Structure

Run this query in Supabase SQL Editor:

```sql
-- Check bookings table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings';

-- Check referrals table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'referrals';

-- Check referral_redemptions table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'referral_redemptions';
```

Expected columns:
- **bookings**: booking_reference, customer_first_name, customer_last_name, customer_email, referral_code, price, etc.
- **referrals**: referral_code, referrer_first_name, referrer_last_name, etc.
- **referral_redemptions**: referral_code, booking_id, reward_status, etc.

### Check RLS Policies

Run this query:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('bookings', 'referrals', 'referral_redemptions');

-- Check policies exist
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('bookings', 'referrals', 'referral_redemptions');
```

## ✅ Website Verification

### Test Netlify Function

1. Go to Netlify Dashboard → Functions
2. Look for `sync-booking-to-supabase`
3. Make a test booking on your website
4. Check Function logs for:
   - [ ] Function executed successfully
   - [ ] No errors in logs
   - [ ] Returns 200 status code

### Test Booking Flow

1. Go to your website booking page
2. Fill out booking form with:
   - [ ] Test customer information
   - [ ] A referral code (e.g., `TEST2026`)
3. Complete payment (or test payment)
4. Check Supabase `bookings` table:
   - [ ] New booking appears
   - [ ] Referral code is stored correctly
   - [ ] All fields are populated

## ✅ App Verification

### Test Utility Functions

In your app, open browser console and run:

```javascript
// Import verification function
import { verifyIntegration } from './src/utils/verifyReferralIntegration'

// Run verification
verifyIntegration()
```

Expected output:
- ✅ Tables are accessible
- ✅ Utility functions work
- ✅ Combined stats work

### Manual Test

1. Open your app (logged in as coach)
2. Check if you can query referral data:

```javascript
// In browser console
import { getWebsiteReferrals, getWebsiteReferralStats } from './src/utils/referralDataSync'

// Get website referrals
const referrals = await getWebsiteReferrals()
console.log('Website referrals:', referrals)

// Get stats
const stats = await getWebsiteReferralStats()
console.log('Stats:', stats)
```

Expected:
- [ ] Functions execute without errors
- [ ] Data is returned (even if empty array)
- [ ] No permission errors

## ✅ End-to-End Test

### Complete Flow Test

1. **On Website:**
   - [ ] Generate a referral code (or use existing)
   - [ ] Make a booking with that referral code
   - [ ] Complete payment
   - [ ] Check booking confirmation

2. **In Supabase:**
   - [ ] Check `bookings` table - booking should appear within seconds
   - [ ] Check `referral_redemptions` table - redemption record should exist
   - [ ] Verify referral_code matches

3. **In App:**
   - [ ] Run `getWebsiteReferrals()` - should see the booking
   - [ ] Run `getWebsiteReferralStats()` - should include the new referral
   - [ ] Check Referral Dashboard (if integrated) - should show data

## ✅ Troubleshooting

### Issue: Tables don't exist
**Solution:** Run `supabase_referral_integration.sql` in Supabase SQL Editor

### Issue: Netlify Function returns 500 error
**Check:**
- Environment variables are set correctly
- Service role key (not anon key) is used
- Function code syntax is correct
- Supabase URL is correct

### Issue: Booking not appearing in Supabase
**Check:**
- Netlify Function logs for errors
- Booking data format matches schema
- RLS policies allow service role to insert
- Function is being called from booking.js

### Issue: App can't read data
**Check:**
- RLS policies allow authenticated users to read
- User is logged in
- Tables exist and have data
- Check browser console for errors

### Issue: Permission denied errors
**Solution:** 
- Service role key must be used in Netlify function
- RLS policies must allow service role for writes
- RLS policies must allow authenticated users for reads

## ✅ Success Criteria

Integration is working if:
- ✅ Tables exist in Supabase
- ✅ Test booking appears in Supabase after website booking
- ✅ App can query referral data without errors
- ✅ Referral codes are stored and tracked correctly
- ✅ No errors in Netlify Function logs
- ✅ No permission errors in app

## Next Steps After Verification

Once verified, you can:
1. Update Referral Dashboard to show website referral data
2. Integrate combined stats (app + website) into Financial Dashboard
3. Set up automated referral reward distribution
4. Create referral code management UI

---

**Need Help?** Check `REFERRAL_INTEGRATION_SETUP.md` for detailed setup instructions.

