-- Student Focus Areas Table
-- Allows coaches to manually add and manage areas for students to focus on
-- These are displayed on the student dashboard alongside auto-extracted areas from feedback

CREATE TABLE IF NOT EXISTS student_focus_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  area_text TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id), -- Track which coach created it
  CONSTRAINT area_text_not_empty CHECK (length(trim(area_text)) > 0)
);

-- Enable RLS
ALTER TABLE student_focus_areas ENABLE ROW LEVEL SECURITY;

-- Students can read their own focus areas (only unresolved ones for display)
CREATE POLICY "Students can read own focus areas" 
ON student_focus_areas 
FOR SELECT 
TO authenticated 
USING (student_id = auth.uid());

-- Coaches can read all focus areas
CREATE POLICY "Coaches can read all focus areas" 
ON student_focus_areas 
FOR SELECT 
TO authenticated 
USING (true);

-- Coaches can insert focus areas
CREATE POLICY "Coaches can create focus areas" 
ON student_focus_areas 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Coaches can update focus areas
CREATE POLICY "Coaches can update focus areas" 
ON student_focus_areas 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Coaches can delete focus areas
CREATE POLICY "Coaches can delete focus areas" 
ON student_focus_areas 
FOR DELETE 
TO authenticated 
USING (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_student_focus_areas_student_id 
ON student_focus_areas(student_id);

CREATE INDEX IF NOT EXISTS idx_student_focus_areas_is_resolved 
ON student_focus_areas(is_resolved);

CREATE INDEX IF NOT EXISTS idx_student_focus_areas_student_resolved 
ON student_focus_areas(student_id, is_resolved);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_focus_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Auto-set resolved_at when is_resolved changes from false to true
  IF NEW.is_resolved = TRUE AND (OLD.is_resolved IS NULL OR OLD.is_resolved = FALSE) THEN
    NEW.resolved_at = NOW();
  END IF;
  -- Clear resolved_at when marking as unresolved
  IF NEW.is_resolved = FALSE AND OLD.is_resolved = TRUE THEN
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at and resolved_at
CREATE TRIGGER update_student_focus_areas_updated_at 
BEFORE UPDATE ON student_focus_areas 
FOR EACH ROW 
EXECUTE FUNCTION update_focus_areas_updated_at();

-- Add comment to table
COMMENT ON TABLE student_focus_areas IS 'Manually curated focus areas for students, managed by coaches';
COMMENT ON COLUMN student_focus_areas.area_text IS 'The text describing the area to focus on';
COMMENT ON COLUMN student_focus_areas.is_resolved IS 'Whether this focus area has been resolved/completed';
COMMENT ON COLUMN student_focus_areas.resolved_at IS 'Timestamp when the area was marked as resolved';
COMMENT ON COLUMN student_focus_areas.created_by IS 'UUID of the coach who created this focus area';
