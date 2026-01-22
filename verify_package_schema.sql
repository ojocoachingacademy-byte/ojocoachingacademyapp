-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES FOR PACKAGE PRICING SCHEMA
-- Run these in Supabase SQL Editor to verify everything worked
-- ═══════════════════════════════════════════════════════════════

-- 1. Check package tiers were created
SELECT 
  tier_name,
  display_name,
  is_active,
  created_at
FROM package_tiers
ORDER BY tier_name;

-- Expected: 4 rows (legacy, new, teachme, custom)

-- ═══════════════════════════════════════════════════════════════

-- 2. Check package prices were inserted
SELECT 
  pt.display_name as tier,
  pp.package_size,
  pp.num_people,
  pp.price,
  ROUND(pp.price / pp.package_size, 2) as price_per_lesson
FROM package_prices pp
JOIN package_tiers pt ON pp.tier_id = pt.id
ORDER BY pt.tier_name, pp.num_people, pp.package_size;

-- Expected: 
-- Legacy: 7 rows (1,5,10,20 for 1 person; 1,5,10 for 2 people)
-- New: 5 rows (1,5,20 for 1 person; 1,5,20 for 2 people)
-- TeachMe: 1 row (1 lesson, 1 person, $60)

-- ═══════════════════════════════════════════════════════════════

-- 3. Check students have pricing_tier_id assigned
SELECT 
  COUNT(*) as total_students,
  COUNT(pricing_tier_id) as students_with_tier,
  COUNT(*) - COUNT(pricing_tier_id) as students_without_tier
FROM students;

-- Expected: All students should have pricing_tier_id (set to legacy)

-- ═══════════════════════════════════════════════════════════════

-- 4. Check students table has new columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name IN ('pricing_tier_id', 'current_package_id')
ORDER BY column_name;

-- Expected: 2 rows showing UUID columns

-- ═══════════════════════════════════════════════════════════════

-- 5. Check student_packages table exists
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'student_packages'
ORDER BY ordinal_position;

-- Expected: Should show all columns (id, student_id, package_size, etc.)

-- ═══════════════════════════════════════════════════════════════

-- 6. Check trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_package_on_lesson';

-- Expected: 1 row showing the trigger

-- ═══════════════════════════════════════════════════════════════

-- 7. Check view exists and works
SELECT * FROM student_package_summary LIMIT 5;

-- Expected: Should return rows with student info and package details

-- ═══════════════════════════════════════════════════════════════

-- 8. Sample query: View pricing for a specific tier
SELECT 
  pt.display_name,
  pp.package_size || ' lessons' as package,
  CASE 
    WHEN pp.num_people = 1 THEN 'Individual'
    ELSE 'Semi-Private (2 people)'
  END as type,
  '$' || pp.price::text as total_price,
  '$' || ROUND(pp.price / pp.package_size, 2)::text as per_lesson
FROM package_prices pp
JOIN package_tiers pt ON pp.tier_id = pt.id
WHERE pt.tier_name = 'legacy'
ORDER BY pp.num_people, pp.package_size;
