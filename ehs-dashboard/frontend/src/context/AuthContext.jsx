import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export const DEFAULT_USERS = [
  { username: 'superadmin', label: 'Super Admin (Full System Control)', role: 'SUPER_ADMIN', name: 'Super Administrator' },
  { username: 'admin', label: 'Cluster Admin (All Plants R&W)', role: 'ADMIN', name: 'Cluster EHS Admin' },
  { username: 'manager', label: 'Manager (Read-Only Access - All Plants & Plots)', role: 'MANAGER', name: 'Executive Safety Manager' },
  { username: 'site_pinnapuram', label: 'Site Incharge (Pinnapuram Only R&W)', role: 'SITE_INCHARGE', name: 'Pinnapuram Site Incharge' },
  { username: 'site_ghani', label: 'Site Incharge (Ghani Only R&W)', role: 'SITE_INCHARGE', name: 'Ghani Site Incharge' },
]

export function AuthProvider({ children }) {
  // Strict Auth: initialize strictly from localStorage or null (NEVER auto-login to superadmin)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('ehs_user')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Error parsing saved user', e)
        localStorage.removeItem('ehs_user')
      }
    }
    return null
  })

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ehs_user', JSON.stringify(currentUser))
    } else {
      localStorage.removeItem('ehs_user')
    }
  }, [currentUser])

  // Permission helpers
  const role = currentUser?.role || 'NONE'
  const isSuperAdmin = role === 'SUPER_ADMIN'
  const isAdmin = role === 'ADMIN' || isSuperAdmin
  const isManager = role === 'MANAGER'
  const isSiteIncharge = role === 'SITE_INCHARGE'
  const isReadOnly = isManager || role === 'NONE'

  // Parse assigned plants for Site Incharge (e.g. "1,2" -> [1, 2])
  const assignedPlantIds = (currentUser?.assigned_plant_ids || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)

  const canAccessPlant = (plantId) => {
    if (isAdmin || isManager) return true
    if (isSiteIncharge) {
      if (!plantId || plantId === 'All') return true
      return assignedPlantIds.includes(Number(plantId))
    }
    return false
  }

  const canWrite = (plantId = null) => {
    if (isReadOnly) return false
    if (isAdmin) return true
    if (isSiteIncharge) {
      if (!plantId) return true // general write check
      return assignedPlantIds.includes(Number(plantId))
    }
    return false
  }

  const login = async (username, password) => {
    try {
      const res = await api.post('/auth/login', { username, password })
      setCurrentUser(res.data.user)
      if (res.data.access_token) {
        localStorage.setItem('ehs_token', res.data.access_token)
      }
      return { success: true, user: res.data.user }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.detail || 'Invalid username or password',
      }
    }
  }

  const register = async (userData) => {
    try {
      const res = await api.post('/auth/register', userData)
      setCurrentUser(res.data.user)
      if (res.data.access_token) {
        localStorage.setItem('ehs_token', res.data.access_token)
      }
      return { success: true, user: res.data.user }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.detail || 'Registration failed. Please check your inputs.',
      }
    }
  }

  const logout = () => {
    setCurrentUser(null)
    localStorage.removeItem('ehs_user')
    localStorage.removeItem('ehs_token')
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        isSuperAdmin,
        isAdmin,
        isManager,
        isSiteIncharge,
        isReadOnly,
        assignedPlantIds,
        canAccessPlant,
        canWrite,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
