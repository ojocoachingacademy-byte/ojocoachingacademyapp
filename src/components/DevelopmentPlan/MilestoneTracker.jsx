import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { getMilestonesByLevel } from './MilestonesConstants'
import { CheckCircle, Target } from 'lucide-react'
import './MilestoneTracker.css'

function renderCampMountain(campStart, campEnd, campLayout) {
  return null; // temporary
}

export default function MilestoneTracker({ studentId, isCoach = false, playerLevel = 'beginner', highlightTargetMilestone = null }) {
  const [achievedMilestones, setAchievedMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null)
  const containerRef = useRef(null)
  
  const milestones = getMilestonesByLevel(playerLevel)
  
  // Click outside to deselect
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setSelectedMilestoneId(null)
      }
    }
    
    if (selectedMilestoneId !== null) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [selectedMilestoneId])

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

  // Helper function to determine camp status
  const getCampProgress = (campStart, campEnd) => {
    const campMilestones = milestones.slice(campStart - 1, campEnd)
    const achieved = campMilestones.filter(m => isAchieved(m.number)).length
    const total = campMilestones.length
    const isComplete = achieved === total
    const isCurrent = achieved > 0 && !isComplete
    const isLocked = achieved === 0
    
    return { achieved, total, isComplete, isCurrent, isLocked }
  }

  // Define 5 camps
  const rookieCampProgress = getCampProgress(1, 6)
  const learnerCampProgress = getCampProgress(7, 12)
  const competitorCampProgress = getCampProgress(13, 18)
  const advancedCampProgress = getCampProgress(19, 24)
  const eliteCampProgress = getCampProgress(25, 30)

  // Find which camp the user is currently on (has progress but not complete)
  const getCurrentCamp = () => {
    // Check if any camp has progress but isn't complete
    if (eliteCampProgress.isCurrent) return 'elite'
    if (advancedCampProgress.isCurrent) return 'advanced'
    if (competitorCampProgress.isCurrent) return 'competitor'
    if (learnerCampProgress.isCurrent) return 'learner'
    if (rookieCampProgress.isCurrent) return 'rookie'
    
    // If no camp has progress, check which camp contains the next milestone
    const nextMilestoneNumber = achievedMilestones.length + 1
    if (nextMilestoneNumber >= 25 && nextMilestoneNumber <= 30) return 'elite'
    if (nextMilestoneNumber >= 19 && nextMilestoneNumber <= 24) return 'advanced'
    if (nextMilestoneNumber >= 13 && nextMilestoneNumber <= 18) return 'competitor'
    if (nextMilestoneNumber >= 7 && nextMilestoneNumber <= 12) return 'learner'
    return 'rookie'
  }

  const [expandedCamp, setExpandedCamp] = useState(() => {
    return getCurrentCamp()
  })

  // Update expanded camp when achievements change
  useEffect(() => {
    if (!loading) {
      const currentCamp = getCurrentCamp()
      setExpandedCamp(currentCamp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, achievedMilestones.length])

  // Pyramid layout: 1-2-3 structure (6 nodes total)
  //     6
  //    4 5
  //   1 2 3
  const campPyramidLayout = [
    { start: 5, count: 1, isReverse: false },  // Top: [6]
    { start: 3, count: 2, isReverse: false },  // Middle: [4,5]
    { start: 0, count: 3, isReverse: false },  // Base: [1,2,3]
  ]

  // Render camp as mini-mountain with pyramid layout (function declaration so it's in scope for all calls)
  function renderCampMountain (campStart, campEnd, campLayout) {
    const campMilestones = milestones.slice(campStart - 1, campEnd)
    
    return (
      <div className="mini-mountain">
        {campLayout.map((rowConfig, rowIndex) => {
          const { start, count, isReverse } = rowConfig
          const rowMilestones = campMilestones.slice(start, start + count)
          
          const rowMilestonesToRender = isReverse ? [...rowMilestones].reverse() : rowMilestones
          
          return (
            <div key={rowIndex} className={`mountain-row ${isReverse ? 'reverse' : ''}`}>
              {rowMilestonesToRender.map(milestone => {
                const achieved = isAchieved(milestone.number)
                const nextToAchieve = !achieved && achievedMilestones.length + 1 === milestone.number
                const isTarget = highlightTargetMilestone && milestone.number === highlightTargetMilestone
                const isSelected = selectedMilestoneId === milestone.number
                const isTopNode = rowIndex === 0
                
                return (
                  <div
                    key={milestone.number}
                    className={`milestone-node ${achieved ? 'achieved' : ''} ${nextToAchieve ? 'next-up' : ''} ${isTarget ? 'target-milestone' : ''} ${isCoach ? 'clickable' : ''} ${isSelected ? 'selected' : ''} ${isTopNode ? 'summit-node' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation() // Prevent camp header toggle
                      if (isCoach) {
                        handleToggleMilestone(milestone)
                      } else {
                        // Toggle selection for non-coaches (viewing only)
                        setSelectedMilestoneId(isSelected ? null : milestone.number)
                      }
                    }}
                    onTouchStart={(e) => {
                      // Mobile tap feedback
                      e.currentTarget.classList.add('pressing')
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.classList.remove('pressing')
                    }}
                    onMouseDown={(e) => {
                      if (isCoach) {
                        e.currentTarget.classList.add('pressing')
                      }
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.classList.remove('pressing')
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.classList.remove('pressing')
                    }}
                  >
                    <div className="node-circle">
                      <div className="milestone-number">{milestone.number}</div>
                      {achieved && <CheckCircle className="check-icon" size={24} />}
                      {isTarget && !achieved && <Target className="target-icon" size={20} />}
                      {isTarget && achieved && <Target className="target-icon achieved-target" size={20} />}
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
    )
  }

  console.log('renderCampMountain is', typeof renderCampMountain);

  return (
    <div className="mountain-journey" ref={containerRef}>
      {loading ? (
        <div className="loading-state">Loading your journey...</div>
      ) : (
        <>
          {/* Mountain Header */}
          <div className="mountain-header">
            <div className="mountain-icon">🏔️</div>
            <h2>Your Tennis Mountain Journey</h2>
            <p className="journey-subtitle">
              {achievedMilestones.length} of 30 milestones completed
            </p>
          </div>

          {/* Camp Sections */}
          <div className="camps-container">
            
            {/* ELITE CAMP (25-30) */}
            <div className={`camp-section elite ${eliteCampProgress.isLocked && !isCoach ? 'locked' : ''} ${expandedCamp === 'elite' ? 'expanded' : ''}`}>
              <div 
                className="camp-header"
                onClick={() => (!eliteCampProgress.isLocked || isCoach) && setExpandedCamp(expandedCamp === 'elite' ? null : 'elite')}
              >
                <div className="camp-info">
                  <div className="camp-icon">👑</div>
                  <div>
                    <h3>ELITE</h3>
                    <p>Milestones 25-30 • Mastery</p>
                  </div>
                </div>
                <div className="camp-status">
                  {eliteCampProgress.isLocked && !isCoach ? (
                    <div className="locked-badge">🔒 Locked</div>
                  ) : eliteCampProgress.isComplete ? (
                    <div className="complete-badge">✓ Complete</div>
                  ) : (
                    <div className="progress-badge">
                      {eliteCampProgress.achieved}/{eliteCampProgress.total}
                    </div>
                  )}
                </div>
              </div>
              
              {(!eliteCampProgress.isLocked || isCoach) && (
                <>
                  <div className="camp-progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(eliteCampProgress.achieved / eliteCampProgress.total) * 100}%` }}
                    />
                  </div>
                  
                  {expandedCamp === 'elite' && (
                    <div className="camp-milestones-container camp-content-expanded">
                      {renderCampMountain(25, 30, campPyramidLayout)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ADVANCED CAMP (19-24) */}
            <div className={`camp-section advanced ${advancedCampProgress.isLocked && !isCoach ? 'locked' : ''} ${expandedCamp === 'advanced' ? 'expanded' : ''}`}>
              <div 
                className="camp-header"
                onClick={() => (!advancedCampProgress.isLocked || isCoach) && setExpandedCamp(expandedCamp === 'advanced' ? null : 'advanced')}
              >
                <div className="camp-info">
                  <div className="camp-icon">💎</div>
                  <div>
                    <h3>ADVANCED</h3>
                    <p>Milestones 19-24 • Strategic Play</p>
                  </div>
                </div>
                <div className="camp-status">
                  {advancedCampProgress.isLocked && !isCoach ? (
                    <div className="locked-badge">🔒 Locked</div>
                  ) : advancedCampProgress.isComplete ? (
                    <div className="complete-badge">✓ Complete</div>
                  ) : (
                    <div className="progress-badge">
                      {advancedCampProgress.achieved}/{advancedCampProgress.total}
                    </div>
                  )}
                </div>
              </div>
              
              {(!advancedCampProgress.isLocked || isCoach) && (
                <>
                  <div className="camp-progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(advancedCampProgress.achieved / advancedCampProgress.total) * 100}%` }}
                    />
                  </div>
                  
                  {expandedCamp === 'advanced' && (
                    <div className="camp-milestones-container">
                      {renderCampMountain(19, 24, campPyramidLayout)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* COMPETITOR CAMP (13-18) */}
            <div className={`camp-section competitor ${competitorCampProgress.isLocked && !isCoach ? 'locked' : ''} ${expandedCamp === 'competitor' ? 'expanded' : ''}`}>
              <div 
                className="camp-header"
                onClick={() => (!competitorCampProgress.isLocked || isCoach) && setExpandedCamp(expandedCamp === 'competitor' ? null : 'competitor')}
              >
                <div className="camp-info">
                  <div className="camp-icon">🎯</div>
                  <div>
                    <h3>COMPETITOR</h3>
                    <p>Milestones 13-18 • Consistent Rallies</p>
                  </div>
                </div>
                <div className="camp-status">
                  {competitorCampProgress.isLocked && !isCoach ? (
                    <div className="locked-badge">🔒 Locked</div>
                  ) : competitorCampProgress.isComplete ? (
                    <div className="complete-badge">✓ Complete</div>
                  ) : (
                    <div className="progress-badge">
                      {competitorCampProgress.achieved}/{competitorCampProgress.total}
                    </div>
                  )}
                </div>
              </div>
              
              {(!competitorCampProgress.isLocked || isCoach) && (
                <>
                  <div className="camp-progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(competitorCampProgress.achieved / competitorCampProgress.total) * 100}%` }}
                    />
                  </div>
                  
                  {expandedCamp === 'competitor' && (
                    <div className="camp-milestones-container camp-content-expanded">
                      {renderCampMountain(13, 18, campPyramidLayout)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* LEARNER CAMP (7-12) */}
            <div className={`camp-section learner ${learnerCampProgress.isLocked && !isCoach ? 'locked' : ''} ${expandedCamp === 'learner' ? 'expanded' : ''}`}>
              <div 
                className="camp-header"
                onClick={() => (!learnerCampProgress.isLocked || isCoach) && setExpandedCamp(expandedCamp === 'learner' ? null : 'learner')}
              >
                <div className="camp-info">
                  <div className="camp-icon">📚</div>
                  <div>
                    <h3>LEARNER</h3>
                    <p>Milestones 7-12 • Developing Strokes</p>
                  </div>
                </div>
                <div className="camp-status">
                  {learnerCampProgress.isLocked && !isCoach ? (
                    <div className="locked-badge">🔒 Locked</div>
                  ) : learnerCampProgress.isComplete ? (
                    <div className="complete-badge">✓ Complete</div>
                  ) : (
                    <div className="progress-badge">
                      {learnerCampProgress.achieved}/{learnerCampProgress.total}
                    </div>
                  )}
                </div>
              </div>
              
              {(!learnerCampProgress.isLocked || isCoach) && (
                <>
                  <div className="camp-progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(learnerCampProgress.achieved / learnerCampProgress.total) * 100}%` }}
                    />
                  </div>
                  
                  {expandedCamp === 'learner' && (
                    <div className="camp-milestones-container">
                      {renderCampMountain(7, 12, campPyramidLayout)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ROOKIE CAMP (1-6) */}
            <div className={`camp-section rookie ${expandedCamp === 'rookie' ? 'expanded' : ''}`}>
              <div 
                className="camp-header"
                onClick={() => setExpandedCamp(expandedCamp === 'rookie' ? null : 'rookie')}
              >
                <div className="camp-info">
                  <div className="camp-icon">🌟</div>
                  <div>
                    <h3>ROOKIE</h3>
                    <p>Milestones 1-6 • Foundation</p>
                  </div>
                </div>
                <div className="camp-status">
                  {rookieCampProgress.isComplete ? (
                    <div className="complete-badge">✓ Complete</div>
                  ) : (
                    <div className="progress-badge">
                      {rookieCampProgress.achieved}/{rookieCampProgress.total}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="camp-progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(rookieCampProgress.achieved / rookieCampProgress.total) * 100}%` }}
                />
              </div>
              
              {expandedCamp === 'rookie' && (
                <div className="camp-milestones-container camp-content-expanded">
                  {renderCampMountain(1, 6, campPyramidLayout)}
                </div>
              )}
            </div>
            
          </div>

          {/* Legend */}
          <div className="journey-legend">
            <div className="legend-item">
              <CheckCircle size={16} color="#10B981" />
              <span>Completed</span>
            </div>
            <div className="legend-item">
              <div className="next-badge-small">NEXT</div>
              <span>Up Next</span>
            </div>
            {highlightTargetMilestone && (
              <div className="legend-item">
                <Target size={16} color="#4B2C6C" />
                <span>Your Goal</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}


