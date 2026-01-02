# Cal.com Integration Setup Guide

## Overview
This guide explains how to set up Cal.com booking integration with the Ojo Coaching Academy app.

## Prerequisites
- Cal.com account with a booking link (e.g., `tobi-ojo-jg8ane/60min`)
- Netlify account for hosting webhook function
- Supabase project with service role key

## Step 1: Install Dependencies
✅ Already completed - `@calcom/embed-react` is installed

## Step 2: Configure Cal.com Webhook

1. **Go to Cal.com Settings**
   - Navigate to: https://cal.com/settings/developer/webhooks
   - Or: Settings → Developer → Webhooks

2. **Create New Webhook**
   - Click "Add Webhook"
   - **URL**: `https://your-netlify-site.netlify.app/.netlify/functions/calcom-webhook`
     - Replace `your-netlify-site` with your actual Netlify site name
   - **Event**: Select "booking.created"
   - **Secret**: Generate a secure secret (save this for later)
   - Click "Save"

3. **Test Webhook**
   - Cal.com will send a test event
   - Check Netlify function logs to verify it's receiving events

## Step 3: Configure Netlify Environment Variables

1. **Go to Netlify Dashboard**
   - Navigate to: Site settings → Environment variables

2. **Add Required Variables**
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (NOT the anon key)
     - Get this from: Supabase Dashboard → Settings → API → service_role key
   - `CALCOM_WEBHOOK_SECRET`: (Optional) The webhook secret from Cal.com for signature verification

3. **Important Security Note**
   - The service role key bypasses Row Level Security (RLS)
   - Keep it secure and never expose it in client-side code
   - Only use it in serverless functions

## Step 4: Update Cal.com Booking Link

In `BookLessonModal.jsx`, update the `calLink` prop to match your Cal.com booking link:

```jsx
<Cal
  calLink="your-username/your-event-type"
  // ... rest of props
/>
```

Current default: `tobi-ojo-jg8ane/60min`

## Step 5: Test the Integration

1. **Student Books a Lesson**
   - Student logs in
   - Clicks "Book a Lesson" button
   - Cal.com embed opens
   - Student selects a time slot and books

2. **Verify Webhook Fires**
   - Check Netlify function logs
   - Should see: "Cal.com webhook received"
   - Should see: "Lesson created successfully"

3. **Verify Database Updates**
   - Check Supabase `lessons` table
   - New lesson should be created with status "scheduled"
   - Check `students` table
   - Student's `lesson_credits` should be decremented by 1

4. **Verify Notification**
   - Check `notifications` table
   - Student should have a new notification about the booking

## Troubleshooting

### Webhook Not Firing
- Check Cal.com webhook settings
- Verify webhook URL is correct
- Check Netlify function logs for errors
- Ensure webhook is subscribed to "booking.created" event

### Lesson Not Created
- Check Netlify function logs for errors
- Verify `studentId` is in booking metadata
- Check Supabase RLS policies allow inserts
- Verify service role key is correct

### Credit Not Deducted
- Check if student has credits > 0
- Verify student record exists in `students` table
- Check function logs for update errors

### Cal.com Embed Not Loading
- Verify `@calcom/embed-react` is installed
- Check browser console for errors
- Ensure Cal.com booking link is correct
- Check network tab for failed requests

## Webhook Payload Structure

Cal.com webhook payloads may vary. The function handles multiple possible structures:

```javascript
{
  uid: "booking-id",
  title: "Tennis Lesson",
  startTime: "2024-01-15T10:00:00Z",
  endTime: "2024-01-15T11:00:00Z",
  attendees: [{ email: "student@example.com" }],
  metadata: {
    studentId: "uuid-here",
    source: "ojo-coaching-app"
  }
}
```

## Security Considerations

1. **Webhook Signature Verification** (Recommended)
   - Uncomment signature verification code in `calcom-webhook.js`
   - Add `CALCOM_WEBHOOK_SECRET` to Netlify environment variables
   - Implement signature verification function

2. **Service Role Key Security**
   - Never commit service role key to git
   - Only use in serverless functions
   - Rotate key if exposed

3. **Input Validation**
   - Function validates required fields
   - Sanitizes user input
   - Handles missing data gracefully

## Next Steps

- [ ] Update Cal.com booking link in `BookLessonModal.jsx`
- [ ] Configure Cal.com webhook with your Netlify URL
- [ ] Add environment variables to Netlify
- [ ] Test booking flow end-to-end
- [ ] (Optional) Add webhook signature verification
- [ ] (Optional) Add error notifications for failed bookings
