# Debugging Profile Deletion and 406 Error

## Issues Found

### 1. 406 "Not Acceptable" Error
**Error**: `Failed to load resource: the server responded with a status of 406`

**Cause**: 
- Supabase client not properly initialized (missing environment variables)
- The `supabaseAdmin` client falls back to regular `supabase` client when service key is missing
- Regular client doesn't have admin permissions, causing 406 errors

**Fix Applied**:
- Added better error handling in `supabaseClient.js` with detailed error messages
- Improved `supabaseAdmin.js` initialization with proper fallback handling
- Added validation checks in `StudentDetailPage.jsx` before using `supabaseAdmin`

### 2. Profile Deletion Not Working
**Issue**: Deletion of authenticated user profile fails

**Fixes Applied**:

1. **Added missing table deletions**:
   - `development_focus_areas` table (has foreign key to students)
   - Better handling of `scheduled_notifications` 
   - Better handling of `practice_plans`

2. **Fixed deletion order**:
   - Clear referral references BEFORE deleting student record
   - Delete profiles BEFORE auth user
   - Added verification step at the end

3. **Improved error handling**:
   - Added comprehensive logging throughout deletion process
   - Check for remaining references before attempting auth deletion
   - Better error messages with specific table/column information
   - Final verification to confirm deletion

4. **Enhanced debugging**:
   - Log each step of deletion process
   - Check for remaining foreign key references
   - Verify deletion success at the end

## Deletion Order (Corrected)

1. Messages (in conversations)
2. Conversations
3. Notifications
4. Testimonial requests
5. Testimonials
6. Hitting partners
7. Scheduled notifications (metadata check)
8. Practice plans
9. Development focus areas (NEW)
10. Skill progress snapshots
11. Student milestones
12. Lesson homework
13. Payment transactions
14. Lesson transactions
15. Lessons
16. **Clear referral references** (set referred_by_student_id to null) - MOVED BEFORE student deletion
17. **Delete students record**
18. **Delete profiles record**
19. **Delete auth user**

## Testing the Fix

1. **Check environment variables are set**:
   - In Netlify: Site settings > Environment variables
   - Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
   - For admin operations: `VITE_SUPABASE_SERVICE_ROLE_KEY` should be set

2. **Check browser console** for:
   - Detailed error messages
   - Which step of deletion failed
   - Remaining references that prevent deletion

3. **Check Netlify function logs**:
   - Go to Netlify dashboard > Functions > delete-auth-user
   - Look for detailed logging of each deletion step
   - Check for any remaining references

## Common Issues

### If 406 error persists:
- Verify environment variables are set in Netlify (not just locally)
- Redeploy the site after adding variables
- Check that variable names match exactly (case-sensitive)
- Ensure `VITE_` prefix is present

### If deletion still fails:
- Check Netlify function logs for specific error
- Look for remaining foreign key references in logs
- Verify the user ID is correct
- Check if any tables have foreign keys we're not cleaning up

## Next Steps

If deletion still fails after these fixes:
1. Check Netlify function logs for the specific error
2. Look for any tables with foreign keys to `students.id` or `profiles.id` that we're missing
3. Check database constraints - some tables might have `ON DELETE RESTRICT` instead of `CASCADE`
