import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FilterProvider } from './context/FilterContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import PlantRanking from './pages/PlantRanking'
import LaggingIndicators from './pages/LaggingIndicators'
import LeadingIndicators from './pages/LeadingIndicators'
import Trainings from './pages/Trainings'
import Compliance from './pages/Compliance'
import DataEntry from './pages/DataEntry'
import Reports from './pages/Reports'
import Login from './pages/Login'

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth()
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <AuthProvider>
      <FilterProvider>
        <Routes>
        {/* Dedicated Full Screen Login Page */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ranking"
          element={
            <ProtectedRoute>
              <PlantRanking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lagging"
          element={
            <ProtectedRoute>
              <LaggingIndicators />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leading"
          element={
            <ProtectedRoute>
              <LeadingIndicators />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trainings"
          element={
            <ProtectedRoute>
              <Trainings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compliance"
          element={
            <ProtectedRoute>
              <Compliance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-entry"
          element={
            <ProtectedRoute>
              <DataEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </FilterProvider>
    </AuthProvider>
  )
}
