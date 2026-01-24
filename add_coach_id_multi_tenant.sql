-- Multi-Tenant Coach Implementation
-- This script adds coach_id columns to enable separate coach environments

-- Step 1: Add coach_id to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 2: Add coach_id to lessons table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 3: Add coach_id to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 4: Add coach_id to payment_transactions
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 5: Add coach_id to lesson_transactions
ALTER TABLE lesson_transactions 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 6: Add coach_id to student_packages
ALTER TABLE student_packages 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 7: Add coach_id to practice_plans
ALTER TABLE practice_plans 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 8: Add coach_id to development_focus_areas
ALTER TABLE development_focus_areas 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 9: Add coach_id to student_focus_areas
ALTER TABLE student_focus_areas 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 10: Add coach_id to testimonial_requests
ALTER TABLE testimonial_requests 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 11: Add coach_id to testimonials
ALTER TABLE testimonials 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 12: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_coach_id ON students(coach_id);
CREATE INDEX IF NOT EXISTS idx_lessons_coach_id ON lessons(coach_id);
CREATE INDEX IF NOT EXISTS idx_notifications_coach_id ON notifications(coach_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_coach_id ON payment_transactions(coach_id);
CREATE INDEX IF NOT EXISTS idx_lesson_transactions_coach_id ON lesson_transactions(coach_id);
CREATE INDEX IF NOT EXISTS idx_student_packages_coach_id ON student_packages(coach_id);
CREATE INDEX IF NOT EXISTS idx_practice_plans_coach_id ON practice_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_development_focus_areas_coach_id ON development_focus_areas(coach_id);
CREATE INDEX IF NOT EXISTS idx_student_focus_areas_coach_id ON student_focus_areas(coach_id);
CREATE INDEX IF NOT EXISTS idx_testimonial_requests_coach_id ON testimonial_requests(coach_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_coach_id ON testimonials(coach_id);

-- Step 13: Assign existing data to your coach account
-- IMPORTANT: Replace 'YOUR_COACH_USER_ID' with your actual coach profile ID
-- You can find it with: SELECT id FROM profiles WHERE account_type = 'coach' LIMIT 1;

-- Update existing students (uncomment and replace YOUR_COACH_USER_ID)
-- UPDATE students SET coach_id = 'YOUR_COACH_USER_ID' WHERE coach_id IS NULL;

-- Update existing lessons to match their student's coach
UPDATE lessons l
SET coach_id = s.coach_id
FROM students s
WHERE l.student_id = s.id AND l.coach_id IS NULL;

-- Update existing notifications for coaches
UPDATE notifications n
SET coach_id = p.id
FROM profiles p
WHERE n.user_id = p.id 
  AND p.account_type = 'coach' 
  AND n.coach_id IS NULL;

-- Update other tables based on student relationships
UPDATE payment_transactions pt
SET coach_id = s.coach_id
FROM students s
WHERE pt.student_id = s.id AND pt.coach_id IS NULL;

UPDATE lesson_transactions lt
SET coach_id = s.coach_id
FROM students s
WHERE lt.student_id = s.id AND lt.coach_id IS NULL;

UPDATE student_packages sp
SET coach_id = s.coach_id
FROM students s
WHERE sp.student_id = s.id AND sp.coach_id IS NULL;

UPDATE practice_plans pp
SET coach_id = s.coach_id
FROM students s
WHERE pp.student_id = s.id AND pp.coach_id IS NULL;

UPDATE development_focus_areas dfa
SET coach_id = s.coach_id
FROM students s
WHERE dfa.student_id = s.id AND dfa.coach_id IS NULL;

UPDATE student_focus_areas sfa
SET coach_id = s.coach_id
FROM students s
WHERE sfa.student_id = s.id AND sfa.coach_id IS NULL;

UPDATE testimonial_requests tr
SET coach_id = s.coach_id
FROM students s
WHERE tr.student_id = s.id AND tr.coach_id IS NULL;

UPDATE testimonials t
SET coach_id = s.coach_id
FROM students s
WHERE t.student_id = s.id AND t.coach_id IS NULL;

-- Step 14: Add RLS policies for data isolation
-- Note: Adjust these based on your existing RLS policies

-- Students: Coaches can only see their own students
DROP POLICY IF EXISTS "coaches_view_own_students" ON students;
CREATE POLICY "coaches_view_own_students" ON students
  FOR SELECT
  USING (
    coach_id IN (
      SELECT id FROM profiles 
      WHERE id = auth.uid() AND account_type = 'coach'
    )
  );

-- Lessons: Coaches can only see their own lessons
DROP POLICY IF EXISTS "coaches_view_own_lessons" ON lessons;
CREATE POLICY "coaches_view_own_lessons" ON lessons
  FOR SELECT
  USING (
    coach_id IN (
      SELECT id FROM profiles 
      WHERE id = auth.uid() AND account_type = 'coach'
    )
  );

-- Notifications: Coaches can only see their own notifications
DROP POLICY IF EXISTS "coaches_view_own_notifications" ON notifications;
CREATE POLICY "coaches_view_own_notifications" ON notifications
  FOR SELECT
  USING (
    coach_id IN (
      SELECT id FROM profiles 
      WHERE id = auth.uid() AND account_type = 'coach'
    )
  );

-- Add similar policies for other tables as needed
