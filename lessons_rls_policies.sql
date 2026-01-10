-- RLS Policies for lessons table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- Copy and paste this entire file, then click "Run"

-- Enable RLS on lessons table (if not already enabled)
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (optional - only if you want to recreate them)
-- DROP POLICY IF EXISTS "Coaches can create lessons" ON lessons;
-- DROP POLICY IF EXISTS "Students can read their own lessons" ON lessons;
-- DROP POLICY IF EXISTS "Coaches can read all lessons" ON lessons;
-- DROP POLICY IF EXISTS "Authenticated users can update lessons" ON lessons;

-- Allow authenticated users to insert lessons (coaches create lessons)
CREATE POLICY "Coaches can create lessons"
ON lessons
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow students to read their own lessons
CREATE POLICY "Students can read their own lessons"
ON lessons
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Allow authenticated users to read all lessons (coaches need to see all)
CREATE POLICY "Coaches can read all lessons"
ON lessons
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update lessons (coaches update lesson plans, students update learnings)
CREATE POLICY "Authenticated users can update lessons"
ON lessons
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);




