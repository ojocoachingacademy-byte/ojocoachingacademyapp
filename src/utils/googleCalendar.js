import { gapi } from 'gapi-script'

const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

let isInitialized = false
let isSignedInStatus = false

/**
 * Initialize Google Calendar API
 */
export async function initGoogleCalendar(clientId) {
  if (isInitialized) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    try {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            clientId: clientId,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
          })
          
          // Listen for auth changes
          gapi.auth2.getAuthInstance().isSignedIn.listen((signedIn) => {
            isSignedInStatus = signedIn
          })
          
          isInitialized = true
          isSignedInStatus = gapi.auth2.getAuthInstance().isSignedIn.get()
          resolve()
        } catch (error) {
          console.error('Error initializing gapi client:', error)
          reject(error)
        }
      })
    } catch (error) {
      console.error('Error loading gapi:', error)
      reject(error)
    }
  })
}

/**
 * Sign in to Google
 */
export async function signInToGoogle() {
  try {
    const authInstance = gapi.auth2.getAuthInstance()
    await authInstance.signIn()
    isSignedInStatus = authInstance.isSignedIn.get()
    return true
  } catch (error) {
    console.error('Error signing in:', error)
    throw error
  }
}

/**
 * Sign out from Google
 */
export async function signOutFromGoogle() {
  try {
    const authInstance = gapi.auth2.getAuthInstance()
    await authInstance.signOut()
    isSignedInStatus = false
    return true
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

/**
 * Check if user is signed in
 */
export function isSignedIn() {
  if (!isInitialized) return false
  try {
    const authInstance = gapi.auth2.getAuthInstance()
    return authInstance.isSignedIn.get()
  } catch (error) {
    return false
  }
}

/**
 * Get current user's email
 */
export function getCurrentUserEmail() {
  try {
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
  try {
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

