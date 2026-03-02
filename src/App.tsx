import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { ActionCenter } from './pages/ActionCenter'
import { Pipeline } from './pages/Pipeline'
import { People } from './pages/People'
import { PersonDetail } from './pages/PersonDetail'
import { Trainings } from './pages/Trainings'
import { Courses } from './pages/Courses'
import { CourseDetail } from './pages/CourseDetail'
import { Settings } from './pages/Settings'
import { Accommodation } from './pages/Accommodation'
import { Questions } from './pages/Questions'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: true,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Participant-facing routes (no auth required) */}
            <Route path="portal/accommodation" element={<Accommodation />} />

            {/* Protected admin routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/action-center" replace />} />
              <Route path="action-center" element={<ActionCenter />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="people" element={<People />} />
              <Route path="people/:id" element={<PersonDetail />} />
              <Route path="trainings" element={<Trainings />} />
              <Route path="courses" element={<Courses />} />
              <Route path="courses/:id" element={<CourseDetail />} />
              <Route path="questions" element={<Questions />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
