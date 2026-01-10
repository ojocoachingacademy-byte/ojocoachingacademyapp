import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { GOAL_OPTIONS, SUNDAY_VISION_OPTIONS, SKILL_AREAS, MILESTONES } from './MilestonesConstants'
import MilestoneTracker from './MilestoneTracker'
import './DevelopmentPlanForm.css'

export default function DevelopmentPlanForm({ student, onSave, onCancel, isStudent = false }) {
  // Section 1: Student's Why
  const [triggerReason, setTriggerReason] = useState('')
  const [bigGoal, setBigGoal] = useState('')
  const [customGoal, setCustomGoal] = useState('')
  const [sundayVision, setSundayVision] = useState('')
  const [customSundayVision, setCustomSundayVision] = useState('')
  
  // Section 2: Skill Ratings
  const [skillRatings, setSkillRatings] = useState({
    forehand: null,
    backhand: null,
    serve: null,
    net: null,
    movement: null
  })
  
  const [targetRatings, setTargetRatings] = useState({
    forehand: 0,
    backhand: 0,
    serve: 0,
    net: 0,
    movement: 0
  })
  
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    console.log('=== DEVELOPMENT PLAN FORM INITIALIZATION ===')
    console.log('Student prop:', student)

    // Load existing plan if available
    if (student?.development_plan) {
      try {
        console.log('Loading existing development plan')
        const plan = typeof student.development_plan === 'string' 
          ? JSON.parse(student.development_plan) 
          : student.development_plan
        
        console.log('Parsed plan:', plan)
        
        // Load Section 1 (Student's Why)
        if (plan.section1) {
          setTriggerReason(plan.section1.triggerReason || '')
          // Handle both 'custom' and 'other' for backward compatibility
          const goalValue = plan.section1.bigGoal === 'other' ? 'custom' : (plan.section1.bigGoal || '')
          setBigGoal(goalValue)
          setCustomGoal(plan.section1.customGoal || '')
          // Check if sundayVision is a custom value (not in SUNDAY_VISION_OPTIONS)
          const visionValue = plan.section1.sundayVision || ''
          const isCustomVision = visionValue && !SUNDAY_VISION_OPTIONS.includes(visionValue)
          setSundayVision(isCustomVision ? 'custom' : visionValue)
          setCustomSundayVision(isCustomVision ? visionValue : (plan.section1.customSundayVision || ''))
        }
        
        // Load Section 2 (Skill Ratings)
        if (plan.section2 && plan.section2.skillRatings) {
          setSkillRatings({
            forehand: plan.section2.skillRatings.forehand ?? null,
            backhand: plan.section2.skillRatings.backhand ?? null,
            serve: plan.section2.skillRatings.serve ?? null,
            net: plan.section2.skillRatings.net ?? null,
            movement: plan.section2.skillRatings.movement ?? null
          })
        }
        
        // Load Target Ratings
        if (plan.section2 && plan.section2.targetRatings) {
          setTargetRatings({
            forehand: plan.section2.targetRatings.forehand ?? 0,
            backhand: plan.section2.targetRatings.backhand ?? 0,
            serve: plan.section2.targetRatings.serve ?? 0,
            net: plan.section2.targetRatings.net ?? 0,
            movement: plan.section2.targetRatings.movement ?? 0
          })
        }
        
        // Migrate old format if it exists (for backward compatibility)
        if (plan.skills && !plan.section2) {
          // Try to map old skills to new structure
          const oldSkillRatings = {}
          plan.skills.forEach(skill => {
            const skillKey = skill.skill_name.toLowerCase()
            if (skillKey.includes('forehand')) {
              oldSkillRatings.forehand = skill.current_level ?? skill.student_assessment ?? null
            } else if (skillKey.includes('backhand')) {
              oldSkillRatings.backhand = skill.current_level ?? skill.student_assessment ?? null
            } else if (skillKey.includes('serve')) {
              oldSkillRatings.serve = skill.current_level ?? skill.student_assessment ?? null
            } else if (skillKey.includes('volley') || skillKey.includes('net')) {
              oldSkillRatings.net = skill.current_level ?? skill.student_assessment ?? null
            } else if (skillKey.includes('footwork') || skillKey.includes('movement')) {
              oldSkillRatings.movement = skill.current_level ?? skill.student_assessment ?? null
            }
          })
          setSkillRatings(prev => ({ ...prev, ...oldSkillRatings }))
        }
        
        if (plan.goals && !plan.section1) {
          // Migrate old goals format
          setTriggerReason(plan.goals.inspiration || '')
          setSundayVision(plan.goals.successLookLike || '')
        }
      } catch (error) {
        console.error('Error parsing development plan:', error)
      }
    }
    
    console.log('=== INITIALIZATION COMPLETE ===')
  }, [student])

  // Auto-fill target ratings based on bigGoal
  useEffect(() => {
    if (!bigGoal || bigGoal === 'custom') return

    const goal = GOAL_OPTIONS.find(g => g.value === bigGoal)
    if (!goal || !goal.targetMilestone) return

    let targetValue = 5 // Default
    
    if (goal.targetMilestone <= 15) {
      targetValue = 5
    } else if (goal.targetMilestone <= 20) {
      targetValue = 6
    } else {
      targetValue = 7
    }

    setTargetRatings({
      forehand: targetValue,
      backhand: targetValue,
      serve: targetValue,
      net: targetValue,
      movement: targetValue
    })
  }, [bigGoal])

  const handleSkillRatingChange = (skillKey, value) => {
    setSkillRatings(prev => ({
      ...prev,
      [skillKey]: parseInt(value) || null
    }))
  }

  const handleTargetRatingChange = (skillKey, value) => {
    const currentRating = skillRatings[skillKey] || 0
    const targetValue = parseInt(value) || 0
    
    // Ensure target is >= current rating
    if (targetValue >= currentRating) {
      setTargetRatings(prev => ({
        ...prev,
        [skillKey]: targetValue
      }))
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      console.log('=== DEVELOPMENT PLAN FORM SAVE ===')
      console.log('Section 1:', { triggerReason, bigGoal, customGoal, sundayVision, customSundayVision })
      console.log('Section 2 (Skill Ratings):', skillRatings)
      console.log('Section 2 (Target Ratings):', targetRatings)
      console.log('Is student:', isStudent)
      
      const developmentPlan = {
        section1: {
          triggerReason,
          bigGoal,
          customGoal,
          sundayVision: sundayVision === 'custom' ? customSundayVision : sundayVision,
          customSundayVision: sundayVision === 'custom' ? customSundayVision : ''
        },
        section2: {
          skillRatings,
          targetRatings
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      console.log('Full development plan object:', developmentPlan)
      const planJsonString = JSON.stringify(developmentPlan)
      console.log('JSON stringified plan:', planJsonString)

      const saveData = {
        development_plan: planJsonString
      }

      console.log('Final save payload:', saveData)
      console.log('Calling onSave with data:', saveData)
      await onSave(saveData)
      console.log('onSave completed successfully')
      
      // Save skill progress snapshot for progress tracking
      await saveSkillProgressSnapshot(student?.id, skillRatings)
      
    } catch (error) {
      console.error('Error saving development plan:', error)
      alert('Error saving development plan: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const saveSkillProgressSnapshot = async (studentId, skillRatings) => {
    if (!studentId || !skillRatings) return
    
    try {
      // Get previous snapshots to calculate changes
      const { data: prevSnapshots } = await supabase
        .from('skill_progress_snapshots')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5)
      
      const prevMap = {}
      if (prevSnapshots) {
        prevSnapshots.forEach(prev => {
          if (!prevMap[prev.skill_name]) {
            prevMap[prev.skill_name] = prev
          }
        })
      }
      
      // Create snapshots for each skill area
      const snapshots = Object.entries(skillRatings)
        .filter(([_, rating]) => rating > 0 && rating !== null)
        .map(([skillKey, rating]) => {
          const skillArea = SKILL_AREAS.find(s => s.key === skillKey)
          const skillName = skillArea?.name || skillKey
          const prev = prevMap[skillName]
          // Check both student_assessment and current_level for backward compatibility
          const prevRating = prev?.student_assessment ?? prev?.current_level ?? null
          const change = prevRating !== null ? rating - prevRating : null
          
          return {
            student_id: studentId,
            skill_name: skillName,
            student_assessment: rating,
            student_change: change,
            created_at: new Date().toISOString()
          }
        })
      
      if (snapshots.length > 0) {
        const { error } = await supabase
          .from('skill_progress_snapshots')
          .insert(snapshots)
        
        if (error) {
          console.error('Error saving snapshots:', error)
        }
      }
    } catch (error) {
      console.error('Error in saveSkillProgressSnapshot:', error)
    }
  }

  const LevelSelector = ({ value, onChange, disabledValues = [], label, maxValue = 10 }) => {
    return (
      <div className="level-selector-container">
        <div className="level-label">{label}: {value || '—'}/{maxValue}</div>
        <div className="level-buttons">
          {Array.from({ length: maxValue }, (_, i) => i + 1).map(num => {
            const isDisabled = disabledValues.includes(num)
            const isActive = value === num
            return (
              <button
                key={num}
                type="button"
                className={`level-btn ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                onClick={() => !isDisabled && onChange(num)}
                disabled={isDisabled}
              >
                {num}
              </button>
            )
          })}
        </div>
        {value && (
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(value / maxValue) * 100}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="development-plan-form">
      {/* SECTION 1: STUDENT'S WHY */}
      <div className="form-section">
        <h3 className="section-title">Section 1: Your Tennis Why</h3>
        
        <div className="goal-field">
          <label className="goal-label">What triggered you to get serious about lessons RIGHT NOW?</label>
          <textarea
            className="goal-textarea"
            value={triggerReason}
            onChange={(e) => setTriggerReason(e.target.value)}
            placeholder="Example: Lost to my friend Dave, tired of not being able to rally, want to join my spouse on court..."
            rows={3}
            maxLength={300}
          />
          <p className="char-count">{triggerReason.length}/300 characters</p>
        </div>

        <div className="goal-field">
          <label className="goal-label">Your big goal - what ONE thing would make these lessons worth it?</label>
          <div style={{ marginBottom: '12px' }}>
            {GOAL_OPTIONS.map(option => (
              <div key={option.value} style={{ marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="bigGoal"
                    value={option.value}
                    checked={bigGoal === option.value}
                    onChange={(e) => {
                      setBigGoal(e.target.value)
                      if (e.target.value !== 'custom') {
                        setCustomGoal('')
                      }
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  {option.label}
                </label>
              </div>
            ))}
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="bigGoal"
                  value="custom"
                  checked={bigGoal === 'custom'}
                  onChange={(e) => setBigGoal(e.target.value)}
                  style={{ marginRight: '8px' }}
                />
                Other:
              </label>
            </div>
          </div>
          {bigGoal === 'custom' && (
            <input
              type="text"
              className="goal-input"
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              placeholder="Describe your custom goal..."
            />
          )}
        </div>

        <div className="goal-field">
          <label className="goal-label">6 months from now, you've crushed it. What does a typical Sunday look like?</label>
          <div style={{ marginBottom: '12px' }}>
            {SUNDAY_VISION_OPTIONS.map((option, index) => (
              <div key={index} style={{ marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="sundayVision"
                    value={option}
                    checked={sundayVision === option}
                    onChange={(e) => {
                      setSundayVision(e.target.value)
                      if (e.target.value !== 'custom') {
                        setCustomSundayVision('')
                      }
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  {option}
                </label>
              </div>
            ))}
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="sundayVision"
                  value="custom"
                  checked={sundayVision === 'custom'}
                  onChange={(e) => setSundayVision(e.target.value)}
                  style={{ marginRight: '8px' }}
                />
                Other:
              </label>
            </div>
          </div>
          {sundayVision === 'custom' && (
            <input
              type="text"
              className="goal-input"
              value={customSundayVision}
              onChange={(e) => setCustomSundayVision(e.target.value)}
              placeholder="Describe your custom vision..."
            />
          )}
        </div>
      </div>

      {/* SECTION 2: SKILL RATINGS */}
      <div className="form-section">
        <h3 className="section-title">Section 2: Current Skill Ratings</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Rate yourself honestly on each area (1 = just starting, 10 = tournament level)
        </p>
        
        <div className="skills-rating-grid">
          {SKILL_AREAS.map(skill => {
            const currentRating = skillRatings[skill.key] || 0
            const targetRating = targetRatings[skill.key] || 0
            const progress = currentRating > 0 && targetRating > 0 ? (currentRating / targetRating) * 100 : 0
            
            return (
              <div key={skill.key} className="skill-rating-card">
                <div className="skill-rating-header">
                  <h4>{skill.name}</h4>
                  <p className="skill-question">{skill.question}</p>
                </div>
                
                <div className="skill-rating-columns">
                  {/* Current Rating Column */}
                  <div className="rating-column">
                    <div className="column-label">Current</div>
                    <div className="level-selector-container">
                      <div className="level-label">
                        {currentRating || '—'}/10
                      </div>
                      <div className="level-buttons">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                          <button
                            key={num}
                            type="button"
                            className={`level-btn ${currentRating === num ? 'active' : ''}`}
                            onClick={() => handleSkillRatingChange(skill.key, num)}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Target Rating Column */}
                  <div className="rating-column">
                    <div className="column-label">Target</div>
                    <div className="level-selector-container">
                      <div className="level-label">
                        {targetRating || '—'}/10
                      </div>
                      <div className="level-buttons">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => {
                          const disabled = num < currentRating
                          return (
                            <button
                              key={num}
                              type="button"
                              className={`level-btn ${targetRating === num ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                              onClick={() => !disabled && handleTargetRatingChange(skill.key, num)}
                              disabled={disabled}
                            >
                              {num}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {currentRating > 0 && targetRating > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#666' }}>
                      <span>Progress</span>
                      <span>{Math.min(Math.round(progress), 100)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {currentRating}/{targetRating} - {targetRating - currentRating > 0 ? `${targetRating - currentRating} to go` : 'Target reached!'}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION 3: THE COACH'S PLAN */}
      <div className="form-section">
        <h3 className="section-title">Section 3: The Coach's Plan</h3>
        
        {/* Show student's goal */}
        {bigGoal && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <strong>Student's Goal:</strong>{' '}
            {bigGoal === 'custom' ? customGoal : GOAL_OPTIONS.find(g => g.value === bigGoal)?.label}
          </div>
        )}
        
        {/* Show recommended targets based on goal */}
        {bigGoal && bigGoal !== 'custom' && (
          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <strong style={{ fontSize: '16px' }}>📋 Recommended Path:</strong>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(() => {
                const goal = GOAL_OPTIONS.find(g => g.value === bigGoal)
                if (!goal) return null
                
                const targetMilestone = MILESTONES.find(m => m.number === goal.targetMilestone)
                
                let targetSkill = 5
                if (goal.targetMilestone <= 15) {
                  targetSkill = 5
                } else if (goal.targetMilestone <= 20) {
                  targetSkill = 6
                } else {
                  targetSkill = 7
                }
                
                return (
                  <>
                    <div style={{ padding: '12px', background: 'white', borderRadius: '6px' }}>
                      🎯 <strong>Target Milestone:</strong> #{goal.targetMilestone} - {targetMilestone?.name}
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                        "{targetMilestone?.description}"
                      </div>
                    </div>
                    <div style={{ padding: '12px', background: 'white', borderRadius: '6px' }}>
                      📈 <strong>Skill Level Needed:</strong> {targetSkill}/10 in all areas
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Example Journeys */}
      <div style={{ marginTop: '40px', padding: '24px', backgroundColor: '#fef3c7', borderRadius: '12px', border: '2px solid #fbbf24' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>📊 Example Journeys</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div>
            <strong>"Start a hobby / Rally with friend"</strong><br/>
            <span style={{ fontSize: '14px', color: '#666' }}>
              🎯 Target: Milestones 1-15 | ⏱️ Timeline: 8-12 lessons | 📈 Skill Level: 4-5/10 in all areas
            </span>
          </div>
          <div>
            <strong>"Join doubles group"</strong><br/>
            <span style={{ fontSize: '14px', color: '#666' }}>
              🎯 Target: Milestones 1-20 | ⏱️ Timeline: 15-20 lessons | 📈 Skill Level: 6/10 in all areas
            </span>
          </div>
          <div>
            <strong>"Play USTA league/tournament"</strong><br/>
            <span style={{ fontSize: '14px', color: '#666' }}>
              🎯 Target: Milestones 1-28+ | ⏱️ Timeline: 25-40 lessons | 📈 Skill Level: 7-8/10 in all areas
            </span>
          </div>
        </div>
      </div>

      {/* Milestone Progress Tracker */}
      {student?.id && (
        <div className="form-section" style={{ marginTop: '40px' }}>
          <MilestoneTracker 
            studentId={student.id}
            isCoach={!isStudent}
            playerLevel={student?.player_level || 'beginner'}
          />
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="form-actions">
        {onCancel && (
          <button className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={loading}
        >
          <Save size={18} />
          {loading ? 'Saving...' : 'Save Development Plan'}
        </button>
      </div>
    </div>
  )
}
