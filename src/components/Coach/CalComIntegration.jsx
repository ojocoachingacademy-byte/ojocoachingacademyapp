import { useEffect, useRef } from 'react'

/**
 * Cal.com Booking Widget Integration
 * 
 * To use this component:
 * 1. Sign up for Cal.com (https://cal.com)
 * 2. Create a booking link
 * 3. Get your embed code or use the Cal.com API
 * 4. Replace CALCOM_USERNAME with your Cal.com username
 * 
 * Option 1: Embed Widget (Simplest)
 * Option 2: API Integration (More control)
 */

export default function CalComIntegration({ studentId, studentName }) {
  const calRef = useRef(null)

  useEffect(() => {
    // Option 1: Cal.com Embed Widget
    // Replace 'your-username' with your actual Cal.com username
    const calUsername = 'your-username' // TODO: Move to environment variable
    
    // Load Cal.com embed script
    const script = document.createElement('script')
    script.src = 'https://app.cal.com/embed/embed.js'
    script.async = true
    script.onload = () => {
      // Initialize Cal.com embed
      if (window.Cal) {
        window.Cal('inline', {
          calLink: calUsername,
          layout: 'month_view',
          style: {
            width: '100%',
            height: '100%',
            overflow: 'auto'
          }
        })
      }
    }
    document.body.appendChild(script)

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  // Option 2: Direct iframe embed (alternative approach)
  // Uncomment this if you prefer iframe approach
  /*
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <iframe
        src={`https://cal.com/${calUsername}`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Book a lesson"
      />
    </div>
  )
  */

  return (
    <div className="calcom-container">
      <div className="calcom-header">
        <h2>Book a Lesson</h2>
        <p>Select a time that works for you</p>
      </div>
      <div 
        ref={calRef}
        className="calcom-embed"
        data-cal-namespace="cal"
        data-cal-link={process.env.VITE_CALCOM_USERNAME || 'your-username'}
        data-cal-config='{"layout":"month_view"}'
      />
    </div>
  )
}

/**
 * Alternative: Cal.com API Integration
 * This allows you to create bookings programmatically
 */
export async function createCalComBooking(bookingData) {
  // Cal.com API endpoint
  const CALCOM_API_URL = process.env.VITE_CALCOM_API_URL || 'https://api.cal.com/v1'
  const CALCOM_API_KEY = process.env.VITE_CALCOM_API_KEY // Set in .env

  try {
    const response = await fetch(`${CALCOM_API_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CALCOM_API_KEY}`
      },
      body: JSON.stringify({
        eventTypeId: bookingData.eventTypeId,
        start: bookingData.startTime, // ISO 8601 format
        end: bookingData.endTime, // ISO 8601 format
        responses: {
          name: bookingData.studentName,
          email: bookingData.studentEmail,
          notes: bookingData.notes || ''
        },
        timeZone: bookingData.timeZone || 'America/Los_Angeles',
        language: 'en'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to create booking')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error creating Cal.com booking:', error)
    throw error
  }
}

/**
 * Sync Cal.com bookings with local lessons
 * Call this after a booking is created in Cal.com
 */
export async function syncCalComBookingToLesson(calComBooking, studentId) {
  const { supabase } = await import('../../supabaseClient')

  try {
    const { data, error } = await supabase
      .from('lessons')
      .insert({
        student_id: studentId,
        lesson_date: calComBooking.startTime,
        location: calComBooking.location || 'TBD',
        status: 'scheduled',
        // Store Cal.com booking ID for reference
        metadata: {
          calcom_booking_id: calComBooking.id,
          calcom_event_type: calComBooking.eventTypeId
        }
      })
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error syncing Cal.com booking to lesson:', error)
    throw error
  }
}

