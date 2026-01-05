-- Testimonials Automation: Database Triggers and Functions
-- Run this in your Supabase SQL Editor after running supabase_testimonials_schema.sql

-- Function to automatically create testimonial request when student completes 5 lessons
CREATE OR REPLACE FUNCTION auto_request_testimonial()
RETURNS TRIGGER AS $$
DECLARE
  completed_lessons_count INTEGER;
  student_exists BOOLEAN;
  existing_request_id UUID;
BEGIN
  -- Only trigger on lesson status change to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Count completed lessons for this student
    SELECT COUNT(*) INTO completed_lessons_count
    FROM lessons
    WHERE student_id = NEW.student_id
      AND status = 'completed';

    -- Check if student has exactly 5, 10, 15, etc. completed lessons (milestones)
    IF completed_lessons_count >= 5 AND completed_lessons_count % 5 = 0 THEN
      -- Check if student exists
      SELECT EXISTS(SELECT 1 FROM students WHERE id = NEW.student_id) INTO student_exists;
      
      IF student_exists THEN
        -- Check if there's already a pending request for this milestone
        SELECT id INTO existing_request_id
        FROM testimonial_requests
        WHERE student_id = NEW.student_id
          AND lesson_count_at_request = completed_lessons_count
          AND status IN ('pending', 'submitted')
        LIMIT 1;

        -- Only create request if one doesn't exist for this milestone
        IF existing_request_id IS NULL THEN
          -- Check if student already submitted a testimonial
          IF NOT EXISTS (
            SELECT 1 FROM testimonials WHERE student_id = NEW.student_id LIMIT 1
          ) THEN
            -- Create testimonial request
            INSERT INTO testimonial_requests (
              student_id,
              lesson_count_at_request,
              status
            ) VALUES (
              NEW.student_id,
              completed_lessons_count,
              'pending'
            );
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on lessons table
DROP TRIGGER IF EXISTS trigger_auto_request_testimonial ON lessons;
CREATE TRIGGER trigger_auto_request_testimonial
  AFTER INSERT OR UPDATE OF status ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION auto_request_testimonial();

-- Function to get students eligible for testimonial requests
-- This can be called manually or via a scheduled job
CREATE OR REPLACE FUNCTION get_eligible_testimonial_students()
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  completed_lessons INTEGER,
  has_pending_request BOOLEAN,
  has_submitted_testimonial BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH student_lesson_counts AS (
    SELECT 
      s.id AS student_id,
      p.full_name AS student_name,
      p.email AS student_email,
      COUNT(l.id) FILTER (WHERE l.status = 'completed') AS completed_lessons
    FROM students s
    INNER JOIN profiles p ON p.id = s.id
    LEFT JOIN lessons l ON l.student_id = s.id
    WHERE s.is_active = true
    GROUP BY s.id, p.full_name, p.email
    HAVING COUNT(l.id) FILTER (WHERE l.status = 'completed') >= 5
  )
  SELECT 
    slc.student_id,
    slc.student_name,
    slc.student_email,
    slc.completed_lessons::INTEGER,
    EXISTS(
      SELECT 1 FROM testimonial_requests tr
      WHERE tr.student_id = slc.student_id
        AND tr.status = 'pending'
    ) AS has_pending_request,
    EXISTS(
      SELECT 1 FROM testimonials t
      WHERE t.student_id = slc.student_id
    ) AS has_submitted_testimonial
  FROM student_lesson_counts slc
  WHERE NOT EXISTS(
    SELECT 1 FROM testimonial_requests tr
    WHERE tr.student_id = slc.student_id
      AND tr.lesson_count_at_request = slc.completed_lessons
      AND tr.status IN ('pending', 'submitted')
  )
  AND NOT EXISTS(
    SELECT 1 FROM testimonials t
    WHERE t.student_id = slc.student_id
  )
  ORDER BY slc.completed_lessons DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to create testimonial requests for eligible students
CREATE OR REPLACE FUNCTION create_testimonial_requests_batch()
RETURNS TABLE (
  requests_created INTEGER,
  students_processed INTEGER
) AS $$
DECLARE
  eligible_student RECORD;
  created_count INTEGER := 0;
  processed_count INTEGER := 0;
BEGIN
  FOR eligible_student IN 
    SELECT * FROM get_eligible_testimonial_students()
  LOOP
    processed_count := processed_count + 1;
    
    -- Create request
    INSERT INTO testimonial_requests (
      student_id,
      lesson_count_at_request,
      status
    ) VALUES (
      eligible_student.student_id,
      eligible_student.completed_lessons,
      'pending'
    );
    
    created_count := created_count + 1;
  END LOOP;

  RETURN QUERY SELECT created_count, processed_count;
END;
$$ LANGUAGE plpgsql;

