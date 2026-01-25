-- Diagnostic script to check why pairing might not be working
-- Run this in your Supabase SQL Editor to see the current state

-- Check total students and their active status
SELECT 
  COUNT(*) as total_students,
  COUNT(*) FILTER (WHERE is_active = true) as active_students,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_students,
  COUNT(*) FILTER (WHERE is_active IS NULL) as null_active_students
FROM students;

-- Check how many students are already paired
SELECT 
  COUNT(*) as total_paired_students,
  COUNT(DISTINCT paired_with_id) as unique_pairs
FROM students
WHERE paired_with_id IS NOT NULL;

-- Show all active students that are NOT paired (these should be available for pairing)
SELECT 
  s.id,
  p.full_name,
  p.email,
  s.is_active,
  s.paired_with_id,
  s.lesson_credits
FROM students s
LEFT JOIN profiles p ON s.id = p.id
WHERE (s.is_active = true OR s.is_active IS NULL)
  AND s.paired_with_id IS NULL
ORDER BY p.full_name;

-- Show students that are inactive (these won't show in pairing modal)
SELECT 
  s.id,
  p.full_name,
  p.email,
  s.is_active,
  s.paired_with_id
FROM students s
LEFT JOIN profiles p ON s.id = p.id
WHERE s.is_active = false
ORDER BY p.full_name
LIMIT 20;
