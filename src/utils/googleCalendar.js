// Use window.gapi directly (loaded from CDN in index.html)
// This is simpler and more reliable than the npm package
const getGapi = () => {
  if (typeof window !== 'undefined' && window.gapi) {
    return window.gapi
  }
  return null
}

const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

let isInitialized = false
let isSignedInStatus = false

/**
 * Initialize Google Calendar API
 */
export async function initGoogleCalendar(clientId) {
  console.log('=== INIT GOOGLE CALENDAR ===')
  console.log('Client ID:', clientId)
  console.log('Client ID exists:', !!clientId)
  console.log('isInitialized flag:', isInitialized)
  
  if (isInitialized) {
    console.log('Already initialized (by flag), checking auth instance...')
    const gapi = getGapi()
    if (gapi && gapi.auth2) {
      try {
        const authInstance = gapi.auth2.getAuthInstance()
        if (authInstance) {
          console.log('Auth instance exists, using existing instance')
          isSignedInStatus = authInstance.isSignedIn.get()
          return true
        }
      } catch (e) {
        console.log('Could not get auth instance, will reinitialize:', e.message)
      }
    }
  }

  try {
    // Load gapi if not already loaded
    await new Promise((resolve, reject) => {
      if (!window.gapi) {
        console.log('Loading gapi script from CDN...')
        const script = document.createElement('script')
        script.src = 'https://apis.google.com/js/api.js'
        script.onload = () => {
          console.log('gapi script loaded')
          window.gapi.load('client:auth2', {
            callback: resolve,
            onerror: reject,
            timeout: 5000,
            ontimeout: () => reject(new Error('gapi load timeout'))
          })
        }
        script.onerror = reject
        document.head.appendChild(script)
      } else {
        console.log('gapi already loaded, loading client:auth2...')
        window.gapi.load('client:auth2', {
          callback: resolve,
          onerror: reject,
          timeout: 5000,
          ontimeout: () => reject(new Error('gapi load timeout'))
        })
      }
    })

    console.log('gapi client:auth2 loaded successfully')
    
    const gapi = getGapi()
    if (!gapi) {
      throw new Error('gapi not available after load')
    }
    
    // Check if auth2 is already initialized
    console.log('Checking if gapi.auth2 is already initialized...')
    console.log('gapi.auth2 exists:', !!gapi.auth2)
    
    let authInstance = null
    try {
      authInstance = gapi.auth2.getAuthInstance()
      console.log('gapi.auth2 already initialized, using existing instance')
      console.log('Auth instance:', authInstance)
      
      // Just set up listeners and update status
      authInstance.isSignedIn.listen((signedIn) => {
        console.log('Auth status changed:', signedIn)
        isSignedInStatus = signedIn
      })
      
      isInitialized = true
      isSignedInStatus = authInstance.isSignedIn.get()
      console.log('Initial sign-in status:', isSignedInStatus)
      console.log('=== INIT COMPLETE (using existing) ===')
      return true
    } catch (e) {
      console.log('Auth instance not available, need to initialize:', e.message)
      // Continue to initialization
    }
    
    console.log('Initializing gapi client...')
    
    // Initialize with popup mode to avoid iframe/cookie issues
    await gapi.client.init({
      clientId: clientId,
      discoveryDocs: DISCOVERY_DOCS, // Still needed for Calendar API
      scope: SCOPES,
      ux_mode: 'popup' // Use popup instead of iframe to avoid cookie issues
    })
    
    console.log('gapi client initialized successfully')
    
    // Get auth instance after initialization
    authInstance = gapi.auth2.getAuthInstance()
    console.log('Auth instance:', authInstance)
    
    authInstance.isSignedIn.listen((signedIn) => {
      console.log('Auth status changed:', signedIn)
      isSignedInStatus = signedIn
    })
    
    isInitialized = true
    isSignedInStatus = authInstance.isSignedIn.get()
    console.log('Initial sign-in status:', isSignedInStatus)
    console.log('=== INIT COMPLETE ===')
    return true
    
  } catch (error) {
    console.error('=== INIT ERROR ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Error details:', error?.details)
    console.error('Error error:', error?.error)
    console.error('Full error:', error)
    
    // If error is about already initialized, try to use existing instance
    if (error.message && error.message.includes('already been initialized')) {
      console.log('Attempting to use existing auth instance...')
      try {
        const gapi = getGapi()
        if (gapi && gapi.auth2) {
          const authInstance = gapi.auth2.getAuthInstance()
          if (authInstance) {
            console.log('Successfully using existing auth instance')
            isInitialized = true
            isSignedInStatus = authInstance.isSignedIn.get()
            return true
          }
        }
      } catch (e) {
        console.error('Failed to use existing instance:', e)
      }
    }
    
    throw error
  }
}

/**
 * Sign in to Google
 */
export async function signInToGoogle() {
  console.log('=== SIGN IN TO GOOGLE ===')
  const gapi = getGapi()
  console.log('gapi available:', !!gapi)
  console.log('isInitialized:', isInitialized)
  
  try {
    if (!gapi) {
      throw new Error('Google API (gapi) not loaded')
    }
    
    const authInstance = gapi.auth2.getAuthInstance()
    console.log('Auth instance exists:', !!authInstance)
    
    if (!authInstance) {
      throw new Error('Auth instance not initialized. Call initGoogleCalendar first.')
    }
    
    console.log('Calling signIn with popup mode...')
    // Use popup mode to avoid iframe/cookie issues
    // If popup is blocked, this will throw an error
    const result = await authInstance.signIn({
      ux_mode: 'popup'
    })
    console.log('Sign in result:', result)
    console.log('Sign in success:', !!result)
    
    isSignedInStatus = authInstance.isSignedIn.get()
    console.log('Current sign-in status:', isSignedInStatus)
    console.log('=== SIGN IN COMPLETE ===')
    return true
  } catch (error) {
    console.error('=== SIGN IN ERROR ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Error error:', error?.error)
    console.error('Error details:', error?.details)
    console.error('Full error:', error)
    
    // If popup was blocked, provide helpful error message
    if (error?.error === 'popup_closed_by_user' || error?.message?.includes('popup')) {
      throw new Error('Popup was blocked. Please allow popups for this site and try again.')
    }
    
    throw error
  }
}

/**
 * Sign out from Google
 */
export async function signOutFromGoogle() {
  console.log('=== SIGN OUT FROM GOOGLE ===')
  const gapi = getGapi()
  try {
    if (!gapi) {
      throw new Error('Google API (gapi) not loaded')
    }
    
    const authInstance = gapi.auth2.getAuthInstance()
    if (!authInstance) {
      throw new Error('Auth instance not initialized')
    }
    
    await authInstance.signOut()
    isSignedInStatus = false
    console.log('Signed out successfully')
    return true
  } catch (error) {
    console.error('=== SIGN OUT ERROR ===')
    console.error('Error:', error)
    throw error
  }
}

/**
 * Check if user is signed in
 */
export function isSignedIn() {
  console.log('=== CHECK SIGNED IN ===')
  console.log('isInitialized:', isInitialized)
  const gapi = getGapi()
  console.log('gapi available:', !!gapi)
  
  if (!isInitialized) {
    console.log('Not initialized, returning false')
    return false
  }
  
  if (!gapi) {
    console.log('gapi not available, returning false')
    return false
  }
  
  try {
    const authInstance = gapi.auth2.getAuthInstance()
    const signedIn = authInstance?.isSignedIn?.get() || false
    console.log('Signed in status:', signedIn)
    return signedIn
  } catch (error) {
    console.error('Error checking sign-in status:', error)
    return false
  }
}

/**
 * Get current user's email
 */
export function getCurrentUserEmail() {
  const gapi = getGapi()
  try {
    if (!gapi) return null
    const authInstance = gapi.auth2.getAuthInstance()
    const user = authInstance.currentUser.get()
    const profile = user.getBasicProfile()
    return profile.getEmail()
  } catch (error) {
    console.error('Error getting user email:', error)
    return null
  }
}

/**
 * Fetch calendar events from Google Calendar
 * @param {Date} timeMin - Start time
 * @param {Date} timeMax - End time
 */
export async function fetchCalendarEvents(timeMin, timeMax) {
  const gapi = getGapi()
  try {
    if (!gapi) {
      throw new Error('Google API (gapi) not loaded')
    }
    const response = await gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 250,
      orderBy: 'startTime'
    })

    return response.result.items || []
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    throw error
  }
}

/**
 * Parse event data to extract lesson information
 */
export function getEventDetails(event) {
  return {
    id: event.id,
    title: event.summary || 'Untitled Event',
    description: event.description || '',
    startTime: event.start?.dateTime || event.start?.date,
    endTime: event.end?.dateTime || event.end?.date,
    location: event.location || '',
    attendees: event.attendees || [],
    organizer: event.organizer?.email || '',
    htmlLink: event.htmlLink || '',
    status: event.status,
    created: event.created,
    updated: event.updated
  }
}

/**
 * Check if event appears to be a tennis lesson
 */
export function isLessonEvent(event) {
  const title = (event.summary || '').toLowerCase()
  const location = (event.location || '').toLowerCase()
  const description = (event.description || '').toLowerCase()
  
  // Keywords that indicate a lesson
  const lessonKeywords = [
    'lesson',
    'tennis',
    'coaching',
    'session',
    'cal.com',
    'calcom'
  ]
  
  const combinedText = `${title} ${location} ${description}`
  return lessonKeywords.some(keyword => combinedText.includes(keyword))
}

