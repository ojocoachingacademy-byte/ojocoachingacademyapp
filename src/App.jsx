import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Header from './components/Layout/Header'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
import EmailConfirmed from './components/Auth/EmailConfirmed'
import ForgotPassword from './components/Auth/ForgotPassword'
import ResetPassword from './components/Auth/ResetPassword'
import StudentDashboard from './components/Dashboard/StudentDashboard'
import CoachDashboard from './components/Dashboard/CoachDashboard'
import MessageCenter from './components/Messaging/MessageCenter'
import NotificationList from './components/Notifications/NotificationList'
import HittingPartners from './components/HittingPartners/HittingPartners'
import LessonsPage from './components/Coach/LessonsPage'
import StudentsPage from './components/Coach/StudentsPage'
import StudentDetailPage from './components/Coach/StudentDetailPage'
import CalendarView from './components/Coach/CalendarView'
import StudentSettings from './components/Settings/StudentSettings'
import StudentLessonsPage from './components/Dashboard/StudentLessonsPage'
import FinancesOverview from './components/Finances/FinancesOverview'
import HistoricalFinances from './components/Finances/HistoricalFinances'
import ExpensesPage from './components/Finances/ExpensesPage'
import ReferralDashboard from './components/Referrals/ReferralDashboard'
import ReferralIntegrationTest from './components/Test/ReferralIntegrationTest'
import TestimonialsManagement from './components/Testimonials/TestimonialsManagement'
import TennisResources from './components/TennisResources/TennisResources'
import EmailsManagement from './components/Coach/EmailsManagement'
import CoachLayout from './components/Layout/CoachLayout'
import StudentPageWrapper from './components/Layout/StudentPageWrapper'
import LoadingSpinner from './components/shared/LoadingSpinner'
import { ToastContainer, useToast } from './components/shared/Toast'
import ErrorBoundary from './components/shared/ErrorBoundary'
import AppUpdateNotice from './components/shared/AppUpdateNotice'
import { trackEvent, EVENTS } from './utils/analytics'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      
      setSession(session)
      if (session) {
        fetchProfile(session.user.id, isMounted)
        // Track login event
        trackEvent(EVENTS.LOGIN)
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      
      // Prevent loops: if we're signing out, don't try to fetch profile
      if (_event === 'SIGNED_OUT') {
        setSession(null)
        setProfile(null)
        setLoading(false)
        return
      }
      
      setSession(session)
      if (session) {
        // Only fetch profile if we have a valid session
        // Add a small delay to prevent rapid-fire calls
        await new Promise(resolve => setTimeout(resolve, 100))
        if (isMounted && session) {
          fetchProfile(session.user.id, isMounted)
          // Track login event on auth state change
          if (_event === 'SIGNED_IN') {
            trackEvent(EVENTS.LOGIN)
          }
        }
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId, isMounted) => {
    try {
      // Check current session state before fetching
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      if (!isMounted) return
      
      // If no current session, don't try to fetch profile
      if (!currentSession) {
        setProfile(null)
        setLoading(false)
        return
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (!isMounted) return
      
      if (error) {
        console.error('Error fetching profile:', error)
        // If profile doesn't exist and user is logged in, they might have been deleted
        // Sign them out to prevent blank screen
        if (error.code === 'PGRST116' || error.message?.includes('not found')) {
          console.warn('Profile not found for logged-in user. Signing out...')
          await supabase.auth.signOut()
          setSession(null)
          setProfile(null)
          setLoading(false)
          // Force navigation to login
          window.location.href = '/login'
          return
        }
        setProfile(null)
        setLoading(false)
        return
      }
      
      // If no profile exists but user is logged in, sign them out
      // This prevents the blank loading screen issue when profile is deleted but auth user isn't
      if (!data && currentSession) {
        console.warn('No profile found for logged-in user. Signing out to prevent blank screen...')
        await supabase.auth.signOut()
        setSession(null)
        setProfile(null)
        setLoading(false)
        // Force navigation to login to break any loops
        window.location.href = '/login'
        return
      }
      
      setProfile(data || null)
      setLoading(false)
    } catch (error) {
      if (!isMounted) return
      console.error('Error fetching profile:', error)
      
      // Check if user still has a session
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      // Sign out if profile fetch fails and user is logged in
      if (currentSession) {
        console.warn('Profile fetch failed for logged-in user. Signing out...')
        await supabase.auth.signOut()
        setSession(null)
        setProfile(null)
        setLoading(false)
        // Force navigation to login to break any loops
        window.location.href = '/login'
        return
      }
      
      setProfile(null)
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner size="large" message="Loading..." />
  }

  // Check if user is a coach based on profile account_type
  const isCoach = profile?.account_type === 'coach'

  return (
    <Router>
      <ErrorBoundary>
        <AppUpdateNotice />
        {session && <Header user={session.user} isCoach={isCoach} />}
        <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to={isCoach ? "/coach" : "/dashboard"} />} />
        <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/dashboard" />} />
        <Route path="/forgot-password" element={!session ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
        <Route path="/reset-password" element={!session ? <ResetPassword /> : <Navigate to="/dashboard" />} />
        <Route path="/auth/confirmed" element={<EmailConfirmed />} />
            <Route 
              path="/dashboard" 
              element={session && !isCoach ? <StudentPageWrapper><StudentDashboard /></StudentPageWrapper> : <Navigate to="/login" />} 
            />
            <Route 
              path="/lessons" 
              element={session && !isCoach ? <StudentPageWrapper><StudentLessonsPage /></StudentPageWrapper> : <Navigate to="/login" />} 
            />
            <Route 
              path="/coach" 
              element={session && isCoach ? <CoachDashboard /> : <Navigate to="/login" />} 
            />
        <Route 
          path="/coach/lessons" 
          element={session && isCoach ? <LessonsPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/calendar" 
          element={session && isCoach ? <CalendarView /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/students" 
          element={session && isCoach ? <StudentsPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/students/:id" 
          element={session && isCoach ? <StudentDetailPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/finances" 
          element={session && isCoach ? <CoachLayout><FinancesOverview /></CoachLayout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/finances/historical" 
          element={session && isCoach ? <CoachLayout><HistoricalFinances /></CoachLayout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/expenses" 
          element={session && isCoach ? <CoachLayout><ExpensesPage /></CoachLayout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/referrals" 
          element={session && isCoach ? <CoachLayout><ReferralDashboard /></CoachLayout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/test/referral-integration" 
          element={session ? <ReferralIntegrationTest /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/testimonials" 
          element={session && isCoach ? <CoachLayout><TestimonialsManagement /></CoachLayout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/emails" 
          element={session && isCoach ? <EmailsManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/hitting-partners" 
          element={session ? (!isCoach ? <StudentPageWrapper><HittingPartners /></StudentPageWrapper> : <HittingPartners />) : <Navigate to="/login" />} 
        />
        <Route 
          path="/tennis-resources" 
          element={session ? (!isCoach ? <StudentPageWrapper><TennisResources /></StudentPageWrapper> : <TennisResources />) : <Navigate to="/login" />} 
        />
        <Route 
          path="/messages" 
          element={session ? (!isCoach ? <StudentPageWrapper><MessageCenter /></StudentPageWrapper> : <MessageCenter />) : <Navigate to="/login" />} 
        />
        <Route 
          path="/notifications" 
          element={session ? (!isCoach ? <StudentPageWrapper><NotificationList /></StudentPageWrapper> : <NotificationList />) : <Navigate to="/login" />} 
        />
        <Route 
          path="/settings" 
          element={session && !isCoach ? <StudentPageWrapper><StudentSettings /></StudentPageWrapper> : <Navigate to="/login" />} 
        />
            <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  )
}

export default App
