-- Script to set ONLY the students shown in the UI to is_active = true
-- All other students will be set to is_active = false
-- Run this in your Supabase SQL Editor

-- First, set ALL students to inactive
UPDATE students
SET is_active = false;

-- Then, set only the specific students to active based on their names
-- These are the students visible in the coach's students page
UPDATE students
SET is_active = true
WHERE id IN (
  SELECT s.id
  FROM students s
  JOIN profiles p ON s.id = p.id
  WHERE LOWER(TRIM(p.full_name)) IN (
    'amrita',
    'angelie hoang',
    'ariel rampey',
    'chang xue',
    'david',
    'garrett whitley',
    'gideon',
    'hanna chang',
    'holden berger',
    'ivy ojo',
    'jeanmarie levy',
    'kaitlin morain',
    'karen ding',
    'kathy and kelly',  -- This might be a single record for the pair
    'kathy reyes',
    'kelly reyes',
    'matt lock',
    'ryan',
    'ryan bresnahan',
    'tharak krishnan',
    'todd zuccarino',
    'tom',
    'yang liang'
  )
);

-- Verify the update
SELECT 
  COUNT(*) as total_students,
  COUNT(*) FILTER (WHERE is_active = true) as active_students,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_students
FROM students;

-- Show which students are now active
SELECT 
  p.full_name,
  s.is_active,
  s.lesson_credits,
  p.email
FROM students s
JOIN profiles p ON s.id = p.id
WHERE s.is_active = true
ORDER BY p.full_name;
