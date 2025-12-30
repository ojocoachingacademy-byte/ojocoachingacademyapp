-- RLS Policy Fix for profiles table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if it exists (optional, adjust as needed)
-- DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can create own profile" 
ON profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Optional: Also create policies for SELECT and UPDATE if needed
-- Allow users to read their own profile
CREATE POLICY "Users can read their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow authenticated users to read all profiles (for coaches to see student profiles)
CREATE POLICY "Coaches can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Similar policies for students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own student record
CREATE POLICY "Users can create own student record" 
ON students 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read their own student record"
ON students
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow authenticated users to read all students (for coaches)
CREATE POLICY "Coaches can read all students"
ON students
FOR SELECT
TO authenticated
USING (true);

-- Similar policies for hitting_partners table
ALTER TABLE hitting_partners ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own hitting partner record
CREATE POLICY "Users can create own hitting partner record"  
ON hitting_partners
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read their own hitting partner record"
ON hitting_partners
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- RLS Policies for lessons table
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

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

