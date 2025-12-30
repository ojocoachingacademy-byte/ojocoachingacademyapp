import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'

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

export default function DevelopmentPlanForm({ student, onSave, onCancel }) {
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
      current_level: initialLevel,
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
            return existing || defaultSkill
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
      [field]: field === 'current_level' || field === 'target_level' 
        ? parseInt(value) || 1 
        : value
    }
    setSkills(updatedSkills)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const developmentPlan = {
        skills: skills,
        goals: goals,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await onSave({
        development_plan: JSON.stringify(developmentPlan),
        development_plan_notes: coachNotes
      })
    } catch (error) {
      console.error('Error saving development plan:', error)
      alert('Error saving development plan: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px 0' }}>
      {/* SECTION A: SKILL ASSESSMENT */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--color-primary)', fontSize: '20px' }}>
          Skill Assessment
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Skill</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, width: '120px' }}>Current Level</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, width: '120px' }}>Target Level</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontWeight: 500 }}>{skill.skill_name}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={skill.current_level}
                      onChange={(e) => handleSkillChange(index, 'current_level', e.target.value)}
                      style={{
                        width: '80px',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        textAlign: 'center'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={skill.target_level}
                      onChange={(e) => handleSkillChange(index, 'target_level', e.target.value)}
                      style={{
                        width: '80px',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        textAlign: 'center'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="text"
                      value={skill.notes || ''}
                      onChange={(e) => handleSkillChange(index, 'notes', e.target.value)}
                      placeholder="Quick notes..."
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION B: GOALS & MOTIVATION */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--color-primary)', fontSize: '20px' }}>
          Goals & Motivation
        </h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label className="label">What inspired you to improve your tennis game?</label>
          <textarea
            className="input"
            value={goals.inspiration}
            onChange={(e) => setGoals({ ...goals, inspiration: e.target.value })}
            placeholder="Share what motivates you..."
            rows={3}
            maxLength={200}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {goals.inspiration.length}/200 characters
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label className="label">What level do you want to reach?</label>
          <select
            className="input"
            value={goals.targetLevel}
            onChange={(e) => setGoals({ ...goals, targetLevel: e.target.value })}
          >
            <option value="">Select a goal...</option>
            {GOAL_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label className="label">Who do you want to beat once you improve?</label>
          <input
            type="text"
            className="input"
            value={goals.wantToBeat}
            onChange={(e) => setGoals({ ...goals, wantToBeat: e.target.value })}
            placeholder="e.g., My doubles partner, the club champion, my sibling..."
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label className="label">What would success look like for you?</label>
          <textarea
            className="input"
            value={goals.successLookLike}
            onChange={(e) => setGoals({ ...goals, successLookLike: e.target.value })}
            placeholder="Describe your vision of success..."
            rows={3}
            maxLength={200}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {goals.successLookLike.length}/200 characters
          </p>
        </div>
      </div>

      {/* SECTION C: COACH NOTES */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--color-primary)', fontSize: '20px' }}>
          Coach Notes
        </h3>
        <textarea
          className="input"
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
          placeholder="Overall assessment, recommendations, areas to focus on..."
          rows={6}
        />
      </div>

      {/* ACTION BUTTONS */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #eee' }}>
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

