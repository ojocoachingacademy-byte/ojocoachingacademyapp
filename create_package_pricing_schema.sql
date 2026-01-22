-- ═══════════════════════════════════════════════════════════════
-- PACKAGE PRICING TIERS AND STUDENT PACKAGE HISTORY TRACKING
-- ═══════════════════════════════════════════════════════════════
-- This script creates:
-- 1. Package tiers (legacy, new, teachme, custom)
-- 2. Package prices for each tier
-- 3. Student package history tracking
-- 4. Auto-update triggers for lesson completion
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: CREATE PACKAGE TIERS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS package_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL UNIQUE, -- 'legacy', 'new', 'teachme', 'custom'
  display_name TEXT NOT NULL, -- 'Legacy Pricing', 'New Pricing (2025)', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing tiers
INSERT INTO package_tiers (tier_name, display_name) VALUES
  ('legacy', 'Legacy Pricing (Current Students)'),
  ('new', 'New Pricing (2025+)'),
  ('teachme', 'TeachMe.to ($60/lesson)'),
  ('custom', 'Custom Pricing')
ON CONFLICT (tier_name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: CREATE PACKAGE PRICES TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS package_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID REFERENCES package_tiers(id) ON DELETE CASCADE,
  package_size INTEGER NOT NULL, -- 1, 5, 10, 20
  num_people INTEGER NOT NULL DEFAULT 1, -- 1 or 2 (semi-private)
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tier_id, package_size, num_people)
);

-- Insert legacy pricing
INSERT INTO package_prices (tier_id, package_size, num_people, price)
SELECT 
  (SELECT id FROM package_tiers WHERE tier_name = 'legacy'),
  package_size,
  num_people,
  price
FROM (VALUES
  -- 1 person
  (1, 1, 70.00),
  (5, 1, 325.00),
  (10, 1, 600.00),
  (20, 1, 1000.00),
  -- 2 people (semi-private)
  (1, 2, 90.00),
  (5, 2, 400.00),
  (10, 2, 700.00)
) AS legacy_prices(package_size, num_people, price)
ON CONFLICT (tier_id, package_size, num_people) DO NOTHING;

-- Insert new pricing (2025+)
INSERT INTO package_prices (tier_id, package_size, num_people, price)
SELECT 
  (SELECT id FROM package_tiers WHERE tier_name = 'new'),
  package_size,
  num_people,
  price
FROM (VALUES
  -- 1 person
  (1, 1, 100.00),
  (5, 1, 450.00),
  (20, 1, 1400.00),
  -- 2 people (semi-private)
  (1, 2, 120.00),
  (5, 2, 500.00),
  (20, 2, 1600.00)
) AS new_prices(package_size, num_people, price)
ON CONFLICT (tier_id, package_size, num_people) DO NOTHING;

-- Insert TeachMe.to pricing (per lesson)
INSERT INTO package_prices (tier_id, package_size, num_people, price)
SELECT 
  (SELECT id FROM package_tiers WHERE tier_name = 'teachme'),
  1, -- Only 1-lesson "packages"
  1, -- Always 1 person
  60.00
ON CONFLICT (tier_id, package_size, num_people) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: ADD PRICING TIER TO STUDENTS TABLE
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS pricing_tier_id UUID REFERENCES package_tiers(id);

-- Set all existing students to legacy pricing by default
UPDATE students 
SET pricing_tier_id = (SELECT id FROM package_tiers WHERE tier_name = 'legacy')
WHERE pricing_tier_id IS NULL;

-- Set JeanMarie Levy to new pricing (update with actual student ID)
-- UPDATE students 
-- SET pricing_tier_id = (SELECT id FROM package_tiers WHERE tier_name = 'new')
-- WHERE id = 'JEANMARIE_LEVY_ID_HERE';

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: CREATE STUDENT PACKAGES TABLE (HISTORY)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS student_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  package_size INTEGER NOT NULL,
  price_paid DECIMAL(10,2) NOT NULL,
  price_per_lesson DECIMAL(10,2) NOT NULL, -- Calculated: price_paid / package_size
  lessons_purchased INTEGER NOT NULL,
  lessons_used INTEGER DEFAULT 0,
  lessons_remaining INTEGER GENERATED ALWAYS AS (lessons_purchased - lessons_used) STORED,
  purchased_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true, -- false when package is completed
  is_semi_private BOOLEAN DEFAULT false,
  semi_private_partner_id UUID REFERENCES students(id), -- If semi-private, link to partner
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_packages_student_id ON student_packages(student_id);
CREATE INDEX IF NOT EXISTS idx_student_packages_active ON student_packages(student_id, is_active);

-- ═══════════════════════════════════════════════════════════════
-- STEP 5: ADD CURRENT PACKAGE REFERENCE TO STUDENTS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE students
ADD COLUMN IF NOT EXISTS current_package_id UUID REFERENCES student_packages(id);

-- ═══════════════════════════════════════════════════════════════
-- STEP 6: CREATE FUNCTION TO AUTO-UPDATE PACKAGE ON LESSON COMPLETION
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_package_on_lesson_completion()
RETURNS TRIGGER AS $$
DECLARE
  package_to_update UUID;
BEGIN
  -- When a lesson is marked as completed, deduct from current package
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Find student's active package (oldest first)
    SELECT id INTO package_to_update
    FROM student_packages
    WHERE student_id = NEW.student_id
      AND is_active = true
      AND lessons_used < lessons_purchased
    ORDER BY purchased_date ASC
    LIMIT 1;
    
    -- Update the package if found
    IF package_to_update IS NOT NULL THEN
      UPDATE student_packages
      SET 
        lessons_used = lessons_used + 1,
        is_active = CASE 
          WHEN lessons_used + 1 >= lessons_purchased THEN false 
          ELSE true 
        END,
        updated_at = NOW()
      WHERE id = package_to_update;
      
      -- If package is now complete, clear current_package_id
      IF (SELECT lessons_used >= lessons_purchased FROM student_packages WHERE id = package_to_update) THEN
        UPDATE students
        SET current_package_id = NULL
        WHERE id = NEW.student_id
          AND current_package_id = package_to_update;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on lessons table
DROP TRIGGER IF EXISTS trigger_update_package_on_lesson ON lessons;
CREATE TRIGGER trigger_update_package_on_lesson
  AFTER UPDATE OF status ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_package_on_lesson_completion();

-- ═══════════════════════════════════════════════════════════════
-- STEP 7: CREATE VIEW FOR STUDENT PACKAGE SUMMARY
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW student_package_summary AS
SELECT 
  s.id as student_id,
  p.full_name,
  pt.display_name as pricing_tier,
  sp.id as current_package_id,
  sp.package_size,
  sp.price_paid,
  sp.price_per_lesson,
  sp.lessons_used,
  sp.lessons_remaining,
  sp.purchased_date,
  -- Lifetime stats
  s.total_revenue,
  s.total_lessons_purchased,
  CASE 
    WHEN s.total_lessons_purchased > 0 
    THEN ROUND(s.total_revenue / s.total_lessons_purchased, 2)
    ELSE 0 
  END as lifetime_price_per_lesson,
  s.lesson_credits
FROM students s
LEFT JOIN profiles p ON s.id = p.id
LEFT JOIN package_tiers pt ON s.pricing_tier_id = pt.id
LEFT JOIN student_packages sp ON s.current_package_id = sp.id;

-- ═══════════════════════════════════════════════════════════════
-- STEP 8: RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE package_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_packages ENABLE ROW LEVEL SECURITY;

-- Coach can view all
CREATE POLICY "Coaches can view package tiers" ON package_tiers
  FOR SELECT USING (true);

CREATE POLICY "Coaches can view package prices" ON package_prices
  FOR SELECT USING (true);

CREATE POLICY "Coaches can manage student packages" ON student_packages
  FOR ALL USING (true);

-- Students can view their own packages
CREATE POLICY "Students can view own packages" ON student_packages
  FOR SELECT USING (
    student_id = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (RUN THESE TO TEST)
-- ═══════════════════════════════════════════════════════════════

-- View all pricing tiers and prices
SELECT 
  pt.display_name,
  pp.package_size,
  pp.num_people,
  pp.price,
  ROUND(pp.price / pp.package_size, 2) as price_per_lesson
FROM package_prices pp
JOIN package_tiers pt ON pp.tier_id = pt.id
ORDER BY pt.tier_name, pp.num_people, pp.package_size;

-- View student package summary
SELECT * FROM student_package_summary LIMIT 10;
