# Cal.com Integration Setup Guide

## Overview
Cal.com integration allows students to book lessons directly through a calendar widget, and automatically syncs bookings to your lesson management system.

## Setup Steps

### 1. Create Cal.com Account
1. Go to [https://cal.com](https://cal.com)
2. Sign up for an account (free tier available)
3. Complete your profile setup

### 2. Create Event Types
1. In Cal.com dashboard, go to "Event Types"
2. Create a new event type called "Tennis Lesson"
3. Set duration (e.g., 60 minutes)
4. Configure availability (when you're available)
5. Add booking form fields (name, email, phone, notes)

### 3. Get Your Cal.com Username
1. In Cal.com settings, find your username
2. It will be something like: `yourname` or `yourname-cal`
3. Copy this username

### 4. Configure Environment Variables
Add to your `.env` file:
```env
VITE_CALCOM_USERNAME=your-username
VITE_CALCOM_API_KEY=your-api-key  # Optional, for API integration
VITE_CALCOM_API_URL=https://api.cal.com/v1  # Optional
```

### 5. Add to Netlify Environment Variables
1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add:
   - `VITE_CALCOM_USERNAME` = your Cal.com username
   - `VITE_CALCOM_API_KEY` = your API key (if using API)

### 6. Integration Options

#### Option A: Embed Widget (Recommended for Start)
- Simplest to implement
- Students book directly on Cal.com
- You manually sync bookings to lessons (or use webhooks)

#### Option B: API Integration (Advanced)
- Programmatic booking creation
- Automatic lesson sync
- More control over the booking flow
- Requires Cal.com API key

### 7. Webhook Setup (Optional)
To automatically sync Cal.com bookings to lessons:

1. In Cal.com dashboard, go to "Webhooks"
2. Add webhook URL: `https://your-site.netlify.app/.netlify/functions/calcom-webhook`
3. Select events: `BOOKING_CREATED`, `BOOKING_CANCELLED`
4. Create the webhook handler function (see below)

### 8. Webhook Handler Function
Create `netlify/functions/calcom-webhook.js`:

```javascript
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const booking = JSON.parse(event.body)
    
    // Verify webhook signature (recommended)
    // const signature = event.headers['cal-signature']
    // verifySignature(signature, event.body)
    
    // Sync booking to lessons table
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )
    
    // Find student by email
    const { data: student } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', booking.responses.email)
      .single()
    
    if (student) {
      await supabase
        .from('lessons')
        .insert({
          student_id: student.id,
          lesson_date: booking.startTime,
          location: booking.location || 'TBD',
          status: 'scheduled',
          metadata: {
            calcom_booking_id: booking.id,
            calcom_event_type: booking.eventTypeId
          }
        })
    }
    
    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  } catch (error) {
    console.error('Webhook error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}
```

## Usage

### In Student Dashboard
Add a "Book Lesson" button that opens the Cal.com widget:

```jsx
import CalComIntegration from '../Coach/CalComIntegration'

// In your component
<CalComIntegration 
  studentId={student.id}
  studentName={student.profiles.full_name}
/>
```

### In Coach Dashboard
View all bookings in the Calendar View component, which shows both:
- Lessons created manually
- Lessons synced from Cal.com

## Benefits
- ✅ Students can book at their convenience
- ✅ Automatic calendar management
- ✅ Email confirmations handled by Cal.com
- ✅ Timezone handling
- ✅ Rescheduling and cancellation flows
- ✅ Reduces back-and-forth communication

## Next Steps
1. Test the integration with a test booking
2. Set up webhooks for automatic sync
3. Customize the booking form fields
4. Add custom branding to Cal.com booking page
5. Set up email templates in Cal.com

