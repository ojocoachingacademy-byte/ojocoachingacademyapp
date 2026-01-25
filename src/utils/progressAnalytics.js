// Helper functions for progress analysis

export const calculateProgressSummary = (timeRange, data) => {
  const { skillSnapshots, lessons, milestones, practiceCompletions } = data
  
  // Filter data for time range
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - timeRange)
  
  const recentSnapshots = (skillSnapshots || []).filter(s => {
    const snapshotDate = s.snapshot_date || s.created_at || s.assessed_at
    return snapshotDate && new Date(snapshotDate) >= startDate
  })
  
  const recentLessons = (lessons || []).filter(l => {
    const lessonDate = l.lesson_date
    return new Date(lessonDate) >= startDate && l.status === 'completed'
  })
  
  const recentMilestones = (milestones || []).filter(m => {
    const achievedDate = m.achieved_at
    return achievedDate && new Date(achievedDate) >= startDate
  })
  
  const recentPractice = (practiceCompletions || []).filter(p => {
    const completedDate = p.practice_plan_completed_at || p.lesson_date
    return completedDate && new Date(completedDate) >= startDate
  })
  
  // Calculate improvements
  const improvements = calculateSkillImprovements(recentSnapshots)
  const topImprovements = improvements
    .sort((a, b) => b.change - a.change)
    .slice(0, 3)
  
  // Calculate practice completions count (not streak)
  const practiceCompletions = recentPractice.length
  
  return {
    lessonsCompleted: recentLessons.length,
    milestonesAchieved: recentMilestones.length,
    topImprovements,
    practiceCompletions,
    totalPracticeHours: calculateTotalPracticeHours(recentPractice),
    insights: generateInsights(improvements, recentPractice, recentLessons)
  }
}

const calculateSkillImprovements = (snapshots) => {
  if (!snapshots || snapshots.length < 2) return []
  
  // Group by skill area - snapshots are individual rows per skill
  const skillGroups = {}
  
  snapshots.forEach(snapshot => {
    // skill_progress_snapshots has individual rows with skill_name and current_level
    if (snapshot.skill_name) {
      const skillName = snapshot.skill_name
      if (!skillGroups[skillName]) skillGroups[skillName] = []
      
      // Use current_level, fall back to student_assessment for historical data
      const level = snapshot.current_level ?? snapshot.student_assessment ?? snapshot.coach_assessment ?? 0
      const snapshotDate = snapshot.snapshot_date || snapshot.created_at || snapshot.assessed_at
      
      if (level > 0 && snapshotDate) {
        skillGroups[skillName].push({ 
          date: new Date(snapshotDate), 
          level 
        })
      }
    }
  })
  
  // Calculate change for each skill
  const improvements = []
  Object.entries(skillGroups).forEach(([skill, values]) => {
    if (values.length < 2) return
    
    // Sort by date
    values.sort((a, b) => a.date - b.date)
    const oldest = values[0].level
    const newest = values[values.length - 1].level
    const change = newest - oldest
    
    if (change > 0) {
      improvements.push({
        skill: formatSkillName(skill),
        oldLevel: oldest,
        newLevel: newest,
        change,
        percentChange: oldest > 0 ? Math.round((change / oldest) * 100) : 0
      })
    }
  })
  
  return improvements
}

const calculatePracticeStreak = (practiceCompletions) => {
  if (!practiceCompletions || practiceCompletions.length === 0) return 0
  
  // Sort by date descending
  const sorted = practiceCompletions
    .map(p => ({
      date: new Date(p.practice_plan_completed_at || p.lesson_date)
    }))
    .sort((a, b) => b.date - a.date)
  
  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)
  
  for (const practice of sorted) {
    const practiceDate = new Date(practice.date)
    practiceDate.setHours(0, 0, 0, 0)
    
    const diffDays = Math.floor((currentDate - practiceDate) / (1000 * 60 * 60 * 24))
    
    if (diffDays <= streak + 1) {
      streak++
      currentDate = practiceDate
    } else {
      break
    }
  }
  
  return streak
}

const calculateTotalPracticeHours = (practiceCompletions) => {
  // Estimate practice time - assume 15-30 minutes per practice session
  // If we have duration data, use it, otherwise estimate
  return practiceCompletions.reduce((total, p) => {
    const duration = p.duration_minutes || 20 // Default 20 minutes
    return total + (duration / 60)
  }, 0)
}

const generateInsights = (improvements, practice, lessons) => {
  const insights = []
  
  // Practice frequency insight
  if (practice.length >= 3 && improvements.length > 0) {
    const topSkill = improvements[0]
    if (topSkill) {
      insights.push({
        type: 'success',
        text: `Your ${topSkill.skill} improved most when you practiced ${practice.length} times`
      })
    }
  }
  
  // Consistency insight
  if (practice.length > 0 && lessons.length > 0) {
    const practiceRate = practice.length / lessons.length
    if (practiceRate >= 2) {
      insights.push({
        type: 'success',
        text: `You're practicing ${Math.round(practiceRate)}x between lessons - great consistency!`
      })
    } else if (practiceRate < 1 && lessons.length >= 2) {
      insights.push({
        type: 'tip',
        text: `Try practicing at least once between lessons to improve faster`
      })
    }
  }
  
  // Improvement rate insight
  if (improvements.length > 0) {
    const avgImprovement = improvements.reduce((sum, i) => sum + i.change, 0) / improvements.length
    if (avgImprovement >= 0.5) {
      insights.push({
        type: 'success',
        text: `You're improving ${Math.round(avgImprovement * 10) / 10} points per skill on average`
      })
    }
  }
  
  // Milestone progress insight
  if (lessons.length >= 3) {
    insights.push({
      type: 'success',
      text: `You've completed ${lessons.length} lessons - keep up the momentum!`
    })
  }
  
  return insights
}

const formatSkillName = (skill) => {
  return skill
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export const compareProgressPeriods = (currentSummary, previousSummary) => {
  const comparison = {}
  
  // Lessons comparison
  const lessonDiff = currentSummary.lessonsCompleted - previousSummary.lessonsCompleted
  comparison.lessons = {
    current: currentSummary.lessonsCompleted,
    previous: previousSummary.lessonsCompleted,
    change: lessonDiff,
    percentChange: previousSummary.lessonsCompleted > 0 
      ? Math.round((lessonDiff / previousSummary.lessonsCompleted) * 100)
      : lessonDiff > 0 ? 100 : 0
  }
  
  // Milestones comparison
  const milestoneDiff = currentSummary.milestonesAchieved - previousSummary.milestonesAchieved
  comparison.milestones = {
    current: currentSummary.milestonesAchieved,
    previous: previousSummary.milestonesAchieved,
    change: milestoneDiff,
    percentChange: previousSummary.milestonesAchieved > 0
      ? Math.round((milestoneDiff / previousSummary.milestonesAchieved) * 100)
      : milestoneDiff > 0 ? 100 : 0
  }
  
  // Practice comparison
  const practiceDiff = currentSummary.totalPracticeHours - previousSummary.totalPracticeHours
  comparison.practice = {
    current: currentSummary.totalPracticeHours,
    previous: previousSummary.totalPracticeHours,
    change: practiceDiff,
    percentChange: previousSummary.totalPracticeHours > 0
      ? Math.round((practiceDiff / previousSummary.totalPracticeHours) * 100)
      : practiceDiff > 0 ? 100 : 0
  }
  
  return comparison
}
