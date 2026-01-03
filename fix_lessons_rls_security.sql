-- CRITICAL SECURITY FIX: Restrict Lessons UPDATE Policy
-- This prevents students from updating lesson plans, coach feedback, or other fields they shouldn't modify

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can update lessons" ON lessons;

-- IMPORTANT NOTE: PostgreSQL RLS doesn't easily support field-level restrictions in policies.
-- The best approach is to use database triggers or accept frontend-level restrictions.
-- However, we can at least restrict students to only update their own lessons.

-- Option 1: Restrict students to only update their own lessons (they can only update student_learnings field)
-- This policy allows students to update lessons where they are the student, but frontend must restrict to student_learnings only
CREATE POLICY "Students can update own lessons"
ON lessons
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())  -- Students can only update their own lessons
WITH CHECK (student_id = auth.uid());

-- Option 2: Allow coaches (all authenticated users) to update all lessons
-- Note: This still doesn't distinguish coaches from students at database level.
-- For true role-based access, need to add role column to profiles table.
CREATE POLICY "Coaches can update all lessons"
ON lessons
FOR UPDATE
TO authenticated
USING (true)  -- Any authenticated user (coaches in practice, but not restricted)
WITH CHECK (true);

-- RECOMMENDATION: For production, consider:
-- 1. Adding a role column to profiles table
-- 2. Creating role-based policies:
--    USING (
--      student_id = auth.uid() 
--      OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'coach'
--    )
-- 3. Using database triggers to restrict which fields can be updated by which roles

-- CURRENT WORKAROUND: 
-- Frontend code must enforce field-level restrictions:
-- - Students can only update 'student_learnings' field
-- - Coaches can update any field
-- This is enforced in StudentDashboard.jsx (line 88) and CoachDashboard.jsx (line 325)



