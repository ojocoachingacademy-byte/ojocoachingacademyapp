# Email Service Setup - SendGrid Configuration

## ✅ What's Been Done

1. **Netlify Function Created** (`netlify/functions/send-testimonial-email.js`)
   - Server-side email sending function
   - Uses SendGrid API
   - Handles all three email types (request, thankyou, coach_notification)

2. **Client-Side Service Updated** (`src/utils/testimonialEmailService.js`)
   - Calls Netlify Function instead of sending directly
   - Email service enabled (`EMAIL_SERVICE_ENABLED = true`)
   - All three email functions updated

3. **Email Templates**
   - Professional HTML templates
   - Branded with OJO Coaching Academy colors
   - Responsive design

## 📋 What You Need to Do (Website Repository)

### Step 1: Copy Netlify Function
1. Copy `netlify/functions/send-testimonial-email.js` to your website repository
2. Place it in: `netlify/functions/send-testimonial-email.js`

### Step 2: Install Dependencies
In your website repository, add to `package.json`:
```json
{
  "dependencies": {
    "@sendgrid/mail": "^8.1.0"
  }
}
```
Then run: `npm install`

**Note:** The function uses `fetch()` which is available in Node.js 18+. If you need to support older versions, you can install `node-fetch` or use `@sendgrid/mail` package instead.

### Step 3: Verify Environment Variables
In Netlify Dashboard → Your Site → Environment Variables, verify:
- ✅ `SENDGRID_API_KEY` - Your SendGrid API key
- ✅ `SENDGRID_FROM_EMAIL` - Your verified sender email in SendGrid

### Step 4: Deploy
1. Commit and push to your website repository
2. Netlify will automatically deploy the function
3. Function will be available at: `/.netlify/functions/send-testimonial-email`

### Step 5: Test
Test the function (from browser console on your website):
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
.then(res => res.json())
.then(data => console.log(data))
```

## 🔧 Alternative: Use @sendgrid/mail Package

If you prefer using the SendGrid package instead of fetch, update the function:

```javascript
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// Then use:
await sgMail.send({
  to: to,
  from: process.env.SENDGRID_FROM_EMAIL,
  subject: 'Subject',
  html: emailTemplate
})
```

## ✅ Email Flow

1. **Testimonial Request Email:**
   - Triggered when testimonial request is created (after 5 lessons)
   - Sent to student
   - Includes link to submit testimonial

2. **Thank You Email:**
   - Sent after student submits testimonial
   - Confirms receipt
   - Thanks student for feedback

3. **Coach Notification:**
   - Sent to coach when new testimonial is submitted
   - Includes link to review testimonials

## 🎯 That's It!

Once you copy the function to your website repo and deploy, emails will work automatically. The app will call the Netlify function, which uses your SendGrid credentials to send emails.

