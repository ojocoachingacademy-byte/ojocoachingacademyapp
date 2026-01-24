import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { TrendingUp, Award, Target, Calendar, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { calculateProgressSummary, compareProgressPeriods } from '../../utils/progressAnalytics'
import './ProgressReportCard.css'

export default function ProgressReportCard({ studentId, timeRange = 7 }) {
  const [summary, setSummary] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [selectedRange, setSelectedRange] = useState(timeRange)

  useEffect(() => {
    if (studentId) {
      fetchProgressData()
    }
  }, [studentId, selectedRange])

  const fetchProgressData = async () => {
    setLoading(true)
    try {
      // Fetch current period data
      const currentEndDate = new Date()
      const currentStartDate = new Date()
      currentStartDate.setDate(currentStartDate.getDate() - selectedRange)
      
      // Fetch previous period data for comparison
      const previousStartDate = new Date(currentStartDate)
      previousStartDate.setDate(previousStartDate.getDate() - selectedRange)

      // Fetch skill snapshots - these contain skill progress data
      const { data: currentSnapshots } = await supabase
        .from('skill_progress_snapshots')
        .select('*')
        .eq('student_id', studentId)
        .gte('created_at', currentStartDate.toISOString())
        .lte('created_at', currentEndDate.toISOString())
        .order('created_at', { ascending: true })

      const { data: previousSnapshots } = await supabase
        .from('skill_progress_snapshots')
        .select('*')
        .eq('student_id', studentId)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', currentStartDate.toISOString())
        .order('created_at', { ascending: true })

      // Also fetch skill assessments for more granular data
      const { data: currentAssessments } = await supabase
        .from('skill_assessments')
        .select('*')
        .eq('student_id', studentId)
        .gte('assessed_at', currentStartDate.toISOString())
        .lte('assessed_at', currentEndDate.toISOString())
        .order('assessed_at', { ascending: true })

      const { data: previousAssessments } = await supabase
        .from('skill_assessments')
        .select('*')
        .eq('student_id', studentId)
        .gte('assessed_at', previousStartDate.toISOString())
        .lt('assessed_at', currentStartDate.toISOString())
        .order('assessed_at', { ascending: true })

      // Fetch lessons
      const { data: currentLessons } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', studentId)
        .gte('lesson_date', currentStartDate.toISOString())
        .lte('lesson_date', currentEndDate.toISOString())

      const { data: previousLessons } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', studentId)
        .gte('lesson_date', previousStartDate.toISOString())
        .lt('lesson_date', currentStartDate.toISOString())

      // Fetch milestones
      const { data: currentMilestones } = await supabase
        .from('student_milestones')
        .select('*')
        .eq('student_id', studentId)
        .gte('achieved_at', currentStartDate.toISOString())
        .lte('achieved_at', currentEndDate.toISOString())

      const { data: previousMilestones } = await supabase
        .from('student_milestones')
        .select('*')
        .eq('student_id', studentId)
        .gte('achieved_at', previousStartDate.toISOString())
        .lt('achieved_at', currentStartDate.toISOString())

      // Fetch practice completions (from lessons with practice_plan_completed = true)
      const { data: currentPracticeLessons } = await supabase
        .from('lessons')
        .select('lesson_date, practice_plan_completed_at')
        .eq('student_id', studentId)
        .eq('practice_plan_completed', true)
        .gte('practice_plan_completed_at', currentStartDate.toISOString())
        .lte('practice_plan_completed_at', currentEndDate.toISOString())

      const { data: previousPracticeLessons } = await supabase
        .from('lessons')
        .select('lesson_date, practice_plan_completed_at')
        .eq('student_id', studentId)
        .eq('practice_plan_completed', true)
        .gte('practice_plan_completed_at', previousStartDate.toISOString())
        .lt('practice_plan_completed_at', currentStartDate.toISOString())

      // Combine snapshots and assessments for skill data
      // Both tables have skill_name and current_level/student_assessment fields
      const currentSkillData = [
        ...(currentSnapshots || []),
        ...(currentAssessments || [])
      ]

      const previousSkillData = [
        ...(previousSnapshots || []),
        ...(previousAssessments || [])
      ]

      // Format practice completions
      const currentPractice = (currentPracticeLessons || []).map(l => ({
        practice_plan_completed_at: l.practice_plan_completed_at,
        lesson_date: l.lesson_date
      }))

      const previousPractice = (previousPracticeLessons || []).map(l => ({
        practice_plan_completed_at: l.practice_plan_completed_at,
        lesson_date: l.lesson_date
      }))

      // Calculate summaries
      const currentData = {
        skillSnapshots: currentSkillData,
        lessons: currentLessons || [],
        milestones: currentMilestones || [],
        practiceCompletions: currentPractice
      }

      const previousData = {
        skillSnapshots: previousSkillData,
        lessons: previousLessons || [],
        milestones: previousMilestones || [],
        practiceCompletions: previousPractice
      }

      const currentSummary = calculateProgressSummary(selectedRange, currentData)
      const previousSummary = calculateProgressSummary(selectedRange, previousData)
      const periodComparison = compareProgressPeriods(currentSummary, previousSummary)

      setSummary(currentSummary)
      setComparison(periodComparison)
    } catch (error) {
      console.error('Error fetching progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="progress-report-card">
        <div className="progress-report-loading">Loading progress report...</div>
      </div>
    )
  }

  if (!summary) return null

  const rangeLabel = selectedRange === 7 ? 'This Week' : 'This Month'
  const previousLabel = selectedRange === 7 ? 'last week' : 'last month'

  return (
    <div className="progress-report-card">
      {/* Header */}
      <div className="progress-report-header">
        <div className="progress-report-title">
          <TrendingUp size={24} style={{ color: 'var(--color-secondary)' }} />
          <h3>{rangeLabel} Progress Report</h3>
        </div>
        <div className="progress-report-tabs">
          <button
            className={`tab-btn ${selectedRange === 7 ? 'active' : ''}`}
            onClick={() => setSelectedRange(7)}
          >
            Week
          </button>
          <button
            className={`tab-btn ${selectedRange === 30 ? 'active' : ''}`}
            onClick={() => setSelectedRange(30)}
          >
            Month
          </button>
        </div>
      </div>

      {/* Key Stats */}
      <div className="progress-stats-grid">
        <div className="progress-stat">
          <Calendar size={18} />
          <div>
            <div className="stat-label">Lessons</div>
            <div className="stat-value">{summary.lessonsCompleted}</div>
            {comparison && comparison.lessons.change !== 0 && (
              <div className={`stat-change ${comparison.lessons.change > 0 ? 'positive' : 'negative'}`}>
                {comparison.lessons.change > 0 ? '+' : ''}{comparison.lessons.change} vs {previousLabel}
              </div>
            )}
          </div>
        </div>

        <div className="progress-stat">
          <Award size={18} />
          <div>
            <div className="stat-label">Milestones</div>
            <div className="stat-value">{summary.milestonesAchieved}</div>
            {comparison && comparison.milestones.change !== 0 && (
              <div className={`stat-change ${comparison.milestones.change > 0 ? 'positive' : 'negative'}`}>
                {comparison.milestones.change > 0 ? '+' : ''}{comparison.milestones.change} vs {previousLabel}
              </div>
            )}
          </div>
        </div>

        <div className="progress-stat">
          <Zap size={18} />
          <div>
            <div className="stat-label">Practice Streak</div>
            <div className="stat-value">{summary.practiceStreak} days</div>
          </div>
        </div>
      </div>

      {/* Top Improvements */}
      {summary.topImprovements.length > 0 && (
        <div className="progress-section">
          <h4 className="section-title">
            <Target size={18} />
            Top Improvements
          </h4>
          <div className="improvements-list">
            {summary.topImprovements.map((improvement, idx) => (
              <div key={idx} className="improvement-item">
                <div className="improvement-header">
                  <span className="improvement-skill">{improvement.skill}</span>
                  <span className="improvement-badge">
                    +{improvement.change.toFixed(1)} ({improvement.percentChange}%)
                  </span>
                </div>
                <div className="improvement-bar">
                  <div 
                    className="improvement-progress"
                    style={{ 
                      width: `${(improvement.newLevel / 10) * 100}%`,
                      backgroundColor: 'var(--color-secondary)'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {summary.insights.length > 0 && (
        <div className="progress-section">
          <h4 className="section-title">Insights</h4>
          <div className="insights-list">
            {summary.insights.map((insight, idx) => (
              <div key={idx} className={`insight-item ${insight.type}`}>
                <span className="insight-icon">
                  {insight.type === 'success' ? '🎯' : '💡'}
                </span>
                <span>{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expand/Collapse Button */}
      <button
        className="expand-btn"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <>
            <ChevronUp size={16} />
            Show Less
          </>
        ) : (
          <>
            <ChevronDown size={16} />
            View Full Report
          </>
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="progress-expanded">
          <div className="expanded-stat">
            <strong>Total Practice Hours:</strong> {summary.totalPracticeHours.toFixed(1)}h
          </div>
          {comparison && (
            <div className="period-comparison">
              <h4>Comparison vs {previousLabel}</h4>
              <div className="comparison-grid">
                <div>Lessons: {comparison.lessons.percentChange > 0 ? '+' : ''}{comparison.lessons.percentChange}%</div>
                <div>Milestones: {comparison.milestones.percentChange > 0 ? '+' : ''}{comparison.milestones.percentChange}%</div>
                <div>Practice: {comparison.practice.percentChange > 0 ? '+' : ''}{comparison.practice.percentChange}%</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
