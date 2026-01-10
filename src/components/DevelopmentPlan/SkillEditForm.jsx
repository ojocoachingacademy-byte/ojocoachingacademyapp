import { useState, useEffect } from 'react'
import { Save, X } from 'lucide-react'
import { getAllSkills, getSkillLevelColor } from './DevelopmentPlanConstants'

export default function SkillEditForm({ skill, allSkills, onSave, onCancel }) {
  const [skillName, setSkillName] = useState(skill.skill_name || '')
  const [currentLevel, setCurrentLevel] = useState(skill.current_level || 1)
  const [targetLevel, setTargetLevel] = useState(skill.target_level || 3)
  const [notes, setNotes] = useState(skill.notes || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!skillName.trim()) {
      alert('Please select a skill')
      return
    }
    onSave({
      skill_name: skillName,
      current_level: currentLevel,
      target_level: targetLevel,
      notes: notes.trim() || null
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '20px 0' }}>
      <div style={{ marginBottom: '20px' }}>
        <label className="label">Skill</label>
        <select
          className="input"
          value={skillName}
          onChange={(e) => setSkillName(e.target.value)}
          required
          disabled={skill.id} // Can't change skill name if editing existing
        >
          <option value="">Select a skill...</option>
          {allSkills.map(s => (
            <option key={s.name} value={s.name}>
              {s.category} - {s.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label className="label">Current Level</label>
          <div style={{ marginBottom: '8px' }}>
            <div className="level-stars-input">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  type="button"
                  className="star-button"
                  onClick={() => setCurrentLevel(level)}
                  style={{ 
                    color: level <= currentLevel ? getSkillLevelColor(currentLevel) : '#ddd',
                    fontSize: '24px',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: '4px'
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {currentLevel}/5
            </span>
          </div>
        </div>

        <div>
          <label className="label">Target Level</label>
          <div style={{ marginBottom: '8px' }}>
            <div className="level-stars-input">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  type="button"
                  className="star-button"
                  onClick={() => setTargetLevel(level)}
                  style={{ 
                    color: level <= targetLevel ? '#4B2C6C' : '#ddd',
                    fontSize: '24px',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: '4px'
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {targetLevel}/5
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label className="label">Notes (optional)</label>
        <textarea
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about what to focus on, areas for improvement, etc."
          rows={4}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          <X size={18} />
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          <Save size={18} />
          Save Skill
        </button>
      </div>
    </form>
  )
}




