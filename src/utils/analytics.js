import { supabase } from '../supabaseClient'

/**
 * Track user events for engagement analytics
 */
export const trackEvent = async (eventType, eventData = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return
    
    await supabase
      .from('analytics_events')
      .insert({
        user_id: user.id,
        event_type: eventType,
        event_data: eventData
      })
  } catch (error) {
    console.error('Analytics tracking error:', error)
    // Don't throw - analytics failures shouldn't break the app
  }
}

/**
 * Common event types (for consistency)
 */
export const EVENTS = {
  // Session events
  LOGIN: 'login',
  LOGOUT: 'logout',
  
  // Onboarding events
  ONBOARDING_START: 'onboarding_start',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  DEVELOPMENT_PLAN_CREATED: 'development_plan_created',
  
  // Practice plan events
  PRACTICE_VIEW: 'practice_view',
  PRACTICE_COMPLETE: 'practice_complete',
  
  // Lesson events
  VIEW_LESSON_PLAN: 'view_lesson_plan',
  VIEW_LESSON_FEEDBACK: 'view_lesson_feedback',
  SUBMIT_FEEDBACK: 'submit_feedback',
  
  // Progress events
  VIEW_PROGRESS: 'view_progress',
  VIEW_DEVELOPMENT_PLAN: 'view_development_plan',
  VIEW_PROGRESS_LADDER: 'view_progress_ladder',
  
  // Navigation events
  TAB_CHANGE: 'tab_change'
}


