# Testimonials System - Next Steps Setup Guide

This guide covers the setup for the advanced features we just implemented.

## ✅ What's Been Added

### 1. **Automated Request Creation** (`supabase_testimonials_automation.sql`)
- Database trigger that automatically creates testimonial requests when students complete 5, 10, 15, etc. lessons
- Functions to get eligible students and create requests in batch
- No manual intervention needed!

### 2. **Email Integration** (`src/utils/testimonialEmailService.js`)
- Email templates for testimonial requests, thank you emails, and coach notifications
- Ready to integrate with SendGrid, Resend, or your email service
- Currently logs emails (set `EMAIL_SERVICE_ENABLED = true` when ready)

### 3. **Website Integration** (`netlify/functions/get-testimonials.js`)
- Netlify Function API endpoint to fetch published testimonials
- Can be called from your website to display testimonials
- Supports filtering (featured only) and limiting results

### 4. **Analytics Tracking** (`src/components/Testimonials/TestimonialsAnalytics.jsx`)
- Analytics dashboard showing:
  - Total testimonials (published, pending)
  - Average rating
  - Submission rate
  - Conversion rate (requests → submissions)
  - Video vs text submissions
  - Featured count

## 📋 Setup Instructions

### Step 1: Run Automation SQL Script

1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase_testimonials_automation.sql`
3. This creates:
   - Trigger function that auto-creates requests after 5 lessons
   - Helper functions for batch processing

**What this does:**
- Automatically creates testimonial requests when a lesson is marked as "completed"
- Only creates requests at milestones (5, 10, 15, 20 lessons, etc.)
- Prevents duplicate requests

### Step 2: Set Up Email Service (Optional)

The email service is ready but needs to be connected to your email provider.

**Option A: SendGrid**
1. Sign up at https://sendgrid.com
2. Get your API key
3. Update `testimonialEmailService.js`:
   ```javascript
   const EMAIL_SERVICE_ENABLED = true
   
   // Add SendGrid integration
   const sgMail = require('@sendgrid/mail')
   sgMail.setApiKey(process.env.SENDGRID_API_KEY)
   ```

**Option B: Resend**
1. Sign up at https://resend.com
2. Get your API key
3. Update the email service with Resend SDK

**Option C: Supabase Edge Functions**
- Create an edge function to send emails
- Call it from the app

**For now:** Emails are logged to console. Set `EMAIL_SERVICE_ENABLED = true` when ready.

### Step 3: Deploy Netlify Function (Website Repository)

1. **In your website repository** (`ojocoachingacademy`):
   - Copy `netlify/functions/get-testimonials.js` to your website repo
   - Add to `package.json`:
     ```json
     {
       "dependencies": {
         "@supabase/supabase-js": "^2.39.0"
       }
     }
     ```
   - Run `npm install`

2. **Set Environment Variables in Netlify:**
   - Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
   - Add:
     - `SUPABASE_URL` - Your Supabase project URL
     - `SUPABASE_ANON_KEY` - Your Supabase anon key (public key is fine for read-only)

3. **Test the endpoint:**
   ```
   GET https://your-site.netlify.app/.netlify/functions/get-testimonials
   GET https://your-site.netlify.app/.netlify/functions/get-testimonials?featured=true
   GET https://your-site.netlify.app/.netlify/functions/get-testimonials?limit=5
   ```

### Step 4: Use on Website

**JavaScript Example:**
```javascript
// Fetch testimonials from your website
async function loadTestimonials() {
  const response = await fetch('/.netlify/functions/get-testimonials?featured=true&limit=3')
  const data = await response.json()
  
  if (data.success) {
    data.testimonials.forEach(testimonial => {
      // Display testimonial on your website
      console.log(testimonial.name, testimonial.text, testimonial.rating)
    })
  }
}
```

**HTML Example:**
```html
<div id="testimonials-container"></div>

<script>
  fetch('/.netlify/functions/get-testimonials?featured=true')
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('testimonials-container')
      data.testimonials.forEach(t => {
        container.innerHTML += `
          <div class="testimonial">
            <h3>${t.name}</h3>
            <div class="rating">${'★'.repeat(t.rating)}</div>
            <p>${t.text}</p>
            ${t.videoUrl ? `<a href="${t.videoUrl}">Watch Video</a>` : ''}
          </div>
        `
      })
    })
</script>
```

## 🎯 How It Works

### Automated Requests:
1. Student completes a lesson → Lesson status set to "completed"
2. Database trigger fires → Checks if student has 5, 10, 15, etc. lessons
3. If milestone reached → Creates testimonial request automatically
4. Student sees banner on dashboard → Can submit testimonial

### Email Flow:
1. **Request Email:** Sent when testimonial request is created (if email service enabled)
2. **Thank You Email:** Sent after student submits testimonial
3. **Coach Notification:** Sent to coach when new testimonial is submitted

### Website Integration:
1. Website calls Netlify Function → `/.netlify/functions/get-testimonials`
2. Function queries Supabase → Gets published testimonials
3. Returns JSON → Website displays testimonials

### Analytics:
- Tracks all metrics automatically
- Updates in real-time
- Shows on Testimonials Management page

## 🔧 Configuration

### Change Lesson Threshold:
In `supabase_testimonials_automation.sql`, modify:
```sql
IF completed_lessons_count >= 5 AND completed_lessons_count % 5 = 0 THEN
```
Change `5` to your desired threshold.

### Enable Email Service:
In `src/utils/testimonialEmailService.js`:
```javascript
const EMAIL_SERVICE_ENABLED = true // Change to true
```

Then integrate with your email provider (SendGrid, Resend, etc.)

## 📊 Analytics Metrics Explained

- **Total Testimonials:** All testimonials (pending, approved, published)
- **Published Testimonials:** Testimonials visible on website
- **Average Rating:** Average of all testimonial ratings
- **Submission Rate:** % of students who submit testimonials
- **Conversion Rate:** % of requests that result in submissions
- **Video Submissions:** Number of testimonials with video
- **Featured Count:** Number of featured testimonials

## 🚀 Next Enhancements (Optional)

1. **Scheduled Email Reminders**
   - Send reminder emails if testimonial not submitted after X days

2. **Testimonial Templates**
   - Pre-filled templates for students to customize

3. **Social Sharing**
   - Allow students to share their testimonials on social media

4. **Testimonial Widget**
   - Embeddable widget for website with rotating testimonials

5. **Advanced Analytics**
   - Time-series charts
   - Rating distribution
   - Submission trends over time

## ✅ Checklist

- [ ] Run `supabase_testimonials_automation.sql` in Supabase
- [ ] Test automated request creation (complete 5 lessons)
- [ ] Set up email service (optional)
- [ ] Deploy Netlify function to website repo
- [ ] Add environment variables in Netlify
- [ ] Test API endpoint
- [ ] Integrate testimonials on website
- [ ] Check analytics dashboard

Everything is ready to go! 🎉

