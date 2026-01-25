-- Script to set all existing students to is_active = true
-- Run this in your Supabase SQL Editor

-- Update all students where is_active is NULL or false to true
-- This ensures all existing students are available for pairing
UPDATE students
SET is_active = true
WHERE is_active IS NULL OR is_active = false;

-- Verify the update
SELECT 
  COUNT(*) as total_students,
  COUNT(*) FILTER (WHERE is_active = true) as active_students,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_students,
  COUNT(*) FILTER (WHERE is_active IS NULL) as null_active
FROM students;
