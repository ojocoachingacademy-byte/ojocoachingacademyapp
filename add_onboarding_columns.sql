-- Add onboarding fields to students table
-- Run this in Supabase SQL Editor

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE students
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_students_onboarding_completed 
ON students(onboarding_completed);


