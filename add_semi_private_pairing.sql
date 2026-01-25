-- Migration: Add Semi-Private Pairing Support
-- Run this SQL in your Supabase SQL Editor

-- Add paired_with_id column to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS paired_with_id UUID REFERENCES students(id) ON DELETE SET NULL;

-- Add is_primary_for_pair column to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS is_primary_for_pair BOOLEAN DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_paired_with_id ON students(paired_with_id);

-- Add comment for documentation
COMMENT ON COLUMN students.paired_with_id IS 'ID of the student this student is paired with for semi-private lessons';
COMMENT ON COLUMN students.is_primary_for_pair IS 'True if this student is the primary account holder who purchases packages for the pair';
