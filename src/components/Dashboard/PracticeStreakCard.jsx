import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { calculatePracticeStreak, getStreakMessage } from '../../utils/practiceStreaks'
import './PracticeStreakCard.css'

export default function PracticeStreakCard({ studentId, completedLessons }) {
  const [streakData, setStreakData] = useState({ currentStreak: 0, longestStreak: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (studentId) {
      calculateStreak()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  const calculateStreak = async () => {
    try {
      // Get all lessons with completed practice plans
      const { data: practiceLessons, error } = await supabase
        .from('lessons')
        .select('practice_plan_completed_at')
        .eq('student_id', studentId)
        .eq('practice_plan_completed', true)
        .not('practice_plan_completed_at', 'is', null)
        .order('practice_plan_completed_at', { ascending: false })

      if (error) throw error

      const streak = calculatePracticeStreak(practiceLessons || [])
      setStreakData(streak)

      // Update database if streak changed
      if (studentId) {
        try {
          const { data: studentData, error: fetchError } = await supabase
            .from('students')
            .select('current_practice_streak, longest_practice_streak')
            .eq('id', studentId)
            .single()

          if (fetchError) {
            console.error('Error fetching student data for streak update:', fetchError)
            return
          }

          const needsUpdate = 
            studentData?.current_practice_streak !== streak.currentStreak ||
            (studentData?.longest_practice_streak || 0) < streak.longestStreak

          if (needsUpdate) {
            const { error: updateError } = await supabase
              .from('students')
              .update({
                current_practice_streak: streak.currentStreak,
                longest_practice_streak: Math.max(
                  studentData?.longest_practice_streak || 0,
                  streak.longestStreak
                ),
                last_practice_streak_updated: new Date().toISOString()
              })
              .eq('id', studentId)

            if (updateError) {
              console.error('Error updating streak in database:', updateError)
            }
          }
        } catch (dbError) {
          console.error('Error updating streak in database:', dbError)
        }
      }
    } catch (error) {
      console.error('Error calculating streak:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  if (streakData.currentStreak === 0 && streakData.longestStreak === 0) {
    return null // Don't show if no streak yet
  }

  return (
    <div className="practice-streak-card">
      <div className="streak-header">
        <h3>🔥 Practice Streak</h3>
      </div>
      <div className="streak-content">
        <div className="streak-main">
          <div className="streak-number">{streakData.currentStreak}</div>
          <div className="streak-label">
            {streakData.currentStreak === 1 ? 'week' : 'weeks'} in a row!
          </div>
        </div>
        <div className="streak-message">
          {getStreakMessage(streakData.currentStreak)}
        </div>
        {streakData.longestStreak > streakData.currentStreak && (
          <div className="streak-best">
            🏆 Best: {streakData.longestStreak} {streakData.longestStreak === 1 ? 'week' : 'weeks'}
          </div>
        )}
      </div>
    </div>
  )
}
