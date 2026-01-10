# Testimonials System - Completion Checklist

Use this checklist to verify everything is set up and working.

## ✅ Database Setup

### Step 1: Run Testimonials Schema SQL
- [ ] Go to Supabase Dashboard → SQL Editor
- [ ] Run `supabase_testimonials_schema.sql`
- [ ] Verify tables created:
  - [ ] `testimonials` table exists
  - [ ] `testimonial_requests` table exists
  - [ ] RLS policies are enabled

### Step 2: Run Automation SQL
- [ ] Go to Supabase Dashboard → SQL Editor
- [ ] Run `supabase_testimonials_automation.sql`
- [ ] Verify functions created:
  - [ ] `auto_request_testimonial()` function exists
  - [ ] `get_eligible_testimonial_students()` function exists
  - [ ] `create_testimonial_requests_batch()` function exists
  - [ ] Trigger `trigger_auto_request_testimonial` exists on `lessons` table

### Step 3: Create Storage Bucket
- [ ] Go to Supabase Dashboard → Storage
- [ ] Create bucket: `testimonial-videos`
- [ ] Settings:
  - [ ] Public: **false** (private)
  - [ ] File size limit: 100MB
  - [ ] Allowed MIME types: `video/mp4`, `video/webm`, `video/quicktime`
- [ ] Or run SQL (see `supabase_testimonials_schema.sql` comments)

### Step 4: Set Storage Policies
- [ ] Run storage policy SQL from `supabase_testimonials_schema.sql`
- [ ] Verify students can upload their own videos
- [ ] Verify authenticated users can view videos

## ✅ Email Service Setup

### Step 1: Deploy Netlify Function (Website Repository)
- [ ] Copy `netlify/functions/send-testimonial-email.js` to your website repo
- [ ] Add to `package.json` (if not already):
  ```json
  {
    "dependencies": {
      "@sendgrid/mail": "^8.1.0"
    }
  }
  ```
- [ ] Run `npm install` in website repo

### Step 2: Verify Environment Variables in Netlify
- [ ] Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
- [ ] Verify these exist:
  - [ ] `SENDGRID_API_KEY` ✅ (You confirmed this exists)
  - [ ] `SENDGRID_FROM_EMAIL` ✅ (You confirmed this exists)
  - [ ] `SUPABASE_URL` (for other functions)
  - [ ] `SUPABASE_ANON_KEY` (for other functions)

### Step 3: Test Email Function
- [ ] Deploy website with new function
- [ ] Test endpoint (from browser console or Postman):
  ```javascript
  fetch('/.netlify/functions/send-testimonial-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'thankyou',
      to: 'your-email@example.com',
      name: 'Test Student'
    })
  })
  ```
- [ ] Check email inbox for test email

## ✅ Website Integration

### Step 1: Deploy Testimonials API Function
- [ ] Copy `netlify/functions/get-testimonials.js` to website repo
- [ ] Verify `@supabase/supabase-js` is in `package.json`
- [ ] Deploy to Netlify

### Step 2: Test API Endpoint
- [ ] Test endpoint:
  ```
  GET https://your-site.netlify.app/.netlify/functions/get-testimonials
  ```
- [ ] Should return JSON with testimonials array
- [ ] Test with query params:
  ```
  GET .../get-testimonials?featured=true&limit=3
  ```

### Step 3: Integrate on Website
- [ ] Add JavaScript to fetch testimonials
- [ ] Display testimonials on website
- [ ] Test with published testimonials

## ✅ App Features Verification

### Student Features
- [ ] Testimonial request banner appears after 5+ lessons
- [ ] Banner can be dismissed
- [ ] Clicking "Submit Testimonial" opens modal
- [ ] Can submit text testimonial with rating
- [ ] Can upload video testimonial (if storage bucket set up)
- [ ] Submission creates testimonial with "pending" status
- [ ] Thank you email sent after submission (if email configured)

### Coach Features
- [ ] "Testimonials" link appears in navigation
- [ ] Can view all testimonials
- [ ] Can filter by status (all, pending, approved, published)
- [ ] Can approve pending testimonials
- [ ] Can publish approved testimonials
- [ ] Can mark as featured
- [ ] Can delete testimonials
- [ ] Analytics dashboard shows metrics
- [ ] Coach notification email sent when testimonial submitted (if email configured)

### Automated Features
- [ ] Database trigger creates request when lesson completed (after 5 lessons)
- [ ] Request email sent automatically (if email configured)
- [ ] Banner appears when request exists

## ✅ Testing Checklist

### Test 1: Automated Request Creation
1. [ ] Complete 5 lessons for a test student
2. [ ] Check `testimonial_requests` table in Supabase
3. [ ] Verify request was created automatically
4. [ ] Check student dashboard for banner
5. [ ] Verify email was sent (check SendGrid logs)

### Test 2: Testimonial Submission
1. [ ] Student submits testimonial via banner
2. [ ] Check `testimonials` table - should have new record
3. [ ] Status should be "pending"
4. [ ] Thank you email sent to student
5. [ ] Coach notification email sent

### Test 3: Coach Approval Flow
1. [ ] Coach views pending testimonial
2. [ ] Coach approves testimonial
3. [ ] Status changes to "approved"
4. [ ] Coach publishes testimonial
5. [ ] Status changes to "published"
6. [ ] Testimonial appears in API endpoint

### Test 4: Website Integration
1. [ ] Call API endpoint from website
2. [ ] Verify published testimonials are returned
3. [ ] Test featured filter
4. [ ] Test limit parameter
5. [ ] Display testimonials on website

### Test 5: Analytics
1. [ ] View analytics dashboard
2. [ ] Verify all metrics are calculated correctly
3. [ ] Check submission rate
4. [ ] Check conversion rate
5. [ ] Verify video vs text counts

## ✅ Final Verification

- [ ] All SQL scripts run successfully
- [ ] All tables exist in Supabase
- [ ] Storage bucket created and policies set
- [ ] Netlify functions deployed
- [ ] Environment variables set in Netlify
- [ ] Email service working (test emails received)
- [ ] Testimonials can be submitted
- [ ] Testimonials can be approved/published
- [ ] API endpoint returns testimonials
- [ ] Analytics dashboard working
- [ ] Automated requests working

## 🎉 Status

Once all items are checked, your testimonials system is fully operational!

## 📝 Notes

- **Email Service:** Currently configured to use Netlify Function with SendGrid
- **Automated Requests:** Database trigger handles this automatically
- **Storage:** Videos stored in Supabase Storage (private bucket)
- **API:** Testimonials API ready for website integration

## 🐛 Troubleshooting

### Emails not sending?
- Check Netlify function logs
- Verify SendGrid API key is correct
- Check SendGrid dashboard for delivery status
- Verify `SENDGRID_FROM_EMAIL` is verified in SendGrid

### Testimonials not appearing?
- Check testimonial status (must be "published")
- Verify RLS policies allow reading
- Check API endpoint logs

### Automated requests not creating?
- Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_request_testimonial'`
- Check lesson status is "completed"
- Verify student has 5+ completed lessons

### Video upload failing?
- Verify storage bucket exists
- Check storage policies
- Verify file size < 100MB
- Check file type is allowed


