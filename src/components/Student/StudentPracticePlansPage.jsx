import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { ArrowLeft, CheckCircle, Clock, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StudentPageWrapper from '../Layout/StudentPageWrapper'
import './StudentPracticePlansPage.css'

export default function StudentPracticePlansPage() {
  const navigate = useNavigate()
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedPlanId, setExpandedPlanId] = useState(null)
  const [completingPlanId, setCompletingPlanId] = useState(null)

  useEffect(() => {
    fetchPracticePlans()
  }, [])

  const fetchPracticePlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch all lessons with practice plans
      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', user.id)
        .not('practice_plan', 'is', null)
        .order('lesson_date', { ascending: false })

      if (error) throw error

      setLessons(lessonsData || [])
    } catch (error) {
      console.error('Error fetching practice plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkComplete = async (lessonId) => {
    setCompletingPlanId(lessonId)
    try {
      const { error } = await supabase
        .from('lessons')
        .update({
          practice_plan_completed: true,
          practice_plan_completed_at: new Date().toISOString()
        })
        .eq('id', lessonId)

      if (error) throw error

      // Update local state
      setLessons(prev => prev.map(lesson =>
        lesson.id === lessonId
          ? { ...lesson, practice_plan_completed: true, practice_plan_completed_at: new Date().toISOString() }
          : lesson
      ))
    } catch (error) {
      console.error('Error marking plan complete:', error)
      alert('Failed to mark plan as complete. Please try again.')
    } finally {
      setCompletingPlanId(null)
    }
  }

  // Separate current and completed plans
  const currentPlans = lessons.filter(l => !l.practice_plan_completed)
  const completedPlans = lessons.filter(l => l.practice_plan_completed)

  // Stats
  const totalPlans = lessons.length
  const completedCount = completedPlans.length
  const completionRate = totalPlans > 0 ? Math.round((completedCount / totalPlans) * 100) : 0

  return (
    <StudentPageWrapper>
      <div
        className="student-practice-plans-page"
        style={{
          padding: '24px',
          maxWidth: '900px',
          margin: '0 auto',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom))'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#6366f1',
              padding: 0
            }}
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          🎯 My Practice Plans
        </h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>
          Independent practice between lessons to reinforce what you've learned
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            Loading practice plans...
          </div>
        ) : totalPlans === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#f9fafb',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎾</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              No Practice Plans Yet
            </h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Your coach will create practice plans for you after lessons to help you improve between sessions.
            </p>
          </div>
        ) : (
          <>
            {/* Stats Card */}
            <div style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '32px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '20px'
            }}>
              <div>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>
                  Total Plans
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700 }}>
                  {totalPlans}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>
                  Completed
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700 }}>
                  {completedCount}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>
                  Completion Rate
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700 }}>
                  {completionRate}%
                </div>
              </div>
            </div>

            {/* Current Practice Plans */}
            {currentPlans.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
                  Current Practice Plans ({currentPlans.length})
                </h2>
                {currentPlans.map(lesson => (
                  <div key={lesson.id} style={{
                    background: '#fff7ed',
                    border: '2px solid #fb923c',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Calendar size={16} color="#ea580c" />
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#ea580c' }}>
                            From lesson on {new Date(lesson.lesson_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        {lesson.practice_plan_time_estimate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={14} color="#666" />
                            <span style={{ fontSize: '13px', color: '#666' }}>
                              {lesson.practice_plan_time_estimate} minutes
                            </span>
                          </div>
                        )}
                      </div>
                      <span style={{
                        padding: '4px 12px',
                        background: '#fb923c',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        ACTIVE
                      </span>
                    </div>

                    <div style={{
                      background: 'white',
                      padding: '16px',
                      borderRadius: '8px',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.6',
                      fontSize: '15px',
                      marginBottom: '16px'
                    }}>
                      {lesson.practice_plan}
                    </div>

                    <button
                      onClick={() => handleMarkComplete(lesson.id)}
                      disabled={completingPlanId === lesson.id}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#22c55e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: completingPlanId === lesson.id ? 'not-allowed' : 'pointer',
                        opacity: completingPlanId === lesson.id ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {completingPlanId === lesson.id ? (
                        'Marking Complete...'
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          Mark as Complete
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Completed Practice Plans */}
            {completedPlans.length > 0 && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
                  Completed Practice Plans ({completedPlans.length})
                </h2>
                {completedPlans.map(lesson => {
                  const isExpanded = expandedPlanId === lesson.id

                  return (
                    <div key={lesson.id} style={{
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      overflow: 'hidden'
                    }}>
                      <div
                        onClick={() => setExpandedPlanId(isExpanded ? null : lesson.id)}
                        style={{
                          padding: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <CheckCircle size={16} color="#22c55e" />
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>
                              {new Date(lesson.lesson_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#666' }}>
                            Completed {lesson.practice_plan_completed_at && new Date(lesson.practice_plan_completed_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                        <span style={{ fontSize: '20px', color: '#9ca3af' }}>
                          {isExpanded ? '−' : '+'}
                        </span>
                      </div>

                      {isExpanded && (
                        <div style={{
                          padding: '0 16px 16px 16px',
                          background: '#f9fafb',
                          borderTop: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.6',
                            fontSize: '14px',
                            color: '#374151',
                            marginTop: '12px'
                          }}>
                            {lesson.practice_plan}
                          </div>
                          {lesson.practice_plan_time_estimate && (
                            <div style={{
                              marginTop: '12px',
                              fontSize: '13px',
                              color: '#666',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <Clock size={14} />
                              {lesson.practice_plan_time_estimate} minutes
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </StudentPageWrapper>
  )
}
