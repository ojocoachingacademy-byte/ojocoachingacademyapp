import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import './StudentPracticePlans.css'

export default function StudentPracticePlans({ studentId }) {
  const [practicePlans, setPracticePlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (studentId) {
      fetchPracticePlans()
    }
  }, [studentId])

  const fetchPracticePlans = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, lesson_date, practice_plan, practice_plan_time_estimate, practice_plan_completed, practice_plan_completed_at')
        .eq('student_id', studentId)
        .not('practice_plan', 'is', null)
        .order('lesson_date', { ascending: false })
        .limit(20)
      
      if (error) throw error
      
      setPracticePlans(data || [])
    } catch (error) {
      console.error('Error fetching practice plans:', error)
      setPracticePlans([])
    } finally {
      setLoading(false)
    }
  }

  const completionRate = practicePlans.length > 0
    ? Math.round((practicePlans.filter(p => p.practice_plan_completed).length / practicePlans.length) * 100)
    : 0

  if (loading) {
    return (
      <div className="practice-plans-tracker">
        <div className="spinner"></div>
        <p style={{ textAlign: 'center', color: '#666', marginTop: '16px' }}>Loading practice plans...</p>
      </div>
    )
  }

  if (practicePlans.length === 0) {
    return (
      <div className="practice-plans-tracker">
        <div className="tracker-header">
          <h3>Practice Plan Completion</h3>
        </div>
        <div className="empty-state">
          <p>No practice plans assigned yet</p>
          <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
            Practice plans will appear here after you assign them during lesson feedback.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="practice-plans-tracker">
      <div className="tracker-header">
        <h3>Practice Plan Completion</h3>
        <div className="completion-rate">
          <span className="rate-number">{completionRate}%</span>
          <span className="rate-label">Completion Rate</span>
        </div>
      </div>
      
      <div className="plans-list">
        {practicePlans.map(plan => (
          <div key={plan.id} className={`plan-item ${plan.practice_plan_completed ? 'completed' : 'pending'}`}>
            <div className="plan-date">
              {new Date(plan.lesson_date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
            <div className="plan-text">{plan.practice_plan}</div>
            <div className="plan-status">
              {plan.practice_plan_completed ? (
                <>
                  <span className="status-icon">✅</span>
                  <span className="status-text">Completed</span>
                  {plan.practice_plan_completed_at && (
                    <span className="status-date">
                      {new Date(plan.practice_plan_completed_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="status-icon">⏳</span>
                  <span className="status-text">Pending</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


