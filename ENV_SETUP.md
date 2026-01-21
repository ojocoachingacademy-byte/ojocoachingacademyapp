# Environment Variables Setup Guide

## Quick Fix for "Missing Supabase environment variables" Error

If you're seeing this error in production, the environment variables are not set in your deployment platform.

## For Netlify Deployment

1. **Go to Netlify Dashboard**
   - Navigate to your site
   - Click **Site settings**
   - Click **Environment variables** (under Build & deploy)

2. **Add Required Variables**
   
   Add these variables (click "Add a variable" for each):
   
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   VITE_ANTHROPIC_API_KEY=your_anthropic_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. **Redeploy**
   - Go to **Deploys** tab
   - Click **Trigger deploy** > **Deploy site**
   - Or push a new commit to trigger a rebuild

## For Local Development

1. **Create `.env` file** in project root:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   VITE_ANTHROPIC_API_KEY=your_anthropic_key_here
   ```

2. **Restart dev server**:
   ```bash
   npm run dev
   ```

## Important Notes

- **Vite requires `VITE_` prefix** for client-side environment variables
- **Variables are embedded at BUILD TIME**, not runtime
- **Local `.env` files don't work in production** - must set in deployment platform
- **After adding variables in Netlify, you MUST redeploy** for them to take effect

## Finding Your Supabase Keys

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** > **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `VITE_SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## Troubleshooting

### Error persists after setting variables?
1. Check variable names match exactly (case-sensitive)
2. Ensure `VITE_` prefix is present
3. Redeploy the site (variables are embedded at build time)
4. Check Netlify build logs for any errors

### Variables work locally but not in production?
- Local `.env` files are NOT used in production
- Must set variables in Netlify dashboard
- Must redeploy after adding variables

### Still having issues?
- Check browser console for detailed error message
- Check Netlify build logs
- Verify variables are set correctly in Netlify dashboard
