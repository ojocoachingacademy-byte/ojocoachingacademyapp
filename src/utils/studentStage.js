/**
 * Determines what stage a student is at in their journey based on lesson count
 * Stage 1: Pre-First Lesson (0 lessons)
 * Stage 2: Just Started (1-4 lessons)
 * Stage 3: Developing (5-19 lessons)
 * Stage 4: Established (20+ lessons)
 */
export const getStudentStage = (studentData, upcomingLesson, completedLessons) => {
  const lessonsCompleted = completedLessons?.length || 0

  // Stage 1: Pre-First Lesson - No lessons completed yet
  if (lessonsCompleted < 1) {
    const studentName = studentData?.profiles?.full_name || studentData?.full_name || 'there'
    return {
      stage: 'pre_first_lesson',
      stageNumber: 1,
      title: `Welcome ${studentName}, let's get started! 🎾`,
      description: 'Your first lesson is coming up',
      showGettingStarted: true,
      showFirstLessonCard: true,
      showPracticePlanPlaceholder: true,
      showRecentWins: false
    }
  }

  // Stage 2: Just Started - 1-4 lessons completed
  if (lessonsCompleted >= 1 && lessonsCompleted <= 4) {
    return {
      stage: 'just_started',
      stageNumber: 2,
      title: 'Great start! Keep it going 🎉',
      description: 'You\'re building your foundation',
      showGettingStarted: false,
      showFirstLessonCard: false,
      showPracticePlanPlaceholder: false,
      showRecentWins: true,
      encouragementMessage: 'Every lesson is progress!'
    }
  }

  // Stage 3: Developing - 5-19 lessons completed
  if (lessonsCompleted >= 5 && lessonsCompleted <= 19) {
    return {
      stage: 'developing',
      stageNumber: 3,
      title: `Welcome back, ${studentData?.profiles?.full_name?.split(' ')[0] || 'there'}! 👋`,
      description: 'You\'re making real progress',
      showGettingStarted: false,
      showFirstLessonCard: false,
      showPracticePlanPlaceholder: false,
      showRecentWins: true,
      showProgressHighlights: true
    }
  }

  // Stage 4: Established - 20+ lessons completed
  return {
    stage: 'established',
    stageNumber: 4,
    title: `Welcome back, ${studentData?.profiles?.full_name?.split(' ')[0] || 'there'}! 👋`,
    description: 'You\'re an established player now',
    showGettingStarted: false,
    showFirstLessonCard: false,
    showPracticePlanPlaceholder: false,
    showRecentWins: true,
    showProgressHighlights: true,
    establishedTone: true
  }
}
