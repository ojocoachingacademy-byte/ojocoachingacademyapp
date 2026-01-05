# Website ↔ App Full Integration Guide

This guide helps you connect your website and app so they share testimonials and other data.

## Current Situation

- **Website:** Has 2 video testimonials already
- **App:** Has testimonials system ready
- **Goal:** Sync both ways - website testimonials → app, app testimonials → website

## Option 1: Import Existing Website Testimonials

If your website testimonials are stored somewhere (database, CMS, static files), we can import them.

### Step 1: Export Website Testimonials

**If testimonials are in a database:**
- Export as JSON or CSV
- Share the data structure

**If testimonials are in code/static files:**
- Share the file or data structure

**If testimonials are in a CMS:**
- Export via API or export feature

### Step 2: Import Script

Once I have the data structure, I'll create an import script to:
1. Read the website testimonials
2. Create records in Supabase `testimonials` table
3. Set status to "published" (or "approved" for review)
4. Preserve video URLs and all metadata

## Option 2: Connect GitHub Repositories

### Method A: Add Me as Collaborator

1. Go to your website repository on GitHub
2. Settings → Collaborators → Add collaborator
3. Add my GitHub username (if you want to share it)
4. I'll be able to see and edit the website code

### Method B: Share Repository Info

Just tell me:
- Repository name/URL
- I can reference it in documentation
- You copy code between repos

### Method C: Monorepo (Advanced)

Combine both repos into one monorepo:
- `packages/website/` - Website code
- `packages/app/` - App code
- Shared utilities and functions

## Option 3: Full Integration Setup

### Architecture

```
Website (Netlify)
    ↓
Netlify Functions
    ↓
Supabase Database ← App reads/writes
```

### What We'll Connect

1. **Testimonials** (Bidirectional)
   - Website → App: Import existing testimonials
   - App → Website: New testimonials appear on website

2. **Bookings** (Website → App)
   - Website bookings sync to Supabase
   - App shows booking data

3. **Referrals** (Bidirectional)
   - Website referral codes → App
   - App referrals → Website analytics

## Immediate Next Steps

### For You:

1. **Share website testimonial data:**
   - Where are the 2 video testimonials stored?
   - What's the data structure? (name, text, video URL, rating, etc.)
   - Can you export them as JSON?

2. **Website repository info:**
   - Repository name/URL?
   - Want to add me as collaborator?
   - Or just share the structure?

3. **Test the API:**
   - The `get-testimonials` Netlify function is ready
   - We can test it once deployed

### For Me:

Once I have the testimonial data structure, I'll:
1. Create import script for existing testimonials
2. Set up sync functions
3. Update website code to use app's testimonial API
4. Ensure bidirectional sync works

## Quick Test

To test the connection right now:

1. **In your website repo**, add the Netlify function:
   - Copy `netlify/functions/get-testimonials.js` from this repo
   - Deploy to Netlify

2. **Test the endpoint:**
   ```bash
   curl https://your-site.netlify.app/.netlify/functions/get-testimonials
   ```

3. **If it works**, we can:
   - Import your 2 existing testimonials
   - Display them in the app
   - Set up full sync

## Questions for You

1. Where are the 2 video testimonials currently stored?
   - Database? CMS? Static files? Code?

2. What's the data structure?
   - Student name, testimonial text, video URL, rating, date?

3. Website repository:
   - Name/URL?
   - Want to connect it so I can help directly?

4. Preferred approach:
   - Import existing → sync new ones?
   - Or start fresh and migrate?

Let me know and I'll set everything up! 🚀

