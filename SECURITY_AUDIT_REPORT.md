# 🔍 SECURITY AUDIT REPORT - OJO Coaching Academy App

## EXECUTIVE SUMMARY

**Date**: 2025-01-01  
**Status**: ⚠️ **CRITICAL ISSUES FOUND**

Several security vulnerabilities have been identified that need immediate attention.

---

## 🚨 CRITICAL ISSUES

### 1. **Lessons UPDATE Policy - OVERLY PERMISSIVE**
**Severity**: 🔴 **CRITICAL**

**Issue**: The RLS policy for lessons UPDATE allows ANY authenticated user to update ANY lesson with ANY fields:
```sql
CREATE POLICY "Authenticated users can update lessons"
ON lessons
FOR UPDATE
TO authenticated
USING (true)  -- ❌ No restriction
WITH CHECK (true);  -- ❌ No restriction
```

**Impact**: 
- Students could potentially update lesson plans they shouldn't
- Students could modify coach feedback
- Students could change lesson dates/times
- Any authenticated user could modify any lesson

**Current Code**: In `CoachDashboard.jsx`, coaches update lessons. In `StudentDashboard.jsx`, students update `student_learnings`.

**Risk**: HIGH - Students should only be able to update `student_learnings` field, not lesson plans, coach feedback, or other fields.

**Fix Required**: Create separate policies:
- Students can only update `student_learnings` field where `student_id = auth.uid()`
- Coaches can update all fields (or be more specific about which fields)

---

### 2. **Lessons INSERT Policy - ANY USER CAN CREATE LESSONS**
**Severity**: 🟡 **HIGH**

**Issue**: The RLS policy allows ANY authenticated user to create lessons for ANY student:
```sql
CREATE POLICY "Coaches can create lessons"
ON lessons
FOR INSERT
TO authenticated
WITH CHECK (true);  -- ❌ No restriction on who can insert
```

**Impact**:
- Students could create lessons for themselves
- Students could create lessons for other students
- Should only allow coaches (or restrict to specific role)

**Risk**: MEDIUM-HIGH - Currently mitigated by frontend logic (only coaches see create lesson UI), but database-level security is missing.

**Fix Required**: Either:
- Add role-based check (requires role column in profiles)
- Or rely on frontend-only restriction (not recommended)

---

### 3. **Hardcoded Supabase Key**
**Severity**: 🟡 **MEDIUM** (Lower risk if publishable key)

**Issue**: Supabase URL and key are hardcoded in `src/supabaseClient.js`:
```javascript
const supabaseUrl = 'https://ajjqhksdufotifsyejjg.supabase.co'
const supabaseKey = 'sb_publishable_BNRwUcCpy4ZZfXfmC8NzVw_JBCEgI2Y'
```

**Note**: The key prefix `sb_publishable_` indicates this is a publishable/anonymous key, which Supabase designates as safe for client-side use. However, best practice is still to use environment variables.

**Impact**: 
- Key exposure in source code (public repo)
- Can't easily switch between dev/staging/prod
- Key is visible in browser dev tools (but this is expected for publishable keys)

**Risk**: LOW-MEDIUM - Publishable keys are meant to be public, but should still use env vars for best practices.

**Fix Recommended**: Move to environment variables for consistency and maintainability.

---

## ⚠️ MODERATE ISSUES

### 4. **Overly Permissive Profiles/Students SELECT Policies**
**Severity**: 🟡 **MODERATE**

**Issue**: All authenticated users can read ALL profiles and students:
```sql
CREATE POLICY "Coaches can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);  -- ❌ All users, not just coaches
```

**Impact**:
- Students can query other students' profile information
- Students can see other students' email, phone, etc.
- Works for hitting partners directory but exposes more data than necessary

**Current Behavior**: Intentional for hitting partners directory feature, but could be more restrictive.

**Risk**: LOW-MEDIUM - Functional but not ideal. Students shouldn't need full access to all profiles.

**Recommended Fix**: 
- Add role-based check if role column exists
- Or create a separate view/table for hitting partners directory
- Or accept this as intentional design for directory feature

---

### 5. **Missing Hitting Partners Directory Policy**
**Severity**: 🟡 **MODERATE**

**Issue**: SQL file exists (`hitting_partners_rls_policy.sql`) but policy may not be applied in database.

**Impact**: 
- Hitting partners directory may not work if policy not applied
- Or may work through the overly-permissive profiles policy (workaround, not ideal)

**Fix Required**: Verify policy is applied in Supabase database.

---

## ✅ SECURE AREAS

1. **API Keys (Anthropic)**: ✅ Secure - Moved to Netlify Functions, server-side only
2. **Lessons SELECT for Students**: ✅ Secure - Properly restricted to `student_id = auth.uid()`
3. **Profile UPDATE**: ✅ Secure - Users can only update own profile
4. **Student Record Access**: ✅ Secure - Users can only read own record (though coaches can read all)
5. **Development Plans**: ✅ Secure - Students can only read own plans
6. **Environment Variables**: ✅ `.env` is in `.gitignore`

---

## 🔧 RECOMMENDED FIXES (Priority Order)

### Priority 1: Fix Lessons UPDATE Policy (CRITICAL)

**Create separate policies for students vs coaches:**

```sql
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can update lessons" ON lessons;

-- Students can only update student_learnings field for their own lessons
CREATE POLICY "Students can update own learnings"
ON lessons
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- Coaches can update all fields (or be more specific)
-- Note: This still allows any authenticated user. Consider role-based check.
CREATE POLICY "Coaches can update lessons"
ON lessons
FOR UPDATE
TO authenticated
USING (true)  -- Consider adding role check
WITH CHECK (true);
```

**BUT WAIT** - The above won't work because PostgreSQL RLS doesn't support field-level restrictions easily. Better approach:

**Option A: Use separate update endpoints/tables (complex)**
**Option B: Accept frontend-level restrictions + add validation**
**Option C: Use database triggers to restrict field updates**

**Recommended**: Option B for now, but document that frontend must enforce this.

---

### Priority 2: Move Supabase Key to Environment Variables

**Update `src/supabaseClient.js`:**
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ajjqhksdufotifsyejjg.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BNRwUcCpy4ZZfXfmC8NzVw_JBCEgI2Y'

export const supabase = createClient(supabaseUrl, supabaseKey)
```

**Add to `.env`:**
```
VITE_SUPABASE_URL=https://ajjqhksdufotifsyejjg.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_BNRwUcCpy4ZZfXfmC8NzVw_JBCEgI2Y
```

---

### Priority 3: Verify Hitting Partners Policy

**Run in Supabase SQL Editor:**
```sql
-- Check if policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'hitting_partners' 
AND policyname = 'Authenticated users can read active hitting partners';

-- If not exists, run hitting_partners_rls_policy.sql
```

---

### Priority 4: Consider Role-Based Access Control

**For future improvement:**
- Add `role` column to `profiles` table (values: 'student', 'coach', 'admin')
- Update RLS policies to check role:
  ```sql
  USING (
    auth.uid() = id 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'coach'
  )
  ```

---

## 📋 TESTING CHECKLIST

- [ ] Test that students CANNOT update lesson plans (only student_learnings)
- [ ] Test that students CANNOT create lessons
- [ ] Test that students CANNOT access other students' lessons
- [ ] Test that students CANNOT update coach feedback
- [ ] Verify hitting partners directory policy is applied
- [ ] Test that students CANNOT access other students' development plans
- [ ] Verify environment variables work correctly
- [ ] Test Netlify Functions with proper API key

---

## 🎯 SUMMARY

**Critical Issues**: 1 (Lessons UPDATE policy)  
**High Issues**: 1 (Lessons INSERT policy)  
**Moderate Issues**: 3 (Hardcoded key, permissive SELECT, missing policy)  
**Secure Areas**: 6

**Overall Security Status**: ⚠️ **NEEDS ATTENTION**

The most critical issue is the lessons UPDATE policy allowing any user to update any lesson. This should be restricted immediately.



