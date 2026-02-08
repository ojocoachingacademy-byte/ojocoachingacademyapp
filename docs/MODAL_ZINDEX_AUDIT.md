# Modal z-index audit (mobile: buttons hidden under bottom nav)

**Issue:** Bottom nav (student-tabs / coach-tabs) uses `z-index: 9999`. Modals using `z-index: 1000` (or similar) render *under* the nav on mobile, so footer buttons (Close, Save, etc.) are not clickable.

**Fix applied:** All modals that appear in tabbed layouts now use `z-index: 10050` (via class `modal-above-tabs` or direct CSS), so they sit above the bottom nav.

---

## Audit summary

| # | Location | Modal | Was affected? | Fix |
|---|----------|--------|----------------|-----|
| 1 | **HittingPartners** (Community tab) | Profile setup / Edit profile | ✅ Yes | Added `modal-above-tabs` |
| 2 | **StudentDashboard** | Profile modal | ✅ Yes | CSS `profile-modal-overlay` → 10050 |
| 3 | **StudentDashboard** | Lesson details | ✅ Yes | Added `modal-above-tabs` |
| 4 | **StudentDashboard** | Reflection modal | ❌ No | Inline z-index 99999/10000 |
| 5 | **StudentPageWrapper** | Profile (from More menu) | ✅ Yes | Same `profile-modal-overlay` (fixed in #2) |
| 6 | **HomeTab** (student) | Lesson plan view | ✅ Yes | Added `modal-above-tabs` |
| 7 | **ProfileTab** (student) | Edit profile | ✅ Yes | CSS `edit-profile-modal-overlay` → 10050 |
| 8 | **ProgressTab** (student) | Congratulations | ❌ No | Already `congratulations-overlay` 10000 |
| 9 | **PracticePlanCelebrationModal** | Celebration | ✅ Yes | Added `modal-above-tabs` |
| 10 | **StudentLessonsPage** | Lesson details | ✅ Yes | Added `modal-above-tabs` |
| 11 | **LessonMilestoneModal** | Milestone | ❌ No | Already `milestone-modal-overlay` 10000 |
| 12 | **CoachDashboard** | Lesson plan, Templates, Lesson detail, Feedback | ✅ Yes | Already fixed (lesson-plan-modal-overlay 10050) |
| 13 | **ConfirmationModal** (shared) | Confirm dialogs | ✅ Yes | CSS → 10050 |
| 14 | **LogPaymentModal** | Log payment | ✅ Yes | CSS → 10050 |
| 15 | **AddPackageModal** | Add package | ✅ Yes | CSS → 10050 |
| 16 | **MergeHistoricalModal** | Merge historical | ✅ Yes | CSS → 10050 |
| 17 | **ReferralCelebrationModal** | Referral celebration | ✅ Yes | Added `modal-above-tabs` |
| 18 | **AddStudentModal** | Add student | ✅ Yes | Added `modal-above-tabs` + Modal.css import |
| 19 | **LinkPartnerModal** | Link partner | ✅ Yes | Added `modal-above-tabs` |
| 20 | **MergeProfilesModal** | Merge profiles (all 3 overlays) | ✅ Yes | Added `modal-above-tabs` |
| 21 | **StudentDetailPage** (coach) | Lesson detail, Delete confirm | ✅ Yes | Added `modal-above-tabs` |
| 22 | **LessonsPage** (coach) | Lesson details | ✅ Yes | Added `modal-above-tabs` |
| 23 | **CalendarView** (coach) | Lesson details | ✅ Yes | Added `modal-above-tabs` |
| 24 | **StudentSelectionModal** | Student picker | ✅ Yes | Added `modal-above-tabs` |
| 25 | **NewConversationModal** (Messages) | New message (both views) | ✅ Yes | Added `modal-above-tabs` |
| 26 | **ExpensesPage** (coach) | Add expense | ✅ Yes | Added `modal-above-tabs` |
| 27 | **BookLessonModal** | Book lesson | ✅ Yes | Added `modal-above-tabs` |
| 28 | **CreateLessonModal** | Create lesson | ✅ Yes | Added `modal-above-tabs` |
| 29 | **TestimonialSubmission** | Submit testimonial | ✅ Yes | Added `modal-above-tabs` |
| 30 | **SelectProfileModal** (coach) | Select profile | ✅ Yes | Added `modal-above-tabs` |

---

## Count

- **Total modals in tabbed layouts (student or coach) that could have the issue:** **30** (some components have multiple overlays).
- **Already safe (z-index ≥ 10000):** 3 (Reflection, Congratulations, LessonMilestoneModal).
- **Fixed in this pass:** **27** modal overlays (via `modal-above-tabs` or CSS z-index 10050).

---

## Shared utility

- **`styles/global.css`:** `.modal-above-tabs { z-index: 10050 !important; }`  
  Use this class on any new modal overlay that is shown on a page with bottom tabs (StudentPageWrapper or CoachLayout).
