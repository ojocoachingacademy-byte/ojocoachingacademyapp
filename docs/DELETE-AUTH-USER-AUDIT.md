# Delete Auth User – Audit Report

**Date:** 2025-01-27  
**Scope:** `netlify/functions/delete-auth-user.js` – ensure all foreign relationships, student records, and app tables are deleted when a user (student) is removed.

---

## Summary

The delete function is **largely complete**. It deletes in dependency order and clears referral/pairing refs before removing the student. A few **diagnostic** gaps were fixed (referenceChecks and validation), and one **schema assumption** is documented below.

---

## Tables Currently Deleted (in order)

| # | Table | Key(s) | Status |
|---|--------|--------|--------|
| 1 | messages | sender_id, receiver_id | ✅ Deleted |
| 2 | conversations | participant_1_id, participant_2_id | ✅ Deleted |
| 3 | notifications | user_id | ✅ Deleted |
| 4 | testimonials | student_id | ✅ Deleted |
| 5 | testimonial_requests | student_id | ✅ Deleted |
| 6 | hitting_partners | id | ✅ Deleted |
| 7 | scheduled_notifications | metadata.studentId / student_id | ✅ Deleted (by id list) |
| 8 | practice_plans | student_id | ✅ Deleted |
| 9 | development_focus_areas | student_id | ✅ Deleted |
| 10 | student_focus_areas | student_id | ✅ Deleted |
| 11 | student_packages | student_id | ✅ Deleted |
| 12 | skill_assessments | student_id | ✅ Deleted |
| 13 | skill_progress_snapshots | student_id | ✅ Deleted |
| 14 | student_milestones | student_id | ✅ Deleted |
| 15 | lesson_homework | student_id | ✅ Deleted |
| 16 | payment_transactions | student_id | ✅ Deleted |
| 17 | lesson_transactions | student_id | ✅ Deleted |
| 18 | lessons | student_id, paired_student_id | ✅ Deleted (.or) |
| 19 | analytics_events | user_id | ✅ Deleted |
| – | students | referred_by_student_id, paired_with_id | ✅ Cleared (update to null) |
| 20 | students | id | ✅ Deleted |
| 21 | profiles | id | ✅ Deleted (after auth or manually) |
| 22 | auth.users | id | ✅ Deleted last |

---

## Foreign Relationships Covered

- **Auth/user:** profiles (id), auth user last.
- **Student:** All tables that reference `students.id` or `student_id` are deleted or cleared before deleting the student row.
- **Lessons:** Deleted by both `student_id` and `paired_student_id` so paired lessons are removed.
- **Referrals / pairing:** `referred_by_student_id` and `paired_with_id` on other students are set to null before deleting the student.

---

## Student Records and “New” Elements

- **Development plan / onboarding:** Stored on `students` (e.g. `development_plan`, `development_plan_notes`, `onboarding_completed`). Removed when the student row is deleted.
- **Lesson learnings / metadata:** Stored on `lessons` (`student_learnings`, `metadata`). Removed when lessons are deleted.
- **Milestones, focus areas, packages, assessments, snapshots, homework, transactions:** All have explicit delete steps by `student_id` (and lessons by `paired_student_id`).

No separate “development_plan” or “onboarding” table exists; everything is on `students` and `lessons`, which are covered.

---

## Tables Not Tied to the Deleted User

- **expenses:** Coach-level; no `student_id` / `user_id` for the deleted student. No change needed.
- **bookings:** Website bookings; no FK to `auth.users` or `students` (see `supabase_referral_integration.sql`). No change needed.
- **referrals:** Referral codes; no `user_id` / `student_id`. No change needed.
- **referral_redemptions:** Links to `bookings`; no FK to the deleted user. No change needed.
- **lesson_templates:** Coach-only; no student FK. No change needed.
- **package_tiers / package_prices:** Lookup data; no user/student FK. No change needed.
- **monthly_revenue_summary / monthly_lessons_summary / weekly_*:** Views/summaries; no direct FK to delete. No change needed.

---

## Fixes Applied

1. **referenceChecks (diagnostics):** When auth delete fails, the function checks “remaining references.” Added:
   - `lessons.student_id`, `lessons.paired_student_id`
   - `student_milestones.student_id`
   - `lesson_homework.student_id`
   - `skill_progress_snapshots.student_id`  
   so any leftover references to the user in these tables are reported.

2. **validateForeignKeys (start-of-run check):** In `tablesToCheck`, `lessons` now includes `paired_student_id` so the validator considers both lesson roles (student and paired student).

---

## Recommendations

1. **Run the check script after schema changes:**  
   `npm run check-delete` (or `node scripts/check-delete-function.js`) to ensure no new table with a FK to the user/student is missed.

2. **If you add new tables:**  
   Any table with a column referencing `students.id`, `profiles.id`, or `auth.users.id` must be added to the delete function (delete step + `knownTables` + `referenceChecks` and, if applicable, `tablesToCheck` in the check script).

3. **Storage:**  
   `testimonial-videos` is used as a storage bucket in the app; no table with that name is assumed. If you add a table that stores per-student or per-user data, add a delete step for it.

---

## Conclusion

The delete function will delete all covered foreign relationships and student records. Referral/bookings tables do not reference the deleted user. Diagnostic checks were updated so that any remaining references in lessons, milestones, homework, and snapshots are reported if auth delete fails.
