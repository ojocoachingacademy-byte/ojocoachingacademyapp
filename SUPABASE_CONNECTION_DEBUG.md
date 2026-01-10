# Supabase Connection Debugging

## Error: ERR_NAME_NOT_RESOLVED

The console shows `Failed to load resource: net::ERR_NAME_NOT_RESOLVED` for Supabase endpoints.

## Possible Causes

1. **Network Connectivity Issue**
   - Check your internet connection
   - Try accessing `https://ajjqhksdufotifsyejjg.supabase.co` directly in browser
   - Check if corporate firewall/VPN is blocking the connection

2. **Supabase Project Status**
   - Check if Supabase project is active (not paused)
   - Verify project exists in Supabase dashboard
   - Check if project URL is correct

3. **DNS Resolution**
   - DNS might be temporarily unavailable
   - Try flushing DNS cache: `ipconfig /flushdns` (Windows)
   - Try using different DNS (8.8.8.8, 1.1.1.1)

4. **Environment Variables**
   - Check if `.env` file exists (if using env vars)
   - Verify URL format: should be `https://[project-ref].supabase.co` (not `.com`)
   - Restart dev server after changing `.env` file

## Current Configuration

In `src/supabaseClient.js`:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ajjqhksdufotifsyejjg.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BNRwUcCpy4ZZfXfmC8NzVw_JBCEgI2Y'
```

## Quick Checks

1. **Test URL directly:** Open `https://ajjqhksdufotifsyejjg.supabase.co` in browser
2. **Check Supabase Dashboard:** Verify project is active
3. **Restart Dev Server:** Stop and restart `npm run dev`
4. **Check Network Tab:** Look at actual failed requests in Network tab

## Note

This appears to be a network/connectivity issue, not a code issue. The configuration looks correct.




