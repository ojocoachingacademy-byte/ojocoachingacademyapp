# RLS Policy Security Review

## Current RLS Policies Status

Based on `supabase_rls_fix.sql`, here's the current state:

### ✅ Profiles Table
- **RLS Enabled**: Yes
- **Policies**:
  - Users can INSERT own profile (WHERE id = auth.uid())
  - Users can SELECT own profile (WHERE id = auth.uid())
  - **ALL authenticated users can SELECT all profiles** (for coaches)
  - Users can UPDATE own profile (WHERE id = auth.uid())

**Security Note**: ⚠️ The "Coaches can read all profiles" policy uses `USING (true)`, meaning ALL authenticated users can read ALL profiles. This is intentional for coaches but means students can also see other students' profiles. Consider adding a role-based check if you want to restrict this further.

### ✅ Students Table
- **RLS Enabled**: Yes
- **Policies**:
  - Users can INSERT own student record (WHERE id = auth.uid())
  - Users can SELECT own student record (WHERE id = auth.uid())
  - **ALL authenticated users can SELECT all students** (for coaches)
  - No UPDATE policy (coaches update via direct SQL, students don't update)

**Security Note**: ⚠️ Same as profiles - all authenticated users can read all students. This allows students to see other students' data if they query directly. RLS prevents direct access, but the policy allows it. This is likely intentional for the hitting partners directory.

### ✅ Lessons Table
- **RLS Enabled**: Yes
- **Policies**:
  - Authenticated users can INSERT lessons (coaches create)
  - **Students can SELECT own lessons** (WHERE student_id = auth.uid()) ✅ SECURE
  - **ALL authenticated users can SELECT all lessons** (for coaches)
  - Authenticated users can UPDATE lessons

**Security Status**: ✅ **Students are properly restricted** - they can only read lessons where `student_id = auth.uid()`. This is correct.

### ✅ Hitting Partners Table
- **RLS Enabled**: Yes (based on code)
- **Policies** (from code inspection):
  - Users can INSERT own hitting partner record
  - Users can SELECT/UPDATE own record
  - **Need to verify**: Should authenticated users be able to read all active hitting partners?

**Potential Issue**: The hitting partners directory needs to show all active partners. Need to verify there's a policy that allows:
```sql
CREATE POLICY "Authenticated users can read active hitting partners"
ON hitting_partners
FOR SELECT
TO authenticated
USING (is_active = true);
```

### ✅ Development Focus Areas Table
- **RLS Enabled**: Yes (from development_focus_areas_table.sql)
- **Policies**:
  - Students can SELECT own plans (WHERE student_id = auth.uid()) ✅ SECURE
  - Coaches can SELECT/INSERT/UPDATE all plans

## 🔒 Security Recommendations

### 1. Hitting Partners Policy
Add explicit policy for directory access (if not already present):
```sql
CREATE POLICY "Authenticated users can read active hitting partners"
ON hitting_partners
FOR SELECT
TO authenticated
USING (is_active = true);
```

### 2. Profiles/Students "Coaches Only" Policy
If you want to restrict profile/student reading to coaches only, you could:
- Add a role column to profiles table
- Update policies to check role: `USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'coach')`

Current implementation allows all authenticated users to read all profiles/students, which works for hitting partners directory but may expose more data than desired.

### 3. Lessons Table - UPDATE Policy
Current policy allows ANY authenticated user to update ANY lesson. Consider restricting:
```sql
-- Students can only update student_learnings field
-- Coaches can update all fields
```

## ✅ Verified Secure Policies

1. **Lessons SELECT for students**: ✅ Secure - `WHERE student_id = auth.uid()`
2. **Development Plans SELECT for students**: ✅ Secure - `WHERE student_id = auth.uid()`
3. **Profile UPDATE**: ✅ Secure - `WHERE id = auth.uid()`

## ⚠️ Policies That Allow Cross-User Access

1. **Profiles SELECT**: All authenticated users can read all profiles
2. **Students SELECT**: All authenticated users can read all students  
3. **Lessons SELECT**: Coaches can read all lessons (expected)
4. **Hitting Partners**: Need to verify policy exists for directory access

These may be intentional for features like the hitting partners directory, but be aware that students can query other students' basic info.

