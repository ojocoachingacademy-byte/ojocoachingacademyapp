# Practice Streaks & Lesson Milestones Implementation Plan

## Feature 1: Practice Plan Completion Streaks

### Concept
Track consecutive weeks of practice plan completion to gamify accountability and motivate consistent practice.

### Database Changes
- Add to `students` table:
  - `current_practice_streak` INTEGER DEFAULT 0
  - `longest_practice_streak` INTEGER DEFAULT 0
  - `last_practice_streak_updated` TIMESTAMP

### Logic
- **Calculate Streak**: Count consecutive weeks where practice was completed
  - Group completed practices by week (Monday-Sunday)
  - Count consecutive weeks with at least one completed practice
  - Reset if a week passes with no completed practice
  
- **Update on Completion**: When student marks practice complete:
  - Recalculate current streak
  - Update longest streak if current exceeds it
  - Update timestamp

### Display
- **Streak Card** on Home tab showing:
  - 🔥 Current streak (e.g., "3 weeks in a row!")
  - 🏆 Longest streak (e.g., "Best: 5 weeks")
  - Motivational message based on streak length

---

## Feature 2: Lesson Milestone Celebrations

### Concept
Celebrate major milestones (5, 10, 15, 20, 25, 30 lessons) with animated celebration modal.

### Database Changes
- Add to `students` table:
  - `shown_lesson_milestones` INTEGER[] DEFAULT '{}' (array of milestone numbers shown)

### Milestones
- 5 lessons: "You're on your way! 🎾"
- 10 lessons: "Double digits! 🎉"
- 15 lessons: "Building momentum! 🚀"
- 20 lessons: "You're committed! 💪"
- 25 lessons: "Quarter century! 🌟"
- 30 lessons: "30 lessons strong! 🏆"

### Logic
- **Detect Milestone**: When fetching completed lessons:
  - Count total completed lessons
  - Check if count matches a milestone (5, 10, 15, 20, 25, 30)
  - Check if milestone already shown (in `shown_lesson_milestones` array)
  - If new milestone: Show celebration modal

### Celebration Modal
- Full-screen overlay with:
  - Animated confetti/particles
  - Large milestone number
  - Celebration message
  - Motivational quote
  - "Continue" button
- Auto-dismiss after 5 seconds or manual close
- Mark milestone as shown in database

---

## Implementation Order

1. ✅ Database schema updates
2. ✅ Utility functions (streak calculation, milestone detection)
3. ✅ PracticeStreakCard component
4. ✅ LessonMilestoneModal component
5. ✅ Update PracticePlanCard to recalculate streaks
6. ✅ Integrate both into HomeTab
7. ✅ Add milestone tracking to student data fetch
