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
  const [userEmail, setUserEmail] = useState(null)

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    console.log('=== CALENDAR SYNC COMPONENT MOUNTED ===')
    console.log('VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID)
    console.log('Env variables:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')))
    console.log('window.gapi available:', !!window.gapi)
    
    initializeGoogleCalendar()
    checkLastSyncTime()
  }, [])

  const initializeGoogleCalendar = async () => {
    console.log('=== INITIALIZE GOOGLE CALENDAR ===')
    console.log('Client ID:', clientId)
    console.log('Client ID exists:', !!clientId)
    
    if (!clientId) {
      console.warn('Google Client ID not configured')
      setError('Google Calendar integration not configured. Please add VITE_GOOGLE_CLIENT_ID to environment variables.')
      setInitializing(false)
      return
    }

    try {
      console.log('Calling initGoogleCalendar...')
      await initGoogleCalendar(clientId)
      console.log('initGoogleCalendar completed')
      
      const signedIn = isSignedIn()
      console.log('Signed in status after init:', signedIn)
      setConnected(signedIn)
      setInitializing(false)
      
      // Get user email if signed in
      if (signedIn) {
        getCurrentUserEmail().then(email => {
          setUserEmail(email)
        }).catch(err => {
          console.error('Error getting user email:', err)
        })
      }

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
      console.error('=== INITIALIZATION ERROR ===')
      console.error('Error type:', err?.constructor?.name)
      console.error('Error message:', err?.message)
      console.error('Error error:', err?.error)
      console.error('Full error:', err)
      setError('Failed to initialize Google Calendar: ' + (err?.message || err?.error || 'Unknown error'))
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
      console.log('=== HANDLE CONNECT CLICKED ===')
      console.log('Client ID from env:', import.meta.env.VITE_GOOGLE_CLIENT_ID)
      console.log('Client ID state:', clientId)
      
      setError(null)
      
      // Ensure initialized first (initGoogleCalendar handles the "already initialized" case internally)
      if (clientId) {
        console.log('Initializing Google Calendar...')
        await initGoogleCalendar(clientId)
      }
      
      console.log('Calling signInToGoogle...')
      const success = await signInToGoogle()
      console.log('Sign in success:', success)
      
      if (success) {
        setConnected(true)
        // Get user email
        getCurrentUserEmail().then(email => {
          setUserEmail(email)
        }).catch(err => {
          console.error('Error getting user email:', err)
        })
        // Auto-sync after connecting (give token a moment to propagate)
        setTimeout(() => {
          handleSync()
        }, 1000)
      }
    } catch (err) {
      console.error('=== CONNECTION ERROR ===')
      console.error('Error type:', err?.constructor?.name)
      console.error('Error message:', err?.message)
      console.error('Error error:', err?.error)
      console.error('Error details:', err?.details)
      console.error('Full error:', err)
      const errorMessage = err?.message || err?.error || err?.details || 'Unknown error'
      setError(`Failed to connect to Google Calendar: ${errorMessage}. Check console for details.`)
      alert(`Failed to connect: ${errorMessage}. Check console for details.`)
    }
  }

  const handleDisconnect = async () => {
    try {
      setError(null)
      await signOutFromGoogle()
      setConnected(false)
      setUserEmail(null)
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

      // Get all students with their emails (optional - for matching if student exists)
      const { data: students } = await supabase
        .from('students')
        .select(`
          id,
          profiles!inner(email, full_name)
        `)

      const studentEmailMap = new Map()
      if (students) {
        students.forEach(student => {
          if (student.profiles?.email) {
            studentEmailMap.set(student.profiles.email.toLowerCase(), student.id)
          }
        })
      }

      // Process each lesson event
      let syncedCount = 0
      let skippedCount = 0
      let errorCount = 0

      for (const event of lessonEvents) {
        try {
          const eventDetails = getEventDetails(event)
          
          // Try to find student by attendee email (optional - events can exist without students)
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

          // Extract student name from event for display purposes
          let studentName = null
          if (event.attendees && event.attendees.length > 0) {
            const studentAttendee = event.attendees.find(a => a.email && a.email !== event.organizer?.email)
            studentName = studentAttendee?.displayName || studentAttendee?.email || event.organizer?.displayName || event.organizer?.email || 'Unknown'
          } else if (event.organizer) {
            studentName = event.organizer.displayName || event.organizer.email || 'Unknown'
          } else {
            studentName = eventDetails.title || 'Unknown'
          }

          // Check if lesson already exists (prevent duplicates)
          // Use google_calendar_id from metadata to check for duplicates instead of student_id + date
          const lessonDate = new Date(eventDetails.startTime)
          let existingLesson = null
          
          // For lessons with google_calendar_id, check by that ID
          const { data: existingLessons } = await supabase
            .from('lessons')
            .select('id, metadata')
            .eq('lesson_date', lessonDate.toISOString())
            .limit(10) // Get a few to check metadata
          
          if (existingLessons) {
            // Check if any existing lesson has the same google_calendar_id in metadata
            existingLesson = existingLessons.find(lesson => {
              try {
                const metadata = typeof lesson.metadata === 'string' 
                  ? JSON.parse(lesson.metadata) 
                  : lesson.metadata
                return metadata?.google_calendar_id === eventDetails.id
              } catch {
                return false
              }
            })
          }

          if (existingLesson) {
            console.log(`Lesson already exists for ${eventDetails.title}`)
            skippedCount++
            continue
          }

          // Create lesson record
          // Note: If student_id is required (NOT NULL) in the database schema,
          // lessons without matching students will fail to insert
          const insertData = {
            lesson_date: lessonDate.toISOString(),
            location: eventDetails.location || 'Colina Del Sol Park',
            status: 'scheduled',
            metadata: JSON.stringify({
              source: 'google_calendar',
              google_calendar_id: eventDetails.id,
              google_calendar_link: eventDetails.htmlLink,
              synced_at: new Date().toISOString(),
              student_name: studentName,
              student_email: event.attendees?.[0]?.email || event.organizer?.email || null
            })
          }
          
          // Only include student_id if it's not null
          // If schema requires student_id to be NOT NULL, this insert will fail for null values
          if (studentId !== null) {
            insertData.student_id = studentId
          }
          
          const { error: insertError } = await supabase
            .from('lessons')
            .insert([insertData])

          if (insertError) {
            console.error('Error creating lesson:', insertError)
            console.error('Error details:', {
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
              code: insertError.code,
              studentId: studentId,
              lessonDate: lessonDate.toISOString(),
              title: eventDetails.title
            })
            errorCount++
          } else {
            syncedCount++
            console.log(`Created lesson: ${eventDetails.title}${studentId ? ` for student ${studentId}` : ' (no student match)'}`)
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
            {userEmail && (
              <span className="calendar-sync-email">({userEmail})</span>
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

