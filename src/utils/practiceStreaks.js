/**
 * Utility functions for calculating practice plan completion streaks
 */

/**
 * Calculate practice streak from completed practice plans
 * Streak = consecutive weeks with at least one completed practice
 * 
 * @param {Array} completedPractices - Array of lessons with practice_plan_completed_at
 * @returns {Object} { currentStreak, longestStreak }
 */
export function calculatePracticeStreak(completedPractices) {
  if (!completedPractices || completedPractices.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Group completed practices by week (Monday-Sunday)
  const weeks = new Map()
  
  completedPractices.forEach(lesson => {
    if (!lesson.practice_plan_completed_at) return
    
    const completedDate = new Date(lesson.practice_plan_completed_at)
    const weekKey = getWeekKey(completedDate)
    
    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, [])
    }
    weeks.set(weekKey, [...weeks.get(weekKey), completedDate])
  })

  // Sort weeks chronologically (newest first)
  const sortedWeeks = Array.from(weeks.keys()).sort((a, b) => b.localeCompare(a))
  
  if (sortedWeeks.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Calculate current streak (consecutive weeks from most recent)
  let currentStreak = 0
  const today = new Date()
  const currentWeekKey = getWeekKey(today)
  
  // Check if most recent week is current week or last week
  const mostRecentWeek = sortedWeeks[0]
  const weekDiff = getWeekDifference(mostRecentWeek, currentWeekKey)
  
  // If most recent practice was more than 1 week ago, streak is broken
  if (weekDiff > 1) {
    currentStreak = 0
  } else {
    // Count consecutive weeks
    currentStreak = 1
    for (let i = 1; i < sortedWeeks.length; i++) {
      const weekDiff = getWeekDifference(sortedWeeks[i - 1], sortedWeeks[i])
      if (weekDiff === 1) {
        currentStreak++
      } else {
        break
      }
    }
  }

  // Calculate longest streak (find longest consecutive sequence)
  let longestStreak = 1
  let tempStreak = 1
  
  for (let i = 1; i < sortedWeeks.length; i++) {
    const weekDiff = getWeekDifference(sortedWeeks[i - 1], sortedWeeks[i])
    if (weekDiff === 1) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 1
    }
  }

  return { currentStreak, longestStreak }
}

/**
 * Get week key in format YYYY-WW (year-week number)
 * Week starts on Monday
 */
function getWeekKey(date) {
  const d = new Date(date)
  // Set to Monday of the week (don't mutate original date)
  const day = d.getDay()
  // Calculate days to subtract to get to Monday (0 = Monday, 6 = Sunday)
  const daysToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysToMonday)
  
  // Get ISO week number
  const startOfYear = new Date(monday.getFullYear(), 0, 1)
  const days = Math.floor((monday - startOfYear) / (24 * 60 * 60 * 1000))
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
  
  return `${monday.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
}

/**
 * Calculate difference in weeks between two week keys
 */
function getWeekDifference(weekKey1, weekKey2) {
  if (!weekKey1 || !weekKey2) return 0
  
  const parts1 = weekKey1.split('-W')
  const parts2 = weekKey2.split('-W')
  
  if (parts1.length !== 2 || parts2.length !== 2) return 0
  
  const [year1, week1] = parts1.map(Number)
  const [year2, week2] = parts2.map(Number)
  
  if (isNaN(year1) || isNaN(week1) || isNaN(year2) || isNaN(week2)) return 0
  
  if (year1 === year2) {
    return week1 - week2
  } else {
    // Approximate: assume 52 weeks per year
    return (year1 - year2) * 52 + (week1 - week2)
  }
}

/**
 * Get motivational message based on streak length
 */
export function getStreakMessage(streak) {
  if (streak === 0) {
    return "Start your streak today! 💪"
  } else if (streak === 1) {
    return "Great start! Keep it going! 🎯"
  } else if (streak === 2) {
    return "Two weeks strong! 🔥"
  } else if (streak === 3) {
    return "Three weeks in a row! You're on fire! 🔥🔥"
  } else if (streak >= 4 && streak < 7) {
    return `${streak} weeks strong! Incredible consistency! 🌟`
  } else if (streak >= 7 && streak < 10) {
    return `${streak} weeks! You're unstoppable! 🚀`
  } else if (streak >= 10) {
    return `${streak} weeks! You're a practice champion! 🏆`
  }
  return "Keep up the amazing work! 💪"
}
