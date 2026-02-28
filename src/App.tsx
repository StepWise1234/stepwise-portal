import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ActionCenter } from './pages/ActionCenter'
import { Pipeline } from './pages/Pipeline'
import { People } from './pages/People'
import { PersonDetail } from './pages/PersonDetail'
import { Trainings } from './pages/Trainings'
import { Settings } from './pages/Settings'
import { Accommodation } from './pages/Accommodation'
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
      <BrowserRouter>
        <Routes>
          {/* Participant-facing routes (no layout) */}
          <Route path="portal/accommodation" element={<Accommodation />} />

          {/* Admin routes (with layout) */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/action-center" replace />} />
            <Route path="action-center" element={<ActionCenter />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="people" element={<People />} />
            <Route path="people/:id" element={<PersonDetail />} />
            <Route path="trainings" element={<Trainings />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
