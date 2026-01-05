# Import Existing Website Testimonials

Your website has 2 video testimonials. Let's import them into the app!

## Step 1: Get Testimonial Data

I need the data for your 2 video testimonials. Please provide:

### Option A: Share the Data Structure

If testimonials are in code/files, share:
- The file or code where they're stored
- Or copy/paste the data structure

### Option B: Export as JSON

Create a JSON file with this structure:

```json
[
  {
    "name": "Student Name",
    "email": "student@example.com",
    "text": "Testimonial text here...",
    "rating": 5,
    "videoUrl": "https://...",
    "date": "2024-01-15",
    "featured": true
  },
  {
    "name": "Another Student",
    "email": "another@example.com",
    "text": "Another testimonial...",
    "rating": 5,
    "videoUrl": "https://...",
    "date": "2024-02-20",
    "featured": false
  }
]
```

### Option C: Tell Me Where They Are

Just tell me:
- "They're in a React component at `src/components/Testimonials.jsx`"
- "They're in a JSON file at `data/testimonials.json`"
- "They're in a CMS (Contentful/Sanity/etc.)"
- "They're hardcoded in HTML"

## Step 2: Import Script

I've created `src/utils/importWebsiteTestimonials.js` that will:
1. Read your testimonial data
2. Find or match students in the database
3. Create testimonial records in Supabase
4. Set them as "published" so they appear on website

## Step 3: Run Import

### Method 1: Browser Console

1. Open your app in browser
2. Open Developer Console (F12)
3. Run:

```javascript
// First, define your testimonials
const websiteTestimonials = [
  {
    name: "Student 1 Name",
    email: "student1@example.com", // if available
    text: "Testimonial text...",
    rating: 5,
    videoUrl: "https://...",
    date: "2024-01-15",
    featured: true
  },
  {
    name: "Student 2 Name",
    email: "student2@example.com",
    text: "Another testimonial...",
    rating: 5,
    videoUrl: "https://...",
    date: "2024-02-20",
    featured: false
  }
]

// Import
import { importWebsiteTestimonials } from './src/utils/importWebsiteTestimonials.js'
await importWebsiteTestimonials(websiteTestimonials, {
  defaultStatus: 'published',
  skipDuplicates: true
})
```

### Method 2: Add Button to Coach Dashboard

I can add an "Import Website Testimonials" button that:
- Opens a modal
- Lets you paste JSON or upload file
- Imports testimonials

## Step 4: Verify

After import:
1. Go to `/coach/testimonials` in app
2. You should see the 2 imported testimonials
3. They should be marked as "published"
4. Website API should return them

## What I Need From You

**Just tell me:**
1. Where are the 2 video testimonials stored? (file, code, CMS, etc.)
2. What's the data structure? (or share the code/file)
3. What are the student names? (so I can match them in database)

Once I have this, I'll:
- Create the exact import script for your data structure
- Help you run it
- Verify everything works

## Alternative: Manual Import

If you prefer, you can manually add them:
1. Go to `/coach/testimonials`
2. Click "Add Testimonial" (if available)
3. Or I can create a manual entry form

Let me know what works best! 🚀

