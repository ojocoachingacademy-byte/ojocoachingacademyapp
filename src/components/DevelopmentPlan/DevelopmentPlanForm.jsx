import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import './DevelopmentPlanForm.css'

const ALL_SKILLS = [
  'Forehand Groundstroke',
  'Backhand Groundstroke',
  'Forehand Volley',
  'Backhand Volley',
  'First Serve',
  'Second Serve',
  'Return of Serve',
  'Overhead/Smash',
  'Footwork & Movement',
  'Court Positioning',
  'Mental Game',
  'Match Strategy'
]

const GOAL_OPTIONS = [
  'Rally with friends',
  'Play sets',
  'Attend clinics',
  'Join a club',
  'Play in a social league',
  'Join a USTA league',
  'Play tournaments'
]

const getInitialLevel = (ntrpLevel) => {
  const ntrp = parseFloat(ntrpLevel) || 3.0
  
  if (ntrp <= 2.5) return 2
  if (ntrp <= 3.0) return 3
  if (ntrp <= 3.5) return 4
  if (ntrp <= 4.0) return 5
  if (ntrp <= 4.5) return 6
  return 7
}

export default function DevelopmentPlanForm({ student, onSave, onCancel, isStudent = false }) {
  const [skills, setSkills] = useState([])
  const [goals, setGoals] = useState({
    inspiration: '',
    targetLevel: '',
    wantToBeat: '',
    successLookLike: ''
  })
  const [coachNotes, setCoachNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Initialize skills based on NTRP level
    const initialLevel = getInitialLevel(student?.profiles?.ntrp_level || '3.0')
    const targetLevel = Math.min(initialLevel + 2, 10)
    
    const initialSkills = ALL_SKILLS.map(skillName => ({
      skill_name: skillName,
      student_assessment: initialLevel,
      coach_assessment: null,
      target_level: targetLevel,
      notes: ''
    }))

    // Load existing plan if available
    if (student?.development_plan) {
      try {
        const plan = typeof student.development_plan === 'string' 
          ? JSON.parse(student.development_plan) 
          : student.development_plan
        
        if (plan.skills) {
          // Merge existing skills with defaults
          const existingSkills = plan.skills
          const mergedSkills = initialSkills.map(defaultSkill => {
            const existing = existingSkills.find(s => s.skill_name === defaultSkill.skill_name)
            if (existing) {
              // Migrate old structure (current_level) to new structure
              return {
                skill_name: existing.skill_name,
                student_assessment: existing.student_assessment ?? existing.current_level ?? defaultSkill.student_assessment,
                coach_assessment: existing.coach_assessment ?? null,
                target_level: existing.target_level ?? defaultSkill.target_level,
                notes: existing.notes ?? ''
              }
            }
            return defaultSkill
          })
          setSkills(mergedSkills)
        } else {
          setSkills(initialSkills)
        }

        if (plan.goals) {
          setGoals(plan.goals)
        }
      } catch (error) {
        console.error('Error parsing development plan:', error)
        setSkills(initialSkills)
      }
    } else {
      setSkills(initialSkills)
    }

    // Load coach notes
    if (student?.development_plan_notes) {
      setCoachNotes(student.development_plan_notes)
    }
  }, [student])

  const handleSkillChange = (index, field, value) => {
    const updatedSkills = [...skills]
    updatedSkills[index] = {
      ...updatedSkills[index],
      [field]: field === 'student_assessment' || field === 'coach_assessment' || field === 'target_level'
        ? parseInt(value) || null
        : value
    }
    
    // Ensure target is not lower than student or coach assessment
    const skill = updatedSkills[index]
    if (field === 'target_level' && (skill.student_assessment || skill.coach_assessment)) {
      const maxAssessment = Math.max(skill.student_assessment || 0, skill.coach_assessment || 0)
      if (value < maxAssessment) {
        updatedSkills[index].target_level = maxAssessment
      }
    }
    
    setSkills(updatedSkills)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      console.log('=== DEVELOPMENT PLAN FORM SAVE ===')
      console.log('Skills:', skills)
      console.log('Goals:', goals)
      console.log('Coach notes:', coachNotes)
      console.log('Is student:', isStudent)
      
      const developmentPlan = {
        skills: skills,
        goals: goals,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      console.log('Development plan object:', developmentPlan)
      const planJsonString = JSON.stringify(developmentPlan)
      console.log('JSON stringified plan:', planJsonString)
      console.log('JSON string length:', planJsonString.length)

      const saveData = {
        development_plan: planJsonString,
        development_plan_notes: isStudent ? undefined : coachNotes // Only coaches can save notes
      }

      console.log('Calling onSave with data:', saveData)
      await onSave(saveData)
      console.log('onSave completed successfully')
    } catch (error) {
      console.error('Error saving development plan:', error)
      alert('Error saving development plan: ' + error.message)
    } finally {
      setLoading(false)
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
      {/* SECTION A: SKILL ASSESSMENT */}
      <div className="form-section">
        <h3 className="section-title">Skill Assessment</h3>
        <div className="table-wrapper">
          <table className="skills-table">
            <thead>
              <tr>
                <th className="skill-name-header">Skill</th>
                <th className="assessment-header">Student Assessment</th>
                <th className="assessment-header">Coach Assessment</th>
                <th className="assessment-header">Target</th>
                <th className="notes-header">Notes</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill, index) => {
                const studentLevel = skill.student_assessment || null
                const coachLevel = skill.coach_assessment || null
                const targetLevel = skill.target_level || null
                const maxAssessment = Math.max(studentLevel || 0, coachLevel || 0)
                const disabledTargetValues = maxAssessment > 0 ? Array.from({ length: maxAssessment }, (_, i) => i + 1) : []

                return (
                  <tr key={index} className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
                    <td className="skill-name-cell">
                      <strong>{skill.skill_name}</strong>
                    </td>
                    <td className="assessment-cell">
                      <LevelSelector
                        value={studentLevel}
                        onChange={(val) => handleSkillChange(index, 'student_assessment', val)}
                        disabledValues={[]}
                        label="Current"
                        maxValue={10}
                      />
                      {studentLevel && targetLevel && studentLevel < targetLevel && (
                        <div className="improvement-indicator">
                          +{targetLevel - studentLevel} to target
                        </div>
                      )}
                    </td>
                    <td className="assessment-cell">
                      {!isStudent ? (
                        <LevelSelector
                          value={coachLevel}
                          onChange={(val) => handleSkillChange(index, 'coach_assessment', val)}
                          disabledValues={[]}
                          label="Coach"
                          maxValue={10}
                        />
                      ) : (
                        <div className="level-selector-container">
                          <div className="level-label">Coach: {coachLevel ? `${coachLevel}/10` : '—'}</div>
                          {coachLevel && (
                            <div className="progress-bar">
                              <div 
                                className="progress-fill coach-progress" 
                                style={{ width: `${(coachLevel / 10) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="assessment-cell">
                      <LevelSelector
                        value={targetLevel}
                        onChange={(val) => handleSkillChange(index, 'target_level', val)}
                        disabledValues={disabledTargetValues}
                        label="Target"
                        maxValue={10}
                      />
                    </td>
                    <td className="notes-cell">
                      <input
                        type="text"
                        value={skill.notes || ''}
                        onChange={(e) => handleSkillChange(index, 'notes', e.target.value)}
                        placeholder="Quick notes..."
                        className="notes-input"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION B: GOALS & MOTIVATION */}
      <div className="form-section">
        <h3 className="section-title">Goals & Motivation</h3>
        
        <div className="goal-field">
          <label className="goal-label">What inspired you to improve your tennis game?</label>
          <textarea
            className="goal-textarea"
            value={goals.inspiration}
            onChange={(e) => setGoals({ ...goals, inspiration: e.target.value })}
            placeholder="Share what motivates you..."
            rows={3}
            maxLength={200}
          />
          <p className="char-count">
            {goals.inspiration.length}/200 characters
          </p>
        </div>

        <div className="goal-field">
          <label className="goal-label">What level do you want to reach?</label>
          <select
            className="goal-select"
            value={goals.targetLevel}
            onChange={(e) => setGoals({ ...goals, targetLevel: e.target.value })}
          >
            <option value="">Select a goal...</option>
            {GOAL_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="goal-field">
          <label className="goal-label">Who do you want to beat once you improve?</label>
          <input
            type="text"
            className="goal-input"
            value={goals.wantToBeat}
            onChange={(e) => setGoals({ ...goals, wantToBeat: e.target.value })}
            placeholder="e.g., My doubles partner, the club champion, my sibling..."
          />
        </div>

        <div className="goal-field">
          <label className="goal-label">What would success look like for you?</label>
          <textarea
            className="goal-textarea"
            value={goals.successLookLike}
            onChange={(e) => setGoals({ ...goals, successLookLike: e.target.value })}
            placeholder="Describe your vision of success..."
            rows={3}
            maxLength={200}
          />
          <p className="char-count">
            {goals.successLookLike.length}/200 characters
          </p>
        </div>
      </div>

      {/* SECTION C: COACH NOTES (only for coaches) */}
      {!isStudent && (
        <div className="form-section">
          <h3 className="section-title">Coach Notes</h3>
          <textarea
            className="coach-notes-textarea"
            value={coachNotes}
            onChange={(e) => setCoachNotes(e.target.value)}
            placeholder="Overall assessment, recommendations, areas to focus on..."
            rows={6}
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
