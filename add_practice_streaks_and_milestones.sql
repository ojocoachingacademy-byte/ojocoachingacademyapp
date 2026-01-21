-- Add practice streak tracking and lesson milestone tracking to students table

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS current_practice_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_practice_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_practice_streak_updated TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shown_lesson_milestones INTEGER[] DEFAULT '{}';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_students_practice_streak 
ON students(current_practice_streak) 
WHERE current_practice_streak > 0;

-- Add comments for documentation
COMMENT ON COLUMN students.current_practice_streak IS 'Current consecutive weeks of practice plan completion';
COMMENT ON COLUMN students.longest_practice_streak IS 'Longest streak of consecutive weeks of practice completion';
COMMENT ON COLUMN students.last_practice_streak_updated IS 'Timestamp when streak was last calculated';
COMMENT ON COLUMN students.shown_lesson_milestones IS 'Array of lesson milestone numbers (5, 10, 15, 20, 25, 30) that have been shown to the student';
