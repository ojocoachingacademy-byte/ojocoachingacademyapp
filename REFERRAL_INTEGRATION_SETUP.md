# Referral System Integration: Website ↔ App Setup Guide

This guide explains how to connect your website's referral system (Netlify) with your app (Supabase) so they share the same database and stay in sync.

## Overview

**Goal:** Sync referral data from your website bookings to Supabase so your app can access and display it.

**Architecture:**
```
Website Booking → Netlify Function → Supabase Database
                                           ↓
                                    App reads from Supabase
```

## Step 1: Set Up Supabase Tables

1. Open your Supabase Dashboard → SQL Editor
2. Run the SQL script from `supabase_referral_integration.sql`
3. This creates:
   - `referrals` table (stores referral codes)
   - `bookings` table (stores all website bookings with referral codes)
   - `referral_redemptions` table (tracks referral code usage)

## Step 2: Set Up Netlify Function (Website Repository)

### 2.1 Install Dependencies

In your website repository (`ojocoachingacademy`), add to `package.json`:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

Then run: `npm install`

### 2.2 Create Netlify Function

Create file: `netlify/functions/sync-booking-to-supabase.js`

```javascript
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Validate environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Supabase configuration missing' })
      };
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Parse request body
    const bookingData = JSON.parse(event.body);

    // Insert booking into Supabase
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([
        {
          booking_reference: bookingData.bookingReference,
          customer_first_name: bookingData.firstName,
          customer_last_name: bookingData.lastName,
          customer_email: bookingData.email,
          customer_phone: bookingData.phone || null,
          package_name: bookingData.package,
          package_type: bookingData.packageType,
          price: parseFloat(bookingData.price),
          referral_code: bookingData.referralCode || null,
          payment_intent_id: bookingData.paymentIntentId || null,
          experience_level: bookingData.experience || null,
          goals: bookingData.goals || null
        }
      ])
      .select()
      .single();

    if (bookingError) {
      console.error('Error inserting booking:', bookingError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to sync booking', details: bookingError.message })
      };
    }

    // If referral code exists, create referral redemption record
    if (bookingData.referralCode) {
      const { error: redemptionError } = await supabase
        .from('referral_redemptions')
        .insert([
          {
            referral_code: bookingData.referralCode,
            booking_id: booking.id,
            reward_status: 'pending'
          }
        ]);

      if (redemptionError) {
        console.error('Error creating referral redemption:', redemptionError);
        // Don't fail the whole request, just log the error
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, bookingId: booking.id })
    };

  } catch (error) {
    console.error('Error syncing booking to Supabase:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
```

### 2.3 Update Booking Flow

In your website's `booking.js` file, add this after payment succeeds:

```javascript
// After payment succeeds (in processPayment function)
if (paymentIntent.status === 'succeeded') {
  // ... existing code for Netlify Forms, SendGrid, etc. ...
  
  // Sync to Supabase (non-blocking)
  fetch('/.netlify/functions/sync-booking-to-supabase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bookingReference: bookingRef,
      firstName: customerInfo.firstName, // or formData.get('first-name')
      lastName: customerInfo.lastName,   // or formData.get('last-name')
      email: customerInfo.email,
      phone: customerInfo.phone || '',
      package: customerInfo.package,
      packageType: packageType,
      price: amount.toString(),
      referralCode: customerInfo.referralCode || '', // from URL param or form
      paymentIntentId: paymentIntent.id,
      experience: formData.get('experience') || '',
      goals: formData.get('goals') || ''
    })
  })
  .then(response => {
    if (!response.ok) {
      console.error('Supabase sync failed:', response.status);
    } else {
      console.log('Booking synced to Supabase successfully');
    }
    return response;
  })
  .catch(err => {
    console.error('Supabase sync error:', err);
    // Don't block user experience if sync fails
  });
  
  // ... rest of existing code ...
}
```

### 2.4 Set Environment Variables in Netlify

1. Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
2. Add these variables:
   - `SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (get from Supabase Dashboard → Settings → API → service_role key)

⚠️ **Important:** The service role key bypasses RLS, so keep it secret! Only use it in server-side functions.

## Step 3: Test the Integration

1. Make a test booking on your website with a referral code
2. Check Netlify Function logs (Netlify Dashboard → Functions → View logs)
3. Verify data in Supabase:
   - Go to Supabase Dashboard → Table Editor
   - Check `bookings` table for your test booking
   - Check `referral_redemptions` table if a referral code was used

## Step 4: Use Referral Data in Your App

The app now has utility functions to query referral data. See `src/utils/referralDataSync.js` for available functions:

### Available Functions:

1. **`getWebsiteReferrals()`** - Get all bookings with referral codes
2. **`getWebsiteReferralStats()`** - Get referral statistics from website
3. **`getBookingsByReferralCode(code)`** - Get bookings for a specific code
4. **`getReferralRedemptions()`** - Get all referral redemptions
5. **`getCombinedReferralStats()`** - Get combined stats (app + website)

### Example Usage in Your App:

```javascript
import { getWebsiteReferralStats, getCombinedReferralStats } from '../utils/referralDataSync'

// Get website referral stats
const stats = await getWebsiteReferralStats()
console.log('Website referrals:', stats.totalReferrals)
console.log('Website revenue:', stats.totalRevenue)

// Get combined stats (app + website)
const combined = await getCombinedReferralStats()
console.log('Combined referrals:', combined.combined.totalReferrals)
console.log('Combined revenue:', combined.combined.totalRevenue)
```

## Step 5: Update Referral Dashboard (Optional)

You can update `ReferralDashboard.jsx` to show both app referrals and website referrals:

```javascript
import { getCombinedReferralStats } from '../utils/referralDataSync'

// In your component:
const [combinedStats, setCombinedStats] = useState(null)

useEffect(() => {
  fetchCombinedStats()
}, [])

const fetchCombinedStats = async () => {
  const stats = await getCombinedReferralStats()
  setCombinedStats(stats)
}
```

## Troubleshooting

### Issue: Netlify Function returns 500 error
- **Check:** Environment variables are set correctly in Netlify
- **Check:** Service role key is correct (not anon key)
- **Check:** Supabase tables exist and RLS policies allow service role access

### Issue: Booking data not appearing in Supabase
- **Check:** Netlify Function logs for errors
- **Check:** Booking data format matches expected schema
- **Check:** RLS policies allow service role to insert

### Issue: App can't read referral data
- **Check:** RLS policies allow authenticated users to read
- **Check:** User is authenticated in the app
- **Check:** Tables exist and have data

## Next Steps

1. ✅ Run SQL script in Supabase
2. ✅ Create Netlify function in website repo
3. ✅ Update booking.js to call sync function
4. ✅ Set environment variables in Netlify
5. ✅ Test booking flow
6. ✅ Update app to display website referral data (optional)

## Support

If you encounter issues:
1. Check Netlify Function logs
2. Check Supabase logs (Dashboard → Logs)
3. Verify environment variables
4. Test SQL queries directly in Supabase SQL Editor

