import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { getMilestonesByLevel } from './MilestonesConstants'
import { CheckCircle } from 'lucide-react'
import './MilestoneTracker.css'

export default function MilestoneTracker({ studentId, isCoach = false, playerLevel = 'beginner' }) {
  const [achievedMilestones, setAchievedMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  
  const milestones = getMilestonesByLevel(playerLevel)

  useEffect(() => {
    if (!studentId) {
      setLoading(false)
      return
    }

    const fetchAchievedMilestones = async () => {
      try {
        const { data, error } = await supabase
          .from('student_milestones')
          .select('*')
          .eq('student_id', studentId)
          .eq('milestone_level', playerLevel)

        if (error) throw error

        setAchievedMilestones(data || [])
      } catch (error) {
        console.error('Error fetching achieved milestones:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAchievedMilestones()
  }, [studentId, playerLevel])

  const handleToggleMilestone = async (milestone) => {
    if (!studentId || !isCoach) return

    try {
      const existing = achievedMilestones.find(m => m.milestone_number === milestone.number)

      if (existing) {
        // Delete milestone
        const { error } = await supabase
          .from('student_milestones')
          .delete()
          .eq('student_id', studentId)
          .eq('milestone_number', milestone.number)
          .eq('milestone_level', playerLevel)

        if (error) throw error

        setAchievedMilestones(prev => prev.filter(m => m.milestone_number !== milestone.number))
      } else {
        // Insert milestone
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
          .from('student_milestones')
          .insert({
            student_id: studentId,
            milestone_number: milestone.number,
            milestone_name: milestone.name,
            achieved_at: new Date().toISOString(),
            noted_by: user?.id || null,
            milestone_level: playerLevel
          })
          .select()
          .single()

        if (error) throw error

        setAchievedMilestones(prev => [...prev, data])

        // Check if this was milestone #30 at beginner level
        if (milestone.number === 30 && playerLevel === 'beginner') {
          // Show congrats and offer to upgrade
          if (window.confirm('🎉 CONGRATULATIONS! You completed all 30 beginner milestones!\n\nReady to level up to the Advanced ladder? Click OK to upgrade.')) {
            const { error: upgradeError } = await supabase
              .from('students')
              .update({ player_level: 'advanced' })
              .eq('id', studentId)
            
            if (!upgradeError) {
              alert('Welcome to Advanced Level! 🏆')
              window.location.reload() // Refresh to show advanced milestones
            }
          }
        }
      }
    } catch (error) {
      console.error('Error toggling milestone:', error)
    }
  }

  const isAchieved = (milestoneNumber) => {
    return achievedMilestones.some(m => m.milestone_number === milestoneNumber)
  }

  return (
    <div className="milestone-board">
      <h3>Your Progress Ladder 🎾 {playerLevel === 'advanced' && '(Advanced Level)'}</h3>
      <p>Complete milestones to level up your game!</p>
      
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="board-grid">
          {[0, 1, 2, 3, 4, 5].map(rowIndex => {
            const isReverse = rowIndex % 2 === 1
            const startNum = rowIndex * 5 + 1
            const endNum = startNum + 5
            
            let rowMilestones = milestones.slice(startNum - 1, endNum - 1)
            if (isReverse) {
              rowMilestones = rowMilestones.reverse()
            }
            
            return (
              <div key={rowIndex} className={`board-row ${isReverse ? 'reverse' : ''}`}>
                {rowMilestones.map(milestone => {
                  const achieved = isAchieved(milestone.number)
                  const nextToAchieve = !achieved && achievedMilestones.length + 1 === milestone.number
                  return (
                    <div
                      key={milestone.number}
                      className={`milestone-node ${achieved ? 'achieved' : ''} ${nextToAchieve ? 'next-up' : ''} ${isCoach ? 'clickable' : ''}`}
                      onClick={() => isCoach && handleToggleMilestone(milestone)}
                    >
                      <div className="node-circle">
                        <div className="milestone-number">{milestone.number}</div>
                        {achieved && <CheckCircle className="check-icon" size={24} />}
                      </div>
                      <div className="milestone-info">
                        <div className="milestone-name">{milestone.name}</div>
                        <div className="milestone-desc">{milestone.description}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
      
      {/* Legend */}
      <div className="board-legend">
        <div className="legend-item">
          <div className="legend-node achieved">
            <CheckCircle size={16} color="white" />
          </div>
          <span>Completed</span>
        </div>
        <div className="legend-item">
          <div className="legend-node"></div>
          <span>Not Yet</span>
        </div>
        {isCoach && (
          <div className="legend-hint">
            💡 Click any milestone to mark as achieved
          </div>
        )}
      </div>
    </div>
  )
}


