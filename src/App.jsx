import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Header from './components/Layout/Header'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
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
import FinancialDashboard from './components/Payments/FinancialDashboard'
import ExpensesPage from './components/Expenses/ExpensesPage'
import ReferralDashboard from './components/Referrals/ReferralDashboard'
import ReferralIntegrationTest from './components/Test/ReferralIntegrationTest'
import TestimonialsManagement from './components/Testimonials/TestimonialsManagement'
import TennisResources from './components/TennisResources/TennisResources'
import LoadingSpinner from './components/shared/LoadingSpinner'
import { ToastContainer, useToast } from './components/shared/Toast'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    setProfile(data)
    setLoading(false)
  }

  if (loading) {
    return <LoadingSpinner size="large" message="Loading..." />
  }

  // For now, hardcode coach access - we'll make this better later
  const isCoach = session?.user?.email === 'tobiojo10@gmail.com'

  return (
    <Router>
      {session && <Header user={session.user} isCoach={isCoach} />}
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to={isCoach ? "/coach" : "/dashboard"} />} />
        <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/dashboard" />} />
            <Route 
              path="/dashboard" 
              element={session && !isCoach ? <StudentDashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/lessons" 
              element={session && !isCoach ? <StudentLessonsPage /> : <Navigate to="/login" />} 
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
          element={session && isCoach ? <FinancialDashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/expenses" 
          element={session && isCoach ? <ExpensesPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/referrals" 
          element={session && isCoach ? <ReferralDashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/test/referral-integration" 
          element={session ? <ReferralIntegrationTest /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/testimonials" 
          element={session && isCoach ? <TestimonialsManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/hitting-partners" 
          element={session ? <HittingPartners /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/tennis-resources" 
          element={session ? <TennisResources /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/messages" 
          element={session ? <MessageCenter /> : <Navigate to="/login" />} 
        />
            <Route 
              path="/notifications" 
              element={session ? <NotificationList /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/settings" 
              element={session && !isCoach ? <StudentSettings /> : <Navigate to="/login" />} 
            />
            <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  )
}

export default App
