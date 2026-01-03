-- Development Focus Areas Table
-- Tracks student skill development based on Mastering Fundamentals framework

CREATE TABLE IF NOT EXISTS development_focus_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  current_level INTEGER NOT NULL CHECK (current_level >= 1 AND current_level <= 5),
  target_level INTEGER NOT NULL CHECK (target_level >= 1 AND target_level <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, skill_name)
);

-- Enable RLS
ALTER TABLE development_focus_areas ENABLE ROW LEVEL SECURITY;

-- Students can read their own development plans
CREATE POLICY "Students can read own development plan" 
ON development_focus_areas 
FOR SELECT 
TO authenticated 
USING (student_id = auth.uid());

-- Coaches can read all development plans
CREATE POLICY "Coaches can read all development plans" 
ON development_focus_areas 
FOR SELECT 
TO authenticated 
USING (true);

-- Coaches can insert development plans
CREATE POLICY "Coaches can create development plans" 
ON development_focus_areas 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Coaches can update development plans
CREATE POLICY "Coaches can update development plans" 
ON development_focus_areas 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Coaches can delete development plans
CREATE POLICY "Coaches can delete development plans" 
ON development_focus_areas 
FOR DELETE 
TO authenticated 
USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_development_focus_areas_student_id 
ON development_focus_areas(student_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_development_focus_areas_updated_at 
BEFORE UPDATE ON development_focus_areas 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();



