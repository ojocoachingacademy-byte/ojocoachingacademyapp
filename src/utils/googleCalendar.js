// Use new Google Identity Services (GIS) instead of deprecated gapi.auth2
// Migration guide: https://developers.google.com/identity/gsi/web/guides/gis-migration

const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

let isInitialized = false
let accessToken = null
let tokenClient = null
let tokenCallback = null

// Export function to check initialization status
export function getInitializationStatus() {
  return { isInitialized, hasToken: !!accessToken }
}

/**
 * Wait for Google Identity Services to load
 */
const waitForGIS = () => {
  return new Promise((resolve, reject) => {
    // Check if already loaded (accounts.oauth2 or accounts.id)
    if (window.google?.accounts?.oauth2 || window.google?.accounts?.id) {
      console.log('Google Identity Services already loaded')
      resolve()
      return
    }
    
    console.log('Waiting for Google Identity Services to load...')
    let attempts = 0
    const maxAttempts = 100 // 10 seconds max wait
    
    const checkGIS = setInterval(() => {
      attempts++
      if (window.google?.accounts?.oauth2 || window.google?.accounts?.id) {
        clearInterval(checkGIS)
        console.log('Google Identity Services loaded after', attempts * 100, 'ms')
        resolve()
      } else if (attempts >= maxAttempts) {
        clearInterval(checkGIS)
        console.error('Google Identity Services failed to load after', maxAttempts * 100, 'ms')
        console.error('window.google:', window.google)
        console.error('window.google?.accounts:', window.google?.accounts)
        reject(new Error('Google Identity Services failed to load. Make sure the script is in index.html: <script src="https://accounts.google.com/gsi/client" async defer></script>'))
      }
    }, 100)
  })
}

/**
 * Wait for gapi to load
 */
const waitForGapi = () => {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      console.log('Google API already loaded')
      resolve()
      return
    }
    
    console.log('Waiting for Google API to load...')
    let attempts = 0
    const maxAttempts = 100 // 10 seconds max wait
    
    const checkGapi = setInterval(() => {
      attempts++
      if (window.gapi) {
        clearInterval(checkGapi)
        console.log('Google API loaded after', attempts * 100, 'ms')
        resolve()
      } else if (attempts >= maxAttempts) {
        clearInterval(checkGapi)
        console.error('Google API failed to load after', maxAttempts * 100, 'ms')
        console.error('window.gapi:', window.gapi)
        reject(new Error('Google API failed to load. Make sure the script is in index.html: <script src="https://apis.google.com/js/api.js"></script>'))
      }
    }, 100)
  })
}

/**
 * Initialize Google Calendar API with new Identity Services
 */
export async function initGoogleCalendar(clientId) {
  console.log('=== INIT GOOGLE CALENDAR (NEW GIS) ===')
  console.log('Client ID:', clientId)
  console.log('Client ID exists:', !!clientId)
  console.log('isInitialized flag:', isInitialized)
  
  if (isInitialized) {
    console.log('Already initialized')
    return true
  }

  try {
    // Wait for both GIS and gapi to load
    console.log('Waiting for scripts to load...')
    await Promise.all([
      waitForGIS(),
      waitForGapi()
    ])
    
    // Load gapi client (not auth2)
    console.log('Loading gapi client...')
    await new Promise((resolve, reject) => {
      window.gapi.load('client', {
        callback: resolve,
        onerror: reject,
        timeout: 5000,
        ontimeout: () => reject(new Error('gapi client load timeout'))
      })
    })
    
    // Initialize gapi client for Calendar API
    console.log('Initializing gapi client...')
    await window.gapi.client.init({
      discoveryDocs: DISCOVERY_DOCS
    })
    console.log('gapi client initialized')
    
    // Create token client for OAuth using Google Identity Services
    console.log('Creating token client...')
    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google Identity Services OAuth2 not available')
    }
    
    // Get current origin for redirect URI
    const redirectUri = window.location.origin + window.location.pathname
    
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response) => {
        console.log('=== TOKEN CALLBACK ===')
        console.log('Response:', response)
        
        // Clean up URL if we came from redirect
        if (window.location.search) {
          const url = new URL(window.location.href)
          url.searchParams.delete('code')
          url.searchParams.delete('scope')
          url.searchParams.delete('authuser')
          url.searchParams.delete('prompt')
          window.history.replaceState({}, document.title, url.pathname + url.hash)
        }
        
        if (response.error) {
          console.error('Token error:', response.error)
          accessToken = null
          if (tokenCallback) {
            tokenCallback(new Error(response.error))
            tokenCallback = null
          }
        } else {
          accessToken = response.access_token
          console.log('Access token received')
          // Set token for gapi requests
          window.gapi.client.setToken({ access_token: accessToken })
          if (tokenCallback) {
            tokenCallback(null, accessToken)
            tokenCallback = null
          }
        }
      },
      // Use redirect URI for better compatibility with COOP
      redirect_uri: redirectUri
    })
    console.log('Token client created with redirect_uri:', redirectUri)
    
    isInitialized = true
    console.log('=== INIT COMPLETE ===')
    return true
    
  } catch (error) {
    console.error('=== INIT ERROR ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Full error:', error)
    throw error
  }
}

/**
 * Sign in to Google using new Identity Services
 */
export async function signInToGoogle() {
  console.log('=== SIGN IN TO GOOGLE (NEW GIS) ===')
  console.log('isInitialized:', isInitialized)
  console.log('tokenClient exists:', !!tokenClient)
  
  try {
    if (!isInitialized || !tokenClient) {
      throw new Error('Google Calendar not initialized. Call initGoogleCalendar first.')
    }
    
    console.log('Requesting access token...')
    
    // Request access token (this will open popup/redirect)
    return new Promise((resolve, reject) => {
      // Set up callback
      tokenCallback = (error, token) => {
        if (error) {
          reject(error)
        } else {
          console.log('=== SIGN IN COMPLETE ===')
          resolve(true)
        }
      }
      
      // Request token (triggers popup/redirect)
      tokenClient.requestAccessToken({ prompt: 'consent' })
      
      // Also set up a timeout in case callback doesn't fire
      setTimeout(() => {
        if (tokenCallback) {
          tokenCallback = null
          if (!accessToken) {
            reject(new Error('Sign in timeout - no token received. Please try again.'))
          }
        }
      }, 60000) // 60 second timeout
    })
    
  } catch (error) {
    console.error('=== SIGN IN ERROR ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Full error:', error)
    throw error
  }
}

/**
 * Sign out from Google
 */
export async function signOutFromGoogle() {
  console.log('=== SIGN OUT FROM GOOGLE ===')
  try {
    if (accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        console.log('Token revoked')
      })
    }
    accessToken = null
    tokenClient = null
    if (window.gapi?.client) {
      window.gapi.client.setToken(null)
    }
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
  console.log('accessToken exists:', !!accessToken)
  
  if (!isInitialized) {
    console.log('Not initialized, returning false')
    return false
  }
  
  const signedIn = !!accessToken
  console.log('Signed in status:', signedIn)
  return signedIn
}

/**
 * Get current user's email (requires additional API call with new GIS)
 */
export async function getCurrentUserEmail() {
  try {
    if (!accessToken) return null
    
    // Use tokeninfo endpoint to get user info
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/tokeninfo?access_token=${accessToken}`)
    const data = await response.json()
    return data.email || null
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
  const gapi = window.gapi
  try {
    if (!gapi || !accessToken) {
      throw new Error('Not authenticated or gapi not loaded')
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
