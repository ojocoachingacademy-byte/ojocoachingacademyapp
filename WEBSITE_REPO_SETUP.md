# Website Repository Setup - Full Integration

This guide helps you set up the website repository (`ojocoachingacademy`) to connect with the app.

## Repository Info
- **Website Repo:** https://github.com/ojocoachingacademy-byte/ojocoachingacademy
- **App Repo:** https://github.com/ojocoachingacademy-byte/ojocoachingacademyapp

## Step 1: Find Existing Testimonials

Your website has 2 video testimonials. Let's locate them:

### Check These Files:
1. **`index.html`** - Main page (might have testimonials section)
2. **`review.html`** - Reviews/testimonials page
3. **`script.js`** - JavaScript (might have testimonial data)
4. **Any data files** - JSON, CSV, etc.

### Common Locations:
- Embedded in HTML: `<video>` tags or iframes
- In JavaScript: Array of testimonial objects
- In a separate data file: `testimonials.json`, `data.json`
- In a CMS or external service

## Step 2: Extract Testimonial Data

Once you find them, extract this information for each testimonial:

```json
{
  "name": "Student Name",
  "email": "student@example.com",  // if available
  "text": "Testimonial text...",
  "rating": 5,
  "videoUrl": "https://...",
  "date": "2024-01-15",
  "featured": true
}
```

## Step 3: Add Netlify Functions to Website Repo

### 3.1 Create Function Directory

In your website repo, create:
```
netlify/functions/get-testimonials.js
```

### 3.2 Copy the Function

Copy the function from the app repo:
- Source: `netlify/functions/get-testimonials.js` (in app repo)
- Destination: `netlify/functions/get-testimonials.js` (in website repo)

### 3.3 Add Dependencies

In website repo's `package.json`, add:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

Then run: `npm install`

### 3.4 Set Environment Variables in Netlify

Go to Netlify Dashboard → Your Site → Environment Variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key

## Step 4: Update Website to Use API

### Option A: Replace Static Testimonials with API

In your website's HTML/JS, replace hardcoded testimonials with:

```javascript
// Fetch testimonials from API
async function loadTestimonials() {
  try {
    const response = await fetch('/.netlify/functions/get-testimonials?featured=true')
    const data = await response.json()
    
    if (data.success && data.testimonials) {
      displayTestimonials(data.testimonials)
    }
  } catch (error) {
    console.error('Error loading testimonials:', error)
    // Fallback to static testimonials if API fails
  }
}

function displayTestimonials(testimonials) {
  const container = document.getElementById('testimonials-container')
  container.innerHTML = testimonials.map(t => `
    <div class="testimonial">
      <h3>${t.name}</h3>
      <div class="rating">${'★'.repeat(t.rating)}</div>
      <p>${t.text}</p>
      ${t.videoUrl ? `
        <video controls>
          <source src="${t.videoUrl}" type="video/mp4">
        </video>
      ` : ''}
    </div>
  `).join('')
}

// Load on page load
loadTestimonials()
```

### Option B: Keep Static + Add Dynamic

Keep your existing 2 testimonials, but add new ones from the app:

```javascript
// Load existing static testimonials
const staticTestimonials = [/* your 2 existing ones */]

// Load new ones from app
async function loadNewTestimonials() {
  const response = await fetch('/.netlify/functions/get-testimonials')
  const data = await response.json()
  return data.testimonials || []
}

// Combine and display
async function displayAllTestimonials() {
  const newTestimonials = await loadNewTestimonials()
  const allTestimonials = [...staticTestimonials, ...newTestimonials]
  // Display all
}
```

## Step 5: Import Existing Testimonials to App

Once you have the testimonial data:

1. **Format as JSON** (see Step 2)
2. **Run import script** in app:
   - Go to app in browser
   - Open console (F12)
   - Run the import function (see `IMPORT_WEBSITE_TESTIMONIALS.md`)

Or I can create a button in the coach dashboard to import them.

## Step 6: Deploy and Test

1. **Commit changes** to website repo
2. **Deploy to Netlify** (auto-deploys if connected)
3. **Test API endpoint:**
   ```
   https://your-site.netlify.app/.netlify/functions/get-testimonials
   ```
4. **Verify testimonials appear** on website

## Quick Start Checklist

- [ ] Find 2 video testimonials in website code
- [ ] Extract testimonial data (name, text, video URL, etc.)
- [ ] Copy `get-testimonials.js` to website repo
- [ ] Add `@supabase/supabase-js` to website `package.json`
- [ ] Set Netlify environment variables
- [ ] Update website HTML/JS to use API
- [ ] Import existing testimonials to app
- [ ] Deploy and test

## Next Steps

1. **Share the testimonial data** - Once you find them, share the structure
2. **I'll create the exact import script** for your data format
3. **We'll test the integration** end-to-end

Let me know when you've found the testimonials! 🚀

