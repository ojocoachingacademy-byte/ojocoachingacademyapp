# Website ↔ App Integration Checklist

## Current Status
- ✅ App has testimonials system ready
- ✅ Netlify function created (`get-testimonials.js`)
- ✅ Import utility created (`importWebsiteTestimonials.js`)
- ⏳ Website has 2 video testimonials (need to locate)
- ⏳ Website repo: https://github.com/ojocoachingacademy-byte/ojocoachingacademy

## Step-by-Step Integration

### Phase 1: Find Existing Testimonials

**In Website Repository:**

1. [ ] Check `index.html` for testimonials section
2. [ ] Check `review.html` (if exists)
3. [ ] Check `script.js` for testimonial data
4. [ ] Search for `<video>` tags
5. [ ] Search for YouTube/Vimeo embeds
6. [ ] Check for JSON data files

**Extract:**
- [ ] Student names
- [ ] Testimonial text
- [ ] Video URLs
- [ ] Dates (if available)
- [ ] Ratings (if available)

### Phase 2: Set Up Website Repo

**In Website Repository (`ojocoachingacademy`):**

1. [ ] Create `netlify/functions/` directory
2. [ ] Copy `get-testimonials.js` from app repo
3. [ ] Add `@supabase/supabase-js` to `package.json`
4. [ ] Run `npm install`
5. [ ] Set Netlify environment variables:
   - [ ] `SUPABASE_URL`
   - [ ] `SUPABASE_ANON_KEY`
6. [ ] Commit and push changes
7. [ ] Verify Netlify auto-deploys

### Phase 3: Import Existing Testimonials

**In App Repository:**

1. [ ] Format testimonial data as JSON
2. [ ] Run import script (browser console or button)
3. [ ] Verify testimonials appear in `/coach/testimonials`
4. [ ] Set status to "published"
5. [ ] Verify they appear in API endpoint

### Phase 4: Update Website to Use API

**In Website Repository:**

1. [ ] Update HTML to fetch from API
2. [ ] Replace static testimonials with dynamic
3. [ ] Add fallback for static testimonials
4. [ ] Test on localhost
5. [ ] Deploy and test live

### Phase 5: Test Full Integration

1. [ ] Test API endpoint: `/.netlify/functions/get-testimonials`
2. [ ] Verify existing testimonials appear on website
3. [ ] Create new testimonial in app
4. [ ] Verify it appears on website
5. [ ] Test video playback
6. [ ] Test on mobile devices

## Quick Commands

### Test API Endpoint
```bash
curl https://your-site.netlify.app/.netlify/functions/get-testimonials
```

### Import Testimonials (Browser Console)
```javascript
const testimonials = [
  {
    name: "Student Name",
    email: "student@example.com",
    text: "Testimonial text...",
    rating: 5,
    videoUrl: "https://...",
    date: "2024-01-15",
    featured: true
  }
]

import { importWebsiteTestimonials } from './src/utils/importWebsiteTestimonials.js'
await importWebsiteTestimonials(testimonials)
```

## Files to Copy

**From App Repo → Website Repo:**
- `netlify/functions/get-testimonials.js` → `netlify/functions/get-testimonials.js`
- `netlify/functions/send-testimonial-email.js` → `netlify/functions/send-testimonial-email.js` (optional, for emails)

## Next Action

**Right now, I need:**
1. The testimonial data from your website (or where it's located)
2. Confirmation that you want to proceed with integration

Once you share the testimonial data, I'll:
- Create the exact import script
- Help you set up the website integration
- Test everything end-to-end

🚀 Ready when you are!

