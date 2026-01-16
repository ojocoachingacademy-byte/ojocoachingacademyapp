import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import DevelopmentPlanCard from '../DevelopmentPlan/DevelopmentPlanCard'
import './SkillRatings.css'

/**
 * SkillRatings component - Shows skill progress over time
 */
const SkillRatings = ({ studentId, studentData }) => {
  const [skillRatings, setSkillRatings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (studentId || studentData?.development_plan) {
      fetchSkillRatings()
    }
  }, [studentId, studentData])

  const fetchSkillRatings = async () => {
    try {
      // Get skill ratings from development plan
      let plan = null
      if (studentData?.development_plan) {
        try {
          plan = typeof studentData.development_plan === 'string' 
            ? JSON.parse(studentData.development_plan) 
            : studentData.development_plan
        } catch (e) {
          console.error('Error parsing development plan:', e)
        }
      }

      if (plan?.section2?.skillRatings) {
        // New structure
        const skills = Object.entries(plan.section2.skillRatings).map(([key, currentLevel]) => {
          const targetLevel = plan.section2.targetRatings?.[key] || currentLevel
          const skillName = key.charAt(0).toUpperCase() + key.slice(1)
          return {
            skill_name: skillName,
            current_level: currentLevel || 0,
            target_level: targetLevel || 0
          }
        })
        setSkillRatings(skills)
      } else if (plan?.skills && plan.skills.length > 0) {
        // Old structure
        const skills = plan.skills.map(skill => ({
          skill_name: skill.skill_name,
          current_level: skill.current_level ?? skill.student_assessment ?? 0,
          target_level: skill.target_level ?? 0,
          notes: skill.notes
        }))
        setSkillRatings(skills)
      } else {
        setSkillRatings([])
      }

    } catch (error) {
      console.error('Error fetching skill ratings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="skill-ratings-loading">
        <p>Loading skill ratings...</p>
      </div>
    )
  }

  if (skillRatings.length === 0) {
    return (
      <div className="no-skill-ratings">
        <p>Complete your development plan to see your skill ratings</p>
      </div>
    )
  }

  return (
    <div className="skill-ratings">
      <div className="skills-grid">
        {skillRatings.map((skill, index) => (
          <DevelopmentPlanCard
            key={index}
            focusArea={skill}
          />
        ))}
      </div>
    </div>
  )
}

export default SkillRatings


