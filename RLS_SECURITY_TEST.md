# RLS Security Test Script

Use these SQL queries in Supabase SQL Editor to verify RLS policies are working correctly.

## Prerequisites
1. Create two test student accounts
2. Note their user IDs (UUIDs)
3. Replace `student-a-id` and `student-b-id` in queries below

## Test 1: Verify Students Can Only Read Own Profile

```sql
-- First, create a test by temporarily disabling RLS to see all profiles
-- Then re-enable and test with a student's auth token

-- As Student A (set role using: SET ROLE authenticated; SET request.jwt.claim.sub = 'student-a-id')
SELECT * FROM profiles WHERE id = auth.uid(); -- Should work (own profile)
SELECT * FROM profiles WHERE id = 'student-b-id'; -- Should FAIL (RLS violation)
```

## Test 2: Verify Students Can Only Read Own Lessons

```sql
-- As Student A
SELECT * FROM lessons WHERE student_id = auth.uid(); -- Should work (own lessons)
SELECT * FROM lessons WHERE student_id = 'student-b-id'; -- Should FAIL (RLS violation)
```

## Test 3: Verify Students Can Only Read Own Student Record

```sql
-- As Student A
SELECT * FROM students WHERE id = auth.uid(); -- Should work (own record)
SELECT * FROM students WHERE id = 'student-b-id'; -- Should FAIL (RLS violation)
```

## Test 4: Verify Coach Can Read All Data

```sql
-- As Coach (authenticated user)
SELECT * FROM profiles; -- Should work (coach can read all)
SELECT * FROM students; -- Should work (coach can read all)
SELECT * FROM lessons; -- Should work (coach can read all)
```

## Test 5: Verify Students Cannot Create Lessons for Others

```sql
-- As Student A
-- Try to create a lesson for Student B - should FAIL
INSERT INTO lessons (student_id, lesson_date, location, status)
VALUES ('student-b-id', NOW(), 'Test Court', 'scheduled');
-- Should FAIL with RLS violation
```

## Current RLS Policies Summary

Based on `supabase_rls_fix.sql`:

### Profiles
- ✅ Users can SELECT/UPDATE own profile (WHERE id = auth.uid())
- ✅ Authenticated users (coaches) can SELECT all profiles

### Students  
- ✅ Users can SELECT own student record (WHERE id = auth.uid())
- ✅ Users can INSERT own student record (WHERE id = auth.uid())
- ✅ Authenticated users (coaches) can SELECT all students

### Lessons
- ✅ Students can SELECT own lessons (WHERE student_id = auth.uid())
- ✅ Authenticated users (coaches) can SELECT all lessons
- ✅ Authenticated users (coaches) can INSERT lessons
- ✅ Authenticated users can UPDATE lessons (for feedback/learnings)

### Hitting Partners
- ✅ Users can SELECT/UPDATE own hitting partner profile
- ✅ Authenticated users can SELECT all active hitting partners (for directory)

## Manual Browser Test

1. Open browser DevTools → Network tab
2. Login as Student A
3. Try to make Supabase queries for Student B's data using browser console:
```javascript
// This should fail with RLS error
const { data, error } = await supabase
  .from('lessons')
  .select('*')
  .eq('student_id', 'student-b-uuid-here')

console.log(error) // Should show RLS policy violation
```



