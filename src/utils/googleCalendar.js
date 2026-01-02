// Modern Google Identity Services Token Client implementation
// Uses the new Google Identity Services API instead of deprecated gapi.auth2

let tokenClient = null
let accessToken = null

/**
 * Initialize Google Calendar with modern Identity Services
 */
export const initGoogleCalendar = async (clientId) => {
  return new Promise((resolve) => {
    // Wait for Google Identity Services to load
    const checkGIS = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(checkGIS)
        
        // Initialize token client
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/calendar.readonly',
          callback: '' // We'll set this per request
        })
        
        console.log('Google Identity Services initialized')
        resolve(true)
      }
    }, 100)
    
    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkGIS)
      if (!tokenClient) {
        console.error('Google Identity Services failed to load')
        resolve(false)
      }
    }, 10000)
  })
}

/**
 * Sign in to Google (request access token)
 */
export const signInToGoogle = async () => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Token client not initialized. Call initGoogleCalendar first.'))
      return
    }
    
    tokenClient.callback = (response) => {
      if (response.error) {
        console.error('Token error:', response.error)
        reject(response)
      } else {
        accessToken = response.access_token
        console.log('Access token received')
        resolve(true)
      }
    }
    
    // Request access token - opens popup
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

/**
 * Check if user is signed in
 */
export const isSignedIn = () => {
  return !!accessToken
}

/**
 * Sign out from Google
 */
export const signOutFromGoogle = () => {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken, () => {
      console.log('Access token revoked')
    })
  }
  accessToken = null
  tokenClient = null
}

/**
 * Fetch calendar events from Google Calendar
 */
export const fetchCalendarEvents = async (timeMin, timeMax) => {
  if (!accessToken) {
    throw new Error('Not signed in')
  }
  
  const params = new URLSearchParams({
    timeMin: timeMin || new Date().toISOString(),
    timeMax: timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    showDeleted: false,
    singleEvents: true,
    maxResults: 250,
    orderBy: 'startTime'
  })
  
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  )
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || 'Failed to fetch calendar events')
  }
  
  const data = await response.json()
  return data.items || []
}

/**
 * Get event details in a standardized format
 */
export const getEventDetails = (event) => {
  return {
    id: event.id,
    title: event.summary || 'Untitled Event',
    description: event.description || '',
    startTime: event.start?.dateTime || event.start?.date,
    endTime: event.end?.dateTime || event.end?.date,
    location: event.location || '',
    attendees: event.attendees || [],
    organizer: event.organizer || null,
    htmlLink: event.htmlLink || '',
    status: event.status,
    created: event.created,
    updated: event.updated,
    source: 'google_calendar'
  }
}

/**
 * Check if event appears to be a lesson
 * Matches events that contain "lesson" anywhere in title, description, or location
 */
export function isLessonEvent(event) {
  const title = (event.summary || '').toLowerCase()
  const location = (event.location || '').toLowerCase()
  const description = (event.description || '').toLowerCase()
  
  // Primary filter: must contain "lesson" in title, description, or location
  const combinedText = `${title} ${location} ${description}`
  
  // Check if "lesson" appears anywhere
  if (combinedText.includes('lesson')) {
    return true
  }
  
  // Fallback: other keywords that might indicate a lesson (optional)
  const lessonKeywords = [
    'tennis',
    'coaching',
    'session',
    'cal.com',
    'calcom'
  ]
  
  return lessonKeywords.some(keyword => combinedText.includes(keyword))
}

/**
 * Get current user's email (requires a valid access token)
 */
export async function getCurrentUserEmail() {
  if (!accessToken) {
    return null
  }
  
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    const data = await response.json()
    return data.email || null
  } catch (error) {
    console.error('Error getting user email:', error)
    return null
  }
}
