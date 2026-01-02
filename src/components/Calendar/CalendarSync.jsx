import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { 
  initGoogleCalendar, 
  signInToGoogle, 
  signOutFromGoogle, 
  isSignedIn, 
  fetchCalendarEvents,
  getEventDetails,
  isLessonEvent,
  getCurrentUserEmail
} from '../../utils/googleCalendar'
import { Calendar, RefreshCw, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react'
import './CalendarSync.css'

const LAST_SYNC_KEY = 'google_calendar_last_sync'
const SYNC_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export default function CalendarSync({ onSyncComplete }) {
  const [connected, setConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [error, setError] = useState(null)
  const [initializing, setInitializing] = useState(true)

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    initializeGoogleCalendar()
    checkLastSyncTime()
  }, [])

  const initializeGoogleCalendar = async () => {
    if (!clientId) {
      console.warn('Google Client ID not configured')
      setError('Google Calendar integration not configured. Please add VITE_GOOGLE_CLIENT_ID to environment variables.')
      setInitializing(false)
      return
    }

    try {
      await initGoogleCalendar(clientId)
      const signedIn = isSignedIn()
      setConnected(signedIn)
      setInitializing(false)

      // Auto-sync if connected and last sync was >1 hour ago
      if (signedIn) {
        const lastSyncTime = localStorage.getItem(LAST_SYNC_KEY)
        if (!lastSyncTime || Date.now() - parseInt(lastSyncTime) > SYNC_INTERVAL_MS) {
          // Small delay to let UI render
          setTimeout(() => {
            handleSync()
          }, 1000)
        }
      }
    } catch (err) {
      console.error('Error initializing Google Calendar:', err)
      setError('Failed to initialize Google Calendar: ' + err.message)
      setInitializing(false)
    }
  }

  const checkLastSyncTime = () => {
    const lastSyncTime = localStorage.getItem(LAST_SYNC_KEY)
    if (lastSyncTime) {
      setLastSync(new Date(parseInt(lastSyncTime)))
    }
  }

  const handleConnect = async () => {
    try {
      setError(null)
      await signInToGoogle()
      setConnected(true)
      // Auto-sync after connecting
      setTimeout(() => {
        handleSync()
      }, 500)
    } catch (err) {
      console.error('Error connecting to Google:', err)
      setError('Failed to connect to Google Calendar: ' + err.message)
    }
  }

  const handleDisconnect = async () => {
    try {
      setError(null)
      await signOutFromGoogle()
      setConnected(false)
      localStorage.removeItem(LAST_SYNC_KEY)
      setLastSync(null)
    } catch (err) {
      console.error('Error disconnecting from Google:', err)
      setError('Failed to disconnect: ' + err.message)
    }
  }

  const handleSync = async () => {
    if (!connected || syncing) return

    setSyncing(true)
    setError(null)

    try {
      // Fetch events from next 90 days
      const timeMin = new Date()
      const timeMax = new Date()
      timeMax.setDate(timeMax.getDate() + 90)

      const events = await fetchCalendarEvents(timeMin, timeMax)
      console.log(`Fetched ${events.length} events from Google Calendar`)

      // Filter for lesson events
      const lessonEvents = events.filter(isLessonEvent)
      console.log(`Found ${lessonEvents.length} lesson events`)

      // Get all students with their emails
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          profiles!inner(email, full_name)
        `)

      if (studentsError) throw studentsError

      const studentEmailMap = new Map()
      students.forEach(student => {
        if (student.profiles?.email) {
          studentEmailMap.set(student.profiles.email.toLowerCase(), student.id)
        }
      })

      // Process each lesson event
      let syncedCount = 0
      let skippedCount = 0
      let errorCount = 0

      for (const event of lessonEvents) {
        try {
          const eventDetails = getEventDetails(event)
          
          // Find student by attendee email
          let studentId = null
          if (event.attendees && event.attendees.length > 0) {
            for (const attendee of event.attendees) {
              if (attendee.email && studentEmailMap.has(attendee.email.toLowerCase())) {
                studentId = studentEmailMap.get(attendee.email.toLowerCase())
                break
              }
            }
          }

          // If no attendee match, try organizer email (sometimes Cal.com uses organizer)
          if (!studentId && event.organizer?.email) {
            if (studentEmailMap.has(event.organizer.email.toLowerCase())) {
              studentId = studentEmailMap.get(event.organizer.email.toLowerCase())
            }
          }

          if (!studentId) {
            console.log(`No student found for event: ${eventDetails.title}`)
            skippedCount++
            continue
          }

          // Check if lesson already exists (prevent duplicates)
          const lessonDate = new Date(eventDetails.startTime)
          const { data: existingLesson } = await supabase
            .from('lessons')
            .select('id')
            .eq('student_id', studentId)
            .eq('lesson_date', lessonDate.toISOString())
            .maybeSingle()

          if (existingLesson) {
            console.log(`Lesson already exists for ${eventDetails.title}`)
            skippedCount++
            continue
          }

          // Create lesson record
          const { error: insertError } = await supabase
            .from('lessons')
            .insert([{
              student_id: studentId,
              lesson_date: lessonDate.toISOString(),
              location: eventDetails.location || 'Colina Del Sol Park',
              status: 'scheduled',
              metadata: JSON.stringify({
                source: 'google_calendar',
                google_calendar_id: eventDetails.id,
                google_calendar_link: eventDetails.htmlLink,
                synced_at: new Date().toISOString()
              })
            }])

          if (insertError) {
            console.error('Error creating lesson:', insertError)
            errorCount++
          } else {
            syncedCount++
            console.log(`Created lesson: ${eventDetails.title} for student ${studentId}`)
          }

        } catch (eventError) {
          console.error('Error processing event:', eventError)
          errorCount++
        }
      }

      // Update last sync time
      const syncTime = Date.now()
      localStorage.setItem(LAST_SYNC_KEY, syncTime.toString())
      setLastSync(new Date(syncTime))

      // Callback to refresh lessons
      if (onSyncComplete) {
        onSyncComplete()
      }

      if (errorCount > 0) {
        setError(`Sync completed with ${errorCount} errors. Synced: ${syncedCount}, Skipped: ${skippedCount}`)
      } else if (syncedCount === 0 && skippedCount === 0) {
        setError('No lesson events found in Google Calendar')
      }

      console.log(`Sync complete: ${syncedCount} synced, ${skippedCount} skipped, ${errorCount} errors`)

    } catch (err) {
      console.error('Error syncing calendar:', err)
      
      // Handle rate limit errors
      if (err.status === 403 || err.message?.includes('rate limit')) {
        setError('Google Calendar API rate limit reached. Please try again in a few minutes.')
      } else {
        setError('Failed to sync calendar: ' + (err.message || 'Unknown error'))
      }
    } finally {
      setSyncing(false)
    }
  }

  const formatLastSync = () => {
    if (!lastSync) return 'Never'
    const now = new Date()
    const diffMs = now - lastSync
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  if (initializing) {
    return (
      <div className="calendar-sync-container">
        <div className="calendar-sync-status">Initializing Google Calendar...</div>
      </div>
    )
  }

  if (!clientId) {
    return (
      <div className="calendar-sync-container">
        <div className="calendar-sync-error">
          <AlertCircle size={16} />
          Google Calendar integration not configured
        </div>
      </div>
    )
  }

  return (
    <div className="calendar-sync-container">
      <div className="calendar-sync-header">
        <div className="calendar-sync-title">
          <Calendar size={20} />
          <span>Google Calendar Sync</span>
        </div>
        {connected && (
          <div className="calendar-sync-status-connected">
            <CheckCircle size={16} />
            <span>Connected</span>
            {getCurrentUserEmail() && (
              <span className="calendar-sync-email">({getCurrentUserEmail()})</span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="calendar-sync-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="calendar-sync-actions">
        {!connected ? (
          <button 
            className="btn btn-primary"
            onClick={handleConnect}
            disabled={syncing}
          >
            <Calendar size={18} />
            Connect Google Calendar
          </button>
        ) : (
          <>
            <button 
              className="btn btn-secondary"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw size={18} className={syncing ? 'spinning' : ''} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button 
              className="btn btn-outline"
              onClick={handleDisconnect}
              disabled={syncing}
            >
              <XCircle size={18} />
              Disconnect
            </button>
          </>
        )}
      </div>

      {lastSync && (
        <div className="calendar-sync-info">
          Last synced: {formatLastSync()}
        </div>
      )}
    </div>
  )
}

