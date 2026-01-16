-- Add practice plan columns to lessons table
-- Replaces the old lesson_homework table approach with direct lesson fields

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS practice_plan TEXT,
ADD COLUMN IF NOT EXISTS practice_plan_time_estimate INTEGER,
ADD COLUMN IF NOT EXISTS practice_plan_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS practice_plan_completed_at TIMESTAMP;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lessons_student_practice 
ON lessons(student_id, practice_plan_completed);

-- Add comment for documentation
COMMENT ON COLUMN lessons.practice_plan IS 'Weekly practice focus assigned by coach - ONE clear item per week';
COMMENT ON COLUMN lessons.practice_plan_time_estimate IS 'Estimated time in minutes (5-30)';
COMMENT ON COLUMN lessons.practice_plan_completed IS 'Whether student has marked this practice plan as complete';
COMMENT ON COLUMN lessons.practice_plan_completed_at IS 'Timestamp when student marked practice plan as complete';


