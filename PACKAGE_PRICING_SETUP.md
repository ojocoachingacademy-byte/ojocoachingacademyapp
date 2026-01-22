# Package Pricing Schema Setup Guide

## Overview
This schema creates a comprehensive package pricing system with:
- Multiple pricing tiers (Legacy, New 2025+, TeachMe.to, Custom)
- Package price management
- Student package purchase history
- Automatic package deduction on lesson completion

## Setup Instructions

### Step 1: Run the SQL Script
1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `create_package_pricing_schema.sql`
3. Paste into SQL Editor
4. Click "Run" to execute

### Step 2: Verify Tables Created
Run these queries to verify:

```sql
-- Check package tiers
SELECT * FROM package_tiers;

-- Check package prices
SELECT 
  pt.display_name,
  pp.package_size,
  pp.num_people,
  pp.price,
  ROUND(pp.price / pp.package_size, 2) as price_per_lesson
FROM package_prices pp
JOIN package_tiers pt ON pp.tier_id = pt.id
ORDER BY pt.tier_name, pp.num_people, pp.package_size;

-- Check students have pricing tier assigned
SELECT 
  p.full_name,
  pt.display_name as pricing_tier
FROM students s
LEFT JOIN profiles p ON s.id = p.id
LEFT JOIN package_tiers pt ON s.pricing_tier_id = pt.id
LIMIT 10;
```

### Step 3: Verify Schema Structure
Check that these tables exist:
- ✅ `package_tiers` - 4 tiers (legacy, new, teachme, custom)
- ✅ `package_prices` - All pricing combinations
- ✅ `student_packages` - Package purchase history
- ✅ `students.pricing_tier_id` - Column added
- ✅ `students.current_package_id` - Column added

### Step 4: Test the View
```sql
SELECT * FROM student_package_summary LIMIT 10;
```

## Pricing Tiers

### Legacy Pricing (Current Students)
- 1 lesson: $70
- 5 lessons: $325 ($65/lesson)
- 10 lessons: $600 ($60/lesson)
- 20 lessons: $1000 ($50/lesson)
- Semi-private: +$20-30 per lesson

### New Pricing (2025+)
- 1 lesson: $100
- 5 lessons: $450 ($90/lesson)
- 20 lessons: $1400 ($70/lesson)
- Semi-private: +$20 per lesson

### TeachMe.to
- Per lesson: $60 (no packages)

## Next Steps (Part 2)
After verifying the schema works:
1. Update UI to show pricing tiers
2. Create package purchase flow
3. Display package history
4. Show current package status
