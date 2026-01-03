-- Add development_plan and development_plan_notes columns to students table
-- Run this in Supabase SQL Editor

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS development_plan JSONB,
ADD COLUMN IF NOT EXISTS development_plan_notes TEXT;

-- Add a comment to describe the columns
COMMENT ON COLUMN students.development_plan IS 'JSON object containing skill assessments, goals, and motivation data';
COMMENT ON COLUMN students.development_plan_notes IS 'Coach notes about the student development plan';



