/**
 * Utility functions for lesson milestone detection and celebration
 */

export const LESSON_MILESTONES = [5, 10, 15, 20, 25, 30]

export const MILESTONE_MESSAGES = {
  5: {
    title: "5 Lessons Complete! 🎾",
    message: "You're on your way!",
    description: "You've completed your first 5 lessons. Keep building that foundation!",
    emoji: "🎾"
  },
  10: {
    title: "10 Lessons Complete! 🎉",
    message: "Double digits!",
    description: "You've hit 10 lessons! Your consistency is paying off.",
    emoji: "🎉"
  },
  15: {
    title: "15 Lessons Complete! 🚀",
    message: "Building momentum!",
    description: "15 lessons down! You're making real progress now.",
    emoji: "🚀"
  },
  20: {
    title: "20 Lessons Complete! 💪",
    message: "You're committed!",
    description: "20 lessons! You're serious about improvement. Amazing dedication!",
    emoji: "💪"
  },
  25: {
    title: "25 Lessons Complete! 🌟",
    message: "Quarter century!",
    description: "25 lessons completed! You're becoming a true student of the game.",
    emoji: "🌟"
  },
  30: {
    title: "30 Lessons Complete! 🏆",
    message: "30 lessons strong!",
    description: "30 lessons! You're a dedicated player with incredible commitment.",
    emoji: "🏆"
  }
}

/**
 * Check if student has reached a new lesson milestone
 * @param {number} completedLessonCount - Total number of completed lessons
 * @param {Array} shownMilestones - Array of milestone numbers already shown
 * @returns {number|null} - Milestone number if new milestone reached, null otherwise
 */
export function detectNewMilestone(completedLessonCount, shownMilestones = []) {
  if (!completedLessonCount || completedLessonCount < 5) {
    return null
  }

  // Find the highest milestone the student has reached
  const reachedMilestones = LESSON_MILESTONES.filter(m => completedLessonCount >= m)
  
  if (reachedMilestones.length === 0) {
    return null
  }

  // Find the highest milestone not yet shown
  const shownSet = new Set(shownMilestones || [])
  const newMilestone = reachedMilestones
    .sort((a, b) => b - a) // Sort descending
    .find(m => !shownSet.has(m))

  return newMilestone || null
}

/**
 * Get milestone data for a given milestone number
 */
export function getMilestoneData(milestoneNumber) {
  return MILESTONE_MESSAGES[milestoneNumber] || null
}
