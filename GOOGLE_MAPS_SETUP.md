# Google Maps API Setup

The Tennis Resources feature uses Google Maps to display tennis clinics in San Diego.

## Setup Instructions

### Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Maps JavaScript API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Maps JavaScript API"
   - Click "Enable"

4. Create API Key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key

### Step 2: Restrict API Key (Recommended)

For security, restrict the API key:

1. Click on the API key to edit it
2. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add your domains:
     - `localhost:*` (for development)
     - `*.netlify.app` (for Netlify deployment)
     - `yourdomain.com` (your production domain)

3. Under "API restrictions":
   - Select "Restrict key"
   - Select "Maps JavaScript API"
   - Save

### Step 3: Create Map ID (Optional - for Advanced Markers)

Advanced Markers require a Map ID. To use them:

1. In Google Cloud Console, go to "Maps" → "Map Styles"
2. Create a new map style or use default
3. Copy the Map ID (format: `xxxxxxxxxxxxx`)

**Note:** If you don't set a Map ID, the app will use legacy markers (which still work fine).

### Step 4: Add to Environment Variables

Add to your `.env` file:

```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
VITE_GOOGLE_MAPS_MAP_ID=your_map_id_here  # Optional - for Advanced Markers
```

Or in Netlify:
- Go to Site Settings → Environment Variables
- Add: `VITE_GOOGLE_MAPS_API_KEY` = `your_api_key_here`
- Add: `VITE_GOOGLE_MAPS_MAP_ID` = `your_map_id_here` (Optional)

### Step 4: Test

1. Start your dev server: `npm run dev`
2. Navigate to `/tennis-resources`
3. You should see the San Diego map with tennis clinics

## Features

- ✅ Interactive map of San Diego
- ✅ 8 tennis clinics marked with custom icons
- ✅ User location detection
- ✅ Distance calculation from user to clinics
- ✅ Clickable clinic cards with details
- ✅ Info windows on map markers
- ✅ Responsive design

## Cost

Google Maps JavaScript API has a free tier:
- **$200 free credit per month**
- First 28,000 map loads free
- After that: $7 per 1,000 loads

For most apps, this is plenty! Monitor usage in Google Cloud Console.

## Troubleshooting

**Map not loading?**
- Check browser console for errors
- Verify API key is correct
- Check API restrictions allow your domain
- Ensure Maps JavaScript API is enabled

**Location not working?**
- Browser may block geolocation
- User needs to allow location access
- HTTPS required for geolocation (or localhost)

**Markers not showing?**
- Check that clinic data has valid lat/lng
- Verify Google Maps script loaded correctly

## Alternative: Use Leaflet (Free)

If you want to avoid Google Maps costs, we can switch to Leaflet (free, open-source):
- Uses OpenStreetMap
- No API key needed
- Similar functionality
- Let me know if you want to switch!

