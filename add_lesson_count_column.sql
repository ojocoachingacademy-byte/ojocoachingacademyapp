-- Add lesson_count column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS lesson_count INTEGER DEFAULT 0;

-- Update existing students with their lesson count
UPDATE students
SET lesson_count = (
  SELECT COUNT(*)
  FROM lessons
  WHERE lessons.student_id = students.id
  AND lessons.status = 'completed'
);

-- Create function to auto-update lesson_count when lessons are completed
CREATE OR REPLACE FUNCTION update_student_lesson_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE students
    SET lesson_count = lesson_count + 1
    WHERE id = NEW.student_id;
  ELSIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    UPDATE students
    SET lesson_count = GREATEST(lesson_count - 1, 0)
    WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_lesson_count ON lessons;
CREATE TRIGGER trigger_update_lesson_count
AFTER UPDATE ON lessons
FOR EACH ROW
EXECUTE FUNCTION update_student_lesson_count();

-- Note: current_package_size is not needed as we're using student_packages table
-- The price_per_lesson is already available in student_packages table
