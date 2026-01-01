-- Add development_plan_notes column to students table
-- Run this in Supabase SQL Editor

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS development_plan_notes TEXT;

-- Optional: Add a comment to describe the column
COMMENT ON COLUMN students.development_plan_notes IS 'Coach notes and overall assessment for the student development plan';

