# Fix: Move Supabase Keys to Environment Variables

## Current Issue
Supabase URL and key are hardcoded in `src/supabaseClient.js`.

## Solution

### Step 1: Update `src/supabaseClient.js`

```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ajjqhksdufotifsyejjg.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BNRwUcCpy4ZZfXfmC8NzVw_JBCEgI2Y'

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### Step 2: Create `.env` file (if not exists)

Add to `.env`:
```
VITE_SUPABASE_URL=https://ajjqhksdufotifsyejjg.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_BNRwUcCpy4ZZfXfmC8NzVw_JBCEgI2Y
```

### Step 3: Add to Netlify Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables:
- `VITE_SUPABASE_URL` = `https://ajjqhksdufotifsyejjg.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `sb_publishable_BNRwUcCpy4ZZfXfmC8NzVw_JBCEgI2Y`

### Note
The Supabase anonymous key is meant to be public (it's a publishable key), but using environment variables is still best practice for:
- Different environments (dev/staging/prod)
- Easy key rotation
- Not committing keys to version control

