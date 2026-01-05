# Repository Connections

## Website Repository
- **URL:** https://github.com/ojocoachingacademy-byte/ojocoachingacademy
- **Type:** Static HTML/CSS/JS website
- **Deployment:** Netlify
- **Purpose:** Public-facing tennis coaching website
- **Key Files:**
  - `index.html` - Main landing page
  - `review.html` - Reviews/testimonials page
  - `booking.html` - Booking and payment page
  - `script.js` - General JavaScript
  - `styles.css` - All styling
  - `netlify/functions/` - Netlify serverless functions

## App Repository
- **URL:** https://github.com/ojocoachingacademy-byte/ojocoachingacademyapp
- **Type:** React application
- **Deployment:** Netlify (or Vercel)
- **Purpose:** Coaching academy management app (coach & student dashboards)
- **Key Tech:**
  - React + Vite
  - Supabase (database & auth)
  - Netlify Functions

## Integration Points

### 1. Testimonials
- **Website → App:** Import existing website testimonials
- **App → Website:** New testimonials appear on website via API
- **API Endpoint:** `/.netlify/functions/get-testimonials`

### 2. Bookings
- **Website → App:** Website bookings sync to Supabase
- **Function:** `netlify/functions/sync-booking-to-supabase.js` (to be created)

### 3. Referrals
- **Website → App:** Website referral codes sync to Supabase
- **App → Website:** Referral analytics available

## Shared Resources

### Supabase Database
- Both repos connect to the same Supabase project
- Website uses Netlify Functions to write to Supabase
- App reads/writes directly via Supabase client

### Netlify Functions
- Functions can be shared between repos
- Or duplicated with same logic
- Environment variables set in Netlify dashboard

## Current Status

- ✅ App has testimonials system
- ✅ Netlify function created for testimonials API
- ⏳ Website has 2 video testimonials (need to locate)
- ⏳ Website integration pending

## Notes

- Website is simple HTML/CSS/JS (no framework)
- App is React-based
- Both deploy to Netlify
- Both use same Supabase database
- Testimonials sync bidirectionally

