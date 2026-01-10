import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import './ProgressChart.css'

export default function ProgressChart({ studentId, skillName }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (studentId && skillName) {
      fetchProgressData()
    }
  }, [studentId, skillName])

  const fetchProgressData = async () => {
    try {
      const { data: assessments, error } = await supabase
        .from('skill_assessments')
        .select('*')
        .eq('student_id', studentId)
        .eq('skill_name', skillName)
        .order('assessed_at', { ascending: true })

      if (error) throw error

      // Format data for chart
      const chartData = (assessments || []).map(assessment => ({
        date: new Date(assessment.assessed_at).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        student: assessment.student_assessment,
        coach: assessment.coach_assessment,
        fullDate: assessment.assessed_at
      }))

      setData(chartData)
    } catch (error) {
      console.error('Error fetching progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading-chart">Loading progress...</div>
  if (data.length === 0) return (
    <div className="progress-chart no-data-chart">
      <h4>{skillName}</h4>
      <div className="no-data">No assessment history yet</div>
    </div>
  )

  const improvement = data.length > 1 
    ? (data[data.length - 1].student || data[data.length - 1].coach || 0) - (data[0].student || data[0].coach || 0)
    : 0

  return (
    <div className="progress-chart">
      <h4>{skillName}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#666' }}
            axisLine={{ stroke: '#E0E0E0' }}
          />
          <YAxis 
            domain={[0, 10]} 
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fontSize: 12, fill: '#666' }}
            axisLine={{ stroke: '#E0E0E0' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="student" 
            stroke="#4B2C6C" 
            strokeWidth={2}
            name="Student"
            dot={{ fill: '#4B2C6C', r: 4 }}
            connectNulls
          />
          <Line 
            type="monotone" 
            dataKey="coach" 
            stroke="#2D7F6F" 
            strokeWidth={2}
            name="Coach"
            dot={{ fill: '#2D7F6F', r: 4 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="chart-summary">
        {data.length > 1 && improvement !== 0 && (
          <p className="improvement-note">
            {improvement > 0 ? (
              <span className="positive">
                ↗ Improved by {improvement} {improvement === 1 ? 'level' : 'levels'}
              </span>
            ) : improvement < 0 ? (
              <span className="negative">
                ↘ Decreased by {Math.abs(improvement)} {Math.abs(improvement) === 1 ? 'level' : 'levels'}
              </span>
            ) : null}
          </p>
        )}
        {data.length === 1 && (
          <p className="improvement-note">
            <span>Assessment tracking started</span>
          </p>
        )}
      </div>
    </div>
  )
}

// Overall Progress Summary Component
export function OverallProgressSummary({ developmentPlan }) {
  if (!developmentPlan || !developmentPlan.skills || developmentPlan.skills.length === 0) {
    return null
  }

  const skills = developmentPlan.skills

  // Calculate average current level
  const validSkills = skills.filter(s => 
    (s.student_assessment || s.coach_assessment) && s.target_level
  )
  
  if (validSkills.length === 0) return null

  const avgCurrent = validSkills.reduce((sum, skill) => 
    sum + (skill.coach_assessment || skill.student_assessment || 0), 0
  ) / validSkills.length

  const avgTarget = validSkills.reduce((sum, skill) => 
    sum + skill.target_level, 0
  ) / validSkills.length

  const progressPercent = Math.min(Math.round((avgCurrent / avgTarget) * 100), 100)

  return (
    <div className="overall-progress-card">
      <div className="progress-header">
        <h3>Overall Progress</h3>
        <span className="progress-percent">{progressPercent}%</span>
      </div>
      <div className="progress-bar-large">
        <div 
          className="progress-fill"
          style={{ 
            width: `${progressPercent}%`,
            backgroundColor: progressPercent >= 80 ? '#28a745' : progressPercent >= 50 ? '#F4C430' : '#4B2C6C'
          }}
        />
      </div>
      <div className="progress-stats">
        <div className="stat">
          <span className="stat-label">Current Avg</span>
          <span className="stat-value">{avgCurrent.toFixed(1)}/10</span>
        </div>
        <div className="stat">
          <span className="stat-label">Target Avg</span>
          <span className="stat-value">{avgTarget.toFixed(1)}/10</span>
        </div>
        <div className="stat">
          <span className="stat-label">Skills Tracked</span>
          <span className="stat-value">{validSkills.length}</span>
        </div>
      </div>
    </div>
  )
}


