import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Header from './components/Layout/Header'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
import StudentDashboard from './components/Dashboard/StudentDashboard'
import CoachDashboard from './components/Dashboard/CoachDashboard'
import HittingPartners from './components/HittingPartners/HittingPartners'
import LessonsPage from './components/Coach/LessonsPage'
import StudentsPage from './components/Coach/StudentsPage'
import StudentDetailPage from './components/Coach/StudentDetailPage'

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
    return <div>Loading...</div>
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
          path="/coach" 
          element={session && isCoach ? <CoachDashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/coach/lessons" 
          element={session && isCoach ? <LessonsPage /> : <Navigate to="/login" />} 
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
          path="/hitting-partners" 
          element={session ? <HittingPartners /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  )
}

export default App
