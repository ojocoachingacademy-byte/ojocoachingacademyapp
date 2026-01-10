-- Verify RLS Policies are Correctly Set
-- Run this in Supabase SQL Editor to check all RLS policies

-- Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'students', 'lessons', 'hitting_partners', 'development_focus_areas')
ORDER BY tablename;

-- List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'students', 'lessons', 'hitting_partners', 'development_focus_areas')
ORDER BY tablename, policyname;

-- Verify specific policies exist
-- Profiles
SELECT 'profiles' as table_name, policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Students
SELECT 'students' as table_name, policyname, cmd
FROM pg_policies
WHERE tablename = 'students'
ORDER BY policyname;

-- Lessons
SELECT 'lessons' as table_name, policyname, cmd
FROM pg_policies
WHERE tablename = 'lessons'
ORDER BY policyname;

-- Hitting Partners
SELECT 'hitting_partners' as table_name, policyname, cmd
FROM pg_policies
WHERE tablename = 'hitting_partners'
ORDER BY policyname;

-- Development Focus Areas (if table exists)
SELECT 'development_focus_areas' as table_name, policyname, cmd
FROM pg_policies
WHERE tablename = 'development_focus_areas'
ORDER BY policyname;




