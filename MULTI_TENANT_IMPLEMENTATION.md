# Multi-Tenant Coach Implementation Guide

This guide explains how to implement separate coach environments where each coach only sees their own students and data.

## Overview

Currently, the system assumes a single coach. To support multiple coaches with isolated data, we need to:

1. **Add `coach_id` to database tables** - Link all student-related data to a specific coach
2. **Update all queries** - Filter by the logged-in coach's ID
3. **Update notification system** - Use the logged-in coach's ID instead of fetching the first coach
4. **Update RLS policies** - Ensure data isolation at the database level
5. **Update student creation** - Automatically assign students to the creating coach

## Step 1: Database Schema Changes

### SQL Migration Script

Create a new file: `add_coach_id_multi_tenant.sql`

```sql
-- Add coach_id column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Set existing students to the first coach (you'll need to update this)
-- First, find your coach ID:
-- SELECT id FROM profiles WHERE account_type = 'coach' LIMIT 1;
-- Then update (replace 'YOUR_COACH_ID' with actual ID):
-- UPDATE students SET coach_id = 'YOUR_COACH_ID' WHERE coach_id IS NULL;

-- Add coach_id to lessons table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Update existing lessons to match their student's coach
UPDATE lessons l
SET coach_id = s.coach_id
FROM students s
WHERE l.student_id = s.id AND l.coach_id IS NULL;

-- Add coach_id to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Update existing notifications (assign to first coach or leave null for student notifications)
-- UPDATE notifications SET coach_id = (SELECT id FROM profiles WHERE account_type = 'coach' LIMIT 1) 
-- WHERE user_id IN (SELECT id FROM profiles WHERE account_type = 'coach') AND coach_id IS NULL;

-- Add coach_id to other related tables as needed:
-- - payment_transactions
-- - lesson_transactions  
-- - student_packages
-- - practice_plans
-- - development_focus_areas
-- - student_focus_areas
-- - testimonial_requests
-- - testimonials
-- - scheduled_notifications (in metadata)

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_coach_id ON students(coach_id);
CREATE INDEX IF NOT EXISTS idx_lessons_coach_id ON lessons(coach_id);
CREATE INDEX IF NOT EXISTS idx_notifications_coach_id ON notifications(coach_id);

-- Update RLS policies to filter by coach_id
-- (You'll need to adjust these based on your existing RLS policies)

-- Example RLS policy for students (coaches can only see their own students)
DROP POLICY IF EXISTS "Coaches can view their own students" ON students;
CREATE POLICY "Coaches can view their own students" ON students
  FOR SELECT
  USING (
    coach_id IN (
      SELECT id FROM profiles 
      WHERE id = auth.uid() AND account_type = 'coach'
    )
  );

-- Example RLS policy for lessons
DROP POLICY IF EXISTS "Coaches can view their own lessons" ON lessons;
CREATE POLICY "Coaches can view their own lessons" ON lessons
  FOR SELECT
  USING (
    coach_id IN (
      SELECT id FROM profiles 
      WHERE id = auth.uid() AND account_type = 'coach'
    )
  );
```

## Step 2: Update Code to Use Current Coach ID

### 2.1 Create a Utility to Get Current Coach ID

Update `src/utils/notifications.js`:

```javascript
import { supabase } from '../supabaseClient'
import { supabaseAdmin } from '../supabaseAdmin'

/**
 * Get the current logged-in coach's user ID
 * @returns {Promise<string|null>} Current coach user ID or null if not a coach
 */
export async function getCurrentCoachId() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('id', user.id)
      .single()

    if (error || !profile || profile.account_type !== 'coach') {
      return null
    }

    return profile.id
  } catch (error) {
    console.error('Error getting current coach ID:', error)
    return null
  }
}

/**
 * Get the coach user ID (legacy - gets first coach, use getCurrentCoachId instead)
 * @deprecated Use getCurrentCoachId() instead
 */
export async function getCoachUserId() {
  // For backward compatibility, try current user first
  const currentCoachId = await getCurrentCoachId()
  if (currentCoachId) return currentCoachId

  // Fallback to first coach (for system notifications)
  try {
    const { data: coachProfile, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('account_type', 'coach')
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching coach profile:', error)
      return null
    }

    return coachProfile?.id || null
  } catch (error) {
    console.error('Error in getCoachUserId:', error)
    return null
  }
}

/**
 * Create a notification for the current coach
 */
export async function createCoachNotification({ type, title, body, link = '/coach' }) {
  try {
    const coachUserId = await getCurrentCoachId()
    
    if (!coachUserId) {
      console.warn('No coach user found, skipping notification')
      return false
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: coachUserId,
        coach_id: coachUserId, // Add coach_id for multi-tenant support
        type: type,
        title: title,
        body: body,
        link: link,
        read: false
      })

    if (error) {
      console.error('Error creating coach notification:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in createCoachNotification:', error)
    return false
  }
}
```

### 2.2 Update All Student Queries

**File: `src/components/Coach/StudentsPage.jsx`**

```javascript
const fetchStudents = async () => {
  try {
    // Get current coach ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Verify user is a coach
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('id', user.id)
      .single()

    if (!profile || profile.account_type !== 'coach') {
      setLoading(false)
      return
    }

    const coachId = profile.id

    // Fetch only students for this coach
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('coach_id', coachId) // Filter by coach
      .order('id', { ascending: true })

    // ... rest of the function
  }
}
```

### 2.3 Update All Lesson Queries

**File: `src/components/Dashboard/CoachDashboard.jsx`**

```javascript
const fetchCoachData = async () => {
  try {
    // Get current coach ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('id', user.id)
      .single()

    if (!profile || profile.account_type !== 'coach') return
    const coachId = profile.id

    // Fetch students for this coach only
    const { data: studentsData, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('coach_id', coachId) // Filter by coach

    // Fetch lessons for this coach's students only
    const { data: lessonsData, error: lessonsError } = await supabaseAdmin
      .from('lessons')
      .select('*, students(*)')
      .eq('coach_id', coachId) // Filter by coach
      .order('lesson_date', { ascending: false })

    // ... rest of the function
  }
}
```

### 2.4 Update Student Creation

**File: `src/components/Coach/AddStudentModal.jsx`** (or wherever students are created)

```javascript
const handleAddStudent = async (formData) => {
  try {
    // Get current coach ID
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('id', user.id)
      .single()

    if (!profile || profile.account_type !== 'coach') {
      throw new Error('Not authorized')
    }

    const coachId = profile.id

    // Create student with coach_id
    const { data: student, error } = await supabaseAdmin
      .from('students')
      .insert({
        ...formData,
        coach_id: coachId // Assign to current coach
      })
      .select()
      .single()

    // ... rest of the function
  }
}
```

### 2.5 Update Lesson Creation

**File: `src/components/Dashboard/CoachDashboard.jsx`** (handleCreateLesson)

```javascript
const handleCreateLesson = async (e) => {
  e.preventDefault()
  
  // Get current coach ID
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, account_type')
    .eq('id', user.id)
    .single()

  if (!profile || profile.account_type !== 'coach') {
    showToast('Not authorized', 'error')
    return
  }

  const coachId = profile.id

  try {
    const { error: lessonError } = await supabaseAdmin
      .from('lessons')
      .insert([{
        student_id: selectedStudent,
        lesson_date: lessonDateTime.toISOString(),
        location: location || 'Colina Del Sol Park',
        status: 'scheduled',
        coach_id: coachId // Assign to current coach
      }])

    // ... rest of the function
  }
}
```

## Step 3: Update All Coach Components

You'll need to update these files to filter by coach_id:

1. **`src/components/Coach/StudentsPage.jsx`** - Filter students
2. **`src/components/Coach/StudentDetailPage.jsx`** - Verify student belongs to coach
3. **`src/components/Dashboard/CoachDashboard.jsx`** - Filter students and lessons
4. **`src/components/Coach/LessonsPage.jsx`** - Filter lessons
5. **`src/components/Coach/CalendarView.jsx`** - Filter lessons
6. **`src/components/Payments/FinancialDashboard.jsx`** - Filter financial data
7. **`src/components/Coach/EmailsManagement.jsx`** - Filter students for email selection
8. **`netlify/functions/calcom-webhook.js`** - Assign lessons to correct coach
9. **`netlify/functions/sync-google-calendar.js`** - Filter by coach
10. **All notification creation** - Use current coach ID

## Step 4: Create a Helper Hook

Create `src/hooks/useCurrentCoach.js`:

```javascript
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useCurrentCoach() {
  const [coachId, setCoachId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isCoach, setIsCoach] = useState(false)

  useEffect(() => {
    const fetchCoachId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, account_type')
          .eq('id', user.id)
          .single()

        if (error || !profile) {
          setLoading(false)
          return
        }

        if (profile.account_type === 'coach') {
          setIsCoach(true)
          setCoachId(profile.id)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching coach ID:', error)
        setLoading(false)
      }
    }

    fetchCoachId()
  }, [])

  return { coachId, isCoach, loading }
}
```

Then use it in components:

```javascript
import { useCurrentCoach } from '../../hooks/useCurrentCoach'

function StudentsPage() {
  const { coachId, isCoach, loading: coachLoading } = useCurrentCoach()
  
  const fetchStudents = async () => {
    if (!coachId) return
    
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('coach_id', coachId)
      // ...
  }
}
```

## Step 5: Migration Strategy

1. **Backup your database** before making changes
2. **Run the SQL migration** to add `coach_id` columns
3. **Assign existing data** to your coach account
4. **Update code** to use coach filtering
5. **Test thoroughly** with your existing account
6. **Create a second coach account** for testing
7. **Verify isolation** - ensure coaches can't see each other's data

## Step 6: Testing Checklist

- [ ] Coach 1 can only see their students
- [ ] Coach 2 can only see their students
- [ ] New students are assigned to the creating coach
- [ ] New lessons are assigned to the creating coach
- [ ] Notifications go to the correct coach
- [ ] Financial data is filtered by coach
- [ ] Calendar only shows coach's lessons
- [ ] Email management only shows coach's students
- [ ] RLS policies prevent cross-coach data access

## Important Notes

1. **Existing Data**: You'll need to assign all existing students/lessons to your coach account initially
2. **RLS Policies**: Update Row Level Security policies in Supabase to enforce isolation
3. **Cal.com Integration**: May need coach-specific calendar IDs
4. **Google Calendar Sync**: May need coach-specific calendar access
5. **Netlify Functions**: Update all functions to filter by coach_id

## Quick Start (Minimal Changes)

If you want to test this quickly:

1. Add `coach_id` to `students` table
2. Update `StudentsPage.jsx` to filter by coach
3. Update `getCurrentCoachId()` in notifications.js
4. Create a test coach account
5. Verify isolation works

Then gradually roll out to other components.
