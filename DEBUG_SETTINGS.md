# Settings Page Debugging Guide

## Potential Issues Found

### 1. Missing Button Classes
The Settings component uses `btn btn-primary` classes but these may not be defined in global.css. Check if button styles exist.

**Fix:** Add button styles to `StudentSettings.css` or ensure global.css has `.btn` and `.btn-primary` classes.

### 2. RLS Policy for Profile Updates
Check if the UPDATE policy exists in Supabase:
- Policy name: "Users can update their own profile"
- Should allow: `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`

**Fix:** Run `supabase_rls_fix.sql` in Supabase SQL Editor if the policy doesn't exist.

### 3. Console Logging
Add detailed logging to see what's failing:
- Log user ID
- Log form data being sent
- Log Supabase error details (code, message, details, hint)

## Debugging Steps

1. Open browser console (F12)
2. Navigate to `/settings` page
3. Try to save a profile change
4. Check console for errors
5. Check Network tab for failed requests
6. Look for:
   - RLS policy violations
   - Missing CSS classes (check Elements tab)
   - JavaScript errors

## Common Issues

### Issue: "new row violates row-level security policy"
**Cause:** UPDATE policy missing or incorrect
**Fix:** Ensure RLS UPDATE policy exists (see supabase_rls_fix.sql line 33-38)

### Issue: Button not styled properly
**Cause:** Missing `.btn` CSS classes
**Fix:** Add button styles or import from global.css

### Issue: Form not saving
**Cause:** Check console for Supabase errors
**Fix:** Add comprehensive error logging in handleSave function




