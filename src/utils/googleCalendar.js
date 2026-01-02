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
  
  const gapi = getGapi()
  console.log('window.gapi available:', !!gapi)
  
  if (isInitialized) {
    console.log('Already initialized')
    return Promise.resolve()
  }

  if (!gapi) {
    const error = new Error('Google API (gapi) not loaded. Please ensure the script is loaded from https://apis.google.com/js/api.js')
    console.error('=== INIT ERROR ===')
    console.error('gapi not available')
    console.error('window.gapi:', window.gapi)
    console.error('Error:', error)
    throw error
  }

  return new Promise((resolve, reject) => {
    try {
      console.log('Loading gapi client:auth2...')
      
      gapi.load('client:auth2', {
        callback: async () => {
          try {
            console.log('gapi client:auth2 loaded successfully')
            console.log('Initializing gapi client...')
            
            await gapi.client.init({
              apiKey: null, // Not needed for OAuth
              clientId: clientId,
              discoveryDocs: DISCOVERY_DOCS,
              scope: SCOPES
            })
            
            console.log('gapi client initialized successfully')
            
            // Listen for auth changes
            const authInstance = gapi.auth2.getAuthInstance()
            console.log('Auth instance:', authInstance)
            
            authInstance.isSignedIn.listen((signedIn) => {
              console.log('Auth status changed:', signedIn)
              isSignedInStatus = signedIn
            })
            
            isInitialized = true
            isSignedInStatus = authInstance.isSignedIn.get()
            console.log('Initial sign-in status:', isSignedInStatus)
            console.log('=== INIT COMPLETE ===')
            resolve()
          } catch (error) {
            console.error('=== INIT ERROR (in callback) ===')
            console.error('Error type:', error?.constructor?.name)
            console.error('Error message:', error?.message)
            console.error('Error details:', error?.details)
            console.error('Error error:', error?.error)
            console.error('Full error:', error)
            reject(error)
          }
        },
        onerror: (error) => {
          console.error('=== INIT ERROR (load failed) ===')
          console.error('Error loading gapi:', error)
          reject(error)
        },
        timeout: 5000,
        ontimeout: () => {
          const error = new Error('gapi load timeout')
          console.error('=== INIT ERROR (timeout) ===')
          console.error('Timeout loading gapi')
          reject(error)
        }
      })
    } catch (error) {
      console.error('=== INIT ERROR (outer catch) ===')
      console.error('Error type:', error?.constructor?.name)
      console.error('Error message:', error?.message)
      console.error('Full error:', error)
      reject(error)
    }
  })
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
    
    console.log('Calling signIn...')
    const result = await authInstance.signIn()
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

